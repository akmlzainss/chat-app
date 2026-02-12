import { create } from 'zustand';
import toast from 'react-hot-toast';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from './useAuthStore';

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  friends: [],
  lastMessages: {},
  discoverUsers: [],
  discoverHasMore: true,
  discoverSkip: 0,
  discoverLimit: 50,
  friendRequestsSent: [],
  friendRequestsReceived: [],
  requestsOpen: false,
  sidebarMode: 'friends',
  selectedUser: null,
  hasMore: true,
  isUsersLoading: false,
  isMessagesLoading: false,
  isLoadingOlder: false,
  isSendingMessage: false,
  isDeletingMessage: null,
  isTyping: false,
  searchQuery: '',
  unreadCounts: {},

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get('/messages/users');
      set({ users: res.data.filteredUsers });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load users');
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getFriends: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get('/friends/list');
      set({
        friends: res.data.friends,
        lastMessages: res.data.lastMessages || {},
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load friends');
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getDiscoverUsers: async ({ q = '', skip, limit, append = false } = {}) => {
    try {
      const state = get();
      const useSkip = typeof skip === 'number' ? skip : state.discoverSkip;
      const useLimit = typeof limit === 'number' ? limit : state.discoverLimit;
      const res = await axiosInstance.get(
        `/friends/discover?q=${encodeURIComponent(q)}&skip=${useSkip}&limit=${useLimit}`
      );
      const nextUsers = append
        ? [...state.discoverUsers, ...(res.data.users || [])]
        : res.data.users || [];
      set({
        discoverUsers: nextUsers,
        discoverHasMore: !!res.data?.hasMore,
        discoverSkip: useSkip + useLimit,
        discoverLimit: useLimit,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load users');
    }
  },

  resetDiscover: () =>
    set({ discoverUsers: [], discoverHasMore: true, discoverSkip: 0 }),

  setRequestsOpen: open => set({ requestsOpen: open }),
  setSidebarMode: mode => set({ sidebarMode: mode }),

  sendFriendRequest: async userId => {
    try {
      await axiosInstance.post(`/friends/request/${userId}`);
      toast.success('Request sent');
      set({ friendRequestsSent: [...get().friendRequestsSent, userId] });
      get().getDiscoverUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    }
  },

  acceptFriendRequest: async userId => {
    try {
      await axiosInstance.post(`/friends/accept/${userId}`);
      toast.success('Friend added');
      get().getFriends();
      set({
        friendRequestsReceived: get().friendRequestsReceived.filter(
          u => u._id !== userId
        ),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept');
    }
  },

  rejectFriendRequest: async userId => {
    try {
      await axiosInstance.post(`/friends/reject/${userId}`);
      set({
        friendRequestsReceived: get().friendRequestsReceived.filter(
          u => u._id !== userId
        ),
      });
      get().getDiscoverUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    }
  },

  removeFriend: async userId => {
    try {
      await axiosInstance.post(`/friends/remove/${userId}`);
      get().getFriends();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove friend');
    }
  },

  getMessages: async (userId, { skip = 0, limit = 20 } = {}) => {
    set({ isMessagesLoading: skip === 0, isLoadingOlder: skip > 0 });
    try {
      const res = await axiosInstance.get(
        `/messages/${userId}?skip=${skip}&limit=${limit}`
      );
      const incoming = res.data?.messages || [];
      if (skip === 0) {
        set({ messages: incoming, hasMore: res.data?.hasMore });
      } else {
        set({
          messages: [...incoming, ...get().messages],
          hasMore: res.data?.hasMore,
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load messages');
    } finally {
      set({ isMessagesLoading: false, isLoadingOlder: false });
    }
  },

  sendMessage: async messageData => {
    const { selectedUser, messages, isSendingMessage } = get();
    if (!selectedUser) {
      toast.error('Please select a user to send a message.');
      return;
    }
    if (isSendingMessage) return;

    set({ isSendingMessage: true });
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      set({ messages: [...messages, res.data] });
      // Update last message for sidebar preview
      const lm = { ...get().lastMessages };
      lm[selectedUser._id] = {
        senderId: res.data.senderId,
        text: res.data.text,
        image: res.data.image,
        createdAt: res.data.createdAt,
      };
      set({ lastMessages: lm });
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to send message: Network Error'
      );
    } finally {
      set({ isSendingMessage: false });
    }
  },

  deleteMessage: async messageId => {
    set({ isDeletingMessage: messageId });
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      set({ messages: get().messages.filter(m => m._id !== messageId) });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete message');
    } finally {
      set({ isDeletingMessage: null });
    }
  },

  setSearchQuery: q => set({ searchQuery: q }),

  clearUnread: userId => {
    const counts = { ...get().unreadCounts };
    delete counts[userId];
    set({ unreadCounts: counts });
  },

  _chatMessageHandler: null,

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Store handler reference so we can remove only this one later
    const chatHandler = newMessage => {
      const isMessageFromSelectedUser =
        newMessage.senderId === selectedUser._id;
      if (!isMessageFromSelectedUser) return;

      set({ messages: [...get().messages, newMessage] });
      // Update last message for sidebar preview
      const lm = { ...get().lastMessages };
      lm[newMessage.senderId] = {
        senderId: newMessage.senderId,
        text: newMessage.text,
        image: newMessage.image,
        createdAt: newMessage.createdAt,
      };
      set({ lastMessages: lm });
    };
    set({ _chatMessageHandler: chatHandler });
    socket.on('newMessage', chatHandler);

    socket.on('messageDelivered', ({ messageId }) => {
      set({
        messages: get().messages.map(m =>
          m._id === messageId ? { ...m, status: 'delivered' } : m
        ),
      });
    });

    socket.on('messageRead', ({ messageIds }) => {
      set({
        messages: get().messages.map(m =>
          messageIds.includes(m._id) ? { ...m, status: 'read' } : m
        ),
      });
    });

    socket.on('userTyping', ({ from }) => {
      if (from === selectedUser._id) set({ isTyping: true });
    });

    socket.on('userStopTyping', ({ from }) => {
      if (from === selectedUser._id) set({ isTyping: false });
    });

    socket.on('messageDeleted', ({ messageId }) => {
      set({ messages: get().messages.filter(m => m._id !== messageId) });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    // Only remove the per-chat handler, keep the global one for notifications
    const handler = get()._chatMessageHandler;
    if (handler) socket.off('newMessage', handler);
    set({ _chatMessageHandler: null });
    socket.off('messageDelivered');
    socket.off('messageRead');
    socket.off('userTyping');
    socket.off('userStopTyping');
    socket.off('messageDeleted');
    set({ isTyping: false });
  },

  setSelectedUser: selectedUser => set({ selectedUser }),
}));
