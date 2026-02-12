import { create } from 'zustand';
import { axiosInstance } from '../lib/axios.js';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useChatStore } from './useChatStore.js';

const BASE_URL =
  import.meta.env.MODE === 'development' ? 'http://localhost:5001' : '/';

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get('/auth/check');

      set({ authUser: res.data });

      // simpan user
      localStorage.setItem('chat-user', JSON.stringify(res.data));

      get().connectSocket();
    } catch (error) {
      console.log('Error in checkAuth:', error);
      set({ authUser: null });
      localStorage.removeItem('chat-user');
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async data => {
    try {
      set({ isSigningUp: true });

      const res = await axiosInstance.post('/auth/signup', data);

      set({ authUser: res.data });
      localStorage.setItem('chat-user', JSON.stringify(res.data));

      toast.success('Signup successful! 🎉');
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Signup failed');
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  // useAuthStore.js – bagian login yang aman
  login: async data => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post('/auth/login', data);

      const user = res.data.user || res.data;
      set({ authUser: user });

      // simpan user
      localStorage.setItem('chat-user', JSON.stringify(user));

      toast.success('Berhasil login!');
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login gagal');
      console.error('Login error:', error);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout');
      set({ authUser: null });
      toast.success('Logged out successfully');
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Logout failed');
    }
  },

  updateProfile: async data => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put('/auth/update-profile', data);

      set({ authUser: res.data });

      // simpan user baru (ADA profilePic)
      localStorage.setItem('chat-user', JSON.stringify(res.data));

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    try {
      const res = await axiosInstance.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success(res.data.message || 'Password changed successfully');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
      return false;
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: { userId: authUser._id },
      withCredentials: true,
    });
    socket.connect();

    set({ socket: socket });

    socket.on('getOnlineUsers', userIds => {
      set({ onlineUsers: userIds });
    });

    socket.on('friend_request', ({ fromUser }) => {
      const current = useChatStore.getState().friendRequestsReceived || [];
      const exists = current.some(u => String(u._id) === String(fromUser._id));
      if (!exists) {
        useChatStore.setState({
          friendRequestsReceived: [...current, fromUser],
        });
        toast.success(`${fromUser.fullName} sent you a friend request`);
      }
    });

    socket.on('friend_accept', ({ user }) => {
      const currentFriends = useChatStore.getState().friends || [];
      const exists = currentFriends.some(
        u => String(u._id) === String(user._id)
      );
      if (!exists) {
        useChatStore.setState({ friends: [...currentFriends, user] });
        toast.success(`${user.fullName} accepted your request`);
      }
    });

    // Global new message listener for notification sound + unread counts
    socket.on('newMessage', newMessage => {
      const chatState = useChatStore.getState();
      const selectedId = chatState.selectedUser?._id;

      // If message is NOT from the currently selected chat, increment unread
      if (newMessage.senderId !== selectedId) {
        const counts = { ...chatState.unreadCounts };
        counts[newMessage.senderId] = (counts[newMessage.senderId] || 0) + 1;
        useChatStore.setState({ unreadCounts: counts });
      }

      // Update last message for sidebar preview
      const lm = { ...chatState.lastMessages };
      lm[newMessage.senderId] = {
        senderId: newMessage.senderId,
        text: newMessage.text,
        image: newMessage.image,
        createdAt: newMessage.createdAt,
      };
      useChatStore.setState({ lastMessages: lm });

      // Play notification beep via Web Audio API
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 830;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } catch {}
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
