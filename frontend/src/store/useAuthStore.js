import { create } from 'zustand';
import { axiosInstance } from '../lib/axios.js';
import toast from 'react-hot-toast'; // ✅ wajib

export const useAuthStore = create(set => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,

  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get('/auth/check');
      set({ authUser: res.data });
    } catch (error) {
      console.log('Error in checkAuth:', error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async data => {
    try {
      set({ isSigningUp: true });

      const res = await axiosInstance.post('/auth/signup', data);
      set({ authUser: res.data });

      toast.success('Signup successful! 🎉');
      return true; // ✅ agar bisa di-handle untuk redirect
    } catch (error) {
      toast.error(error.response?.data?.message || 'Signup failed');
      console.error('Signup error:', error);
      return false; // ✅ untuk handle error di halaman
    } finally {
      set({ isSigningUp: false });
    }
  },

  // useAuthStore.js – bagian login yang aman
login: async (data) => {
  set({ isLoggingIn: true });
  try {
    const res = await axiosInstance.post('/auth/login', data);
    set({ authUser: res.data.user || res.data }); // sesuaikan dengan response backend
    toast.success('Berhasil login!');
    get().connectSocket?.();
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Login gagal, silakan coba lagi';
    toast.error(message);
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
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async data => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put('/auth/update-profile', data);
      set({ authUser: res.data });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      const message =
        error.response?.data?.message || // kalau ada pesan dari server
        error.message || // kalau Axios sendiri yang error
        'Upload failed'; // fallback default
      toast.error(message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
}));
