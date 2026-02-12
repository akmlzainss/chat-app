import User from '../models/user.model.js';
import Message from '../models/message.model.js';
import { io } from '../lib/socket.js';
import { getReceiverSocketId } from '../lib/socket.js';

export const listFriends = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select('friends');
    const friends = await User.find({ _id: { $in: me.friends } }).select(
      '-password'
    );

    // Get last message for each friend
    const lastMessages = {};
    await Promise.all(
      me.friends.map(async friendId => {
        const msg = await Message.findOne({
          $or: [
            { senderId: req.user._id, receiverId: friendId },
            { senderId: friendId, receiverId: req.user._id },
          ],
        })
          .sort({ createdAt: -1 })
          .select('senderId text image createdAt')
          .lean();
        if (msg) lastMessages[friendId.toString()] = msg;
      })
    );

    res.status(200).json({ friends, lastMessages });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const discoverUsers = async (req, res) => {
  try {
    const { q = '', skip = 0, limit = 30 } = req.query;
    const me = await User.findById(req.user._id).select(
      'friends friendRequestsSent friendRequestsReceived'
    );

    const excludeIds = [req.user._id, ...me.friends];
    const queryString = String(q).trim();

    // No search query → return random 5 users
    if (!queryString) {
      const users = await User.aggregate([
        { $match: { _id: { $nin: excludeIds } } },
        { $sample: { size: Number(limit) || 5 } },
        { $project: { password: 0 } },
      ]);
      return res
        .status(200)
        .json({ users, hasMore: false, total: users.length });
    }

    // With search query → filtered paginated results
    const regex = new RegExp(queryString, 'i');
    const filter = {
      _id: { $nin: excludeIds },
      $or: [{ fullName: regex }, { email: regex }],
    };

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .skip(Number(skip))
      .limit(Number(limit));

    const hasMore = Number(skip) + Number(limit) < total;
    res.status(200).json({ users, hasMore, total });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const sendRequest = async (req, res) => {
  try {
    const toId = req.params.id;
    const fromId = req.user._id;
    if (toId === String(fromId))
      return res.status(400).json({ message: 'Cannot add yourself' });

    const [from, to] = await Promise.all([
      User.findById(fromId),
      User.findById(toId),
    ]);
    if (!to) return res.status(404).json({ message: 'User not found' });
    if (from.friends.includes(to._id))
      return res.status(400).json({ message: 'Already friends' });
    if (from.friendRequestsSent.includes(to._id))
      return res.status(400).json({ message: 'Already sent' });

    from.friendRequestsSent.push(to._id);
    to.friendRequestsReceived.push(from._id);
    await Promise.all([from.save(), to.save()]);

    const sock = getReceiverSocketId(to._id);
    if (sock)
      io.to(sock).emit('friend_request', {
        fromUser: {
          _id: from._id,
          fullName: from.fullName,
          profilePic: from.profilePic,
        },
      });

    res.status(200).json({ message: 'Request sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const acceptRequest = async (req, res) => {
  try {
    const otherId = req.params.id;
    const me = await User.findById(req.user._id);
    const other = await User.findById(otherId);
    if (!other) return res.status(404).json({ message: 'User not found' });

    me.friendRequestsReceived = me.friendRequestsReceived.filter(
      id => String(id) !== String(other._id)
    );
    other.friendRequestsSent = other.friendRequestsSent.filter(
      id => String(id) !== String(me._id)
    );
    if (!me.friends.includes(other._id)) me.friends.push(other._id);
    if (!other.friends.includes(me._id)) other.friends.push(me._id);
    await Promise.all([me.save(), other.save()]);

    const sock = getReceiverSocketId(other._id);
    if (sock)
      io.to(sock).emit('friend_accept', {
        user: { _id: me._id, fullName: me.fullName, profilePic: me.profilePic },
      });

    res.status(200).json({ message: 'Accepted' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const otherId = req.params.id;
    const me = await User.findById(req.user._id);
    const other = await User.findById(otherId);
    if (!other) return res.status(404).json({ message: 'User not found' });

    me.friendRequestsReceived = me.friendRequestsReceived.filter(
      id => String(id) !== String(other._id)
    );
    other.friendRequestsSent = other.friendRequestsSent.filter(
      id => String(id) !== String(me._id)
    );
    await Promise.all([me.save(), other.save()]);

    res.status(200).json({ message: 'Rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const otherId = req.params.id;
    const me = await User.findById(req.user._id);
    const other = await User.findById(otherId);
    if (!other) return res.status(404).json({ message: 'User not found' });

    me.friends = me.friends.filter(id => String(id) !== String(other._id));
    other.friends = other.friends.filter(id => String(id) !== String(me._id));
    await Promise.all([me.save(), other.save()]);

    res.status(200).json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};
