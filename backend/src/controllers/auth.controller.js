import { generateToken } from '../lib/utils.js';
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import cloudinary from '../lib/cloudinary.js';

// ================== SIGNUP ==================
export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  const normalizedEmail = (email || '').toLowerCase().trim();

  try {
    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Please enter all required fields.' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({
      email: new RegExp('^' + normalizedEmail + '$', 'i'),
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: 'User already exists with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
    });

    await newUser.save();
    generateToken(newUser._id, res);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });
  } catch (error) {
    console.log('Error in signup:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ================== LOGIN ==================
export const login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').toLowerCase().trim();

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({
      email: new RegExp('^' + normalizedEmail + '$', 'i'),
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log('Error in login:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ================== LOGOUT ==================
export const logout = (req, res) => {
  try {
    res.cookie('jwt', '', { maxAge: 0 });
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.log('Error in logout:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ================== UPDATE PROFILE ==================
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, fullName } = req.body;
    const userId = req.user._id;

    const updateData = {};

    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updateData.profilePic = uploadResponse.secure_url;
    }

    if (fullName && fullName.trim()) {
      updateData.fullName = fullName.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'Nothing to update.' });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select('-password');

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log('Error in updateProfile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ================== CHANGE PASSWORD ==================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.log('Error in changePassword:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ================== CHECK AUTH ==================
export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log('Error in checkAuth:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};
