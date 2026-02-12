import User from '../models/user.model.js';
import Message from '../models/message.model.js';
import cloudinary from '../lib/cloudinary.js';
import { io } from '../lib/socket.js';
import { getReceiverSocketId } from '../lib/socket.js';

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select('-password');

    res.status(200).json({ filteredUsers });
  } catch (error) {
    console.error('Error in getUsersForSidebar:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: UserToChatId } = req.params;
    const myId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;

    const query = {
      $or: [
        { senderId: myId, receiverId: UserToChatId },
        { senderId: UserToChatId, receiverId: myId },
      ],
    };

    const total = await Message.countDocuments(query);
    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const hasMore = skip + messages.length < total;
    res.status(200).json({ messages, hasMore });
  } catch (error) {
    console.error('Error in getMessages:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image) {
      return res
        .status(400)
        .json({ message: 'Message must contain text or image' });
    }

    let imageurl;
    if (image) {
      try {
        const uploadedResponse = await cloudinary.uploader.upload(image, {
          resource_type: 'image',
        });
        imageurl = uploadedResponse.secure_url;
      } catch (err) {
        console.error('Cloudinary upload failed:', err.message);
        return res.status(400).json({ message: 'Image upload failed' });
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageurl,
      status: 'sent',
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', newMessage);
    }

    // Notify sender that the message was delivered
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('messageDelivered', {
        messageId: newMessage._id,
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log('Error in sendMessage:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (String(message.senderId) !== String(userId)) {
      return res
        .status(403)
        .json({ message: 'You can only delete your own messages' });
    }

    // Only allow delete within 15 minutes
    const fifteenMin = 15 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > fifteenMin) {
      return res
        .status(400)
        .json({ message: 'Can only unsend messages within 15 minutes' });
    }

    await Message.findByIdAndDelete(messageId);

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('messageDeleted', { messageId });
    }
    const senderSocketId = getReceiverSocketId(message.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('messageDeleted', { messageId });
    }

    res.status(200).json({ message: 'Message deleted' });
  } catch (error) {
    console.log('Error in deleteMessage:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};
