import React from 'react';
import Navbar from './components/Navbar';

import HomePage from './pages/HomePage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore.js';
import { useThemeStore } from './store/useThemeStore.js';
import { useEffect } from 'react';
import { Loader } from 'lucide-react';

import { Toaster } from 'react-hot-toast';

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <div data-theme={theme}>
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
      </Routes>

      <Toaster
        toastOptions={{
          style: {
            background: 'oklch(var(--b1))',
            color: 'oklch(var(--bc))',
            borderColor: 'oklch(var(--b3))',
            borderWidth: '1px',
          },
          success: {
            iconTheme: {
              primary: 'oklch(var(--su))',
              secondary: 'oklch(var(--b1))',
            },
          },
          error: {
            iconTheme: {
              primary: 'oklch(var(--er))',
              secondary: 'oklch(var(--b1))',
            },
          },
        }}
      />
    </div>
  );
};

export default App;
