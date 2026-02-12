import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import {
  Camera,
  User,
  Mail,
  Pencil,
  Check,
  X,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile, changePassword } =
    useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(authUser?.fullName || '');
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwData, setPwData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  const handleImageUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      const base64image = reader.result;
      setSelectedImg(base64image);
      await updateProfile({ profilePic: base64image });
    };
  };

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-semibold">Profile</h1>
            <p className="mt-2">Informasi profile kamu</p>
          </div>

          {/* Profile Picture Section */}

          <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-base-300">
                <img
                  src={
                    selectedImg
                      ? selectedImg
                      : authUser?.profilePic?.startsWith('http')
                        ? authUser.profilePic
                        : '/avatar.png'
                  }
                  alt="Profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  onError={e => {
                    e.currentTarget.src = '/avatar.png';
                  }}
                />
              </div>
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute -bottom-2 -right-2 
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200
                  ${isUpdatingProfile ? 'animate-pulse pointer-events-none' : ''}
                `}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile
                ? 'Uploading...'
                : 'Click the camera icon to update your photo'}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    autoFocus
                    disabled={isUpdatingProfile}
                  />
                  <button
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={() => {
                      setNewName(authUser?.fullName || '');
                      setIsEditingName(false);
                    }}
                    disabled={isUpdatingProfile}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    className="btn btn-primary btn-sm btn-circle"
                    onClick={async () => {
                      if (
                        newName.trim() &&
                        newName.trim() !== authUser?.fullName
                      ) {
                        await updateProfile({ fullName: newName.trim() });
                      }
                      setIsEditingName(false);
                    }}
                    disabled={isUpdatingProfile || !newName.trim()}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="px-4 py-2.5 bg-base-200 rounded-lg border flex items-center justify-between cursor-pointer hover:bg-base-300 transition-colors"
                  onClick={() => setIsEditingName(true)}
                >
                  <span>{authUser?.fullName}</span>
                  <Pencil className="w-4 h-4 text-base-content/50" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
                {authUser?.email}
              </p>
            </div>
          </div>

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Change Password</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowPwForm(!showPwForm);
                  setPwData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
              >
                {showPwForm ? 'Cancel' : 'Change'}
              </button>
            </div>

            {showPwForm && (
              <form
                className="space-y-4"
                onSubmit={async e => {
                  e.preventDefault();
                  if (pwData.newPassword !== pwData.confirmPassword) {
                    const toast = (await import('react-hot-toast')).default;
                    toast.error('New passwords do not match');
                    return;
                  }
                  setIsChangingPw(true);
                  const ok = await changePassword({
                    currentPassword: pwData.currentPassword,
                    newPassword: pwData.newPassword,
                  });
                  setIsChangingPw(false);
                  if (ok) {
                    setShowPwForm(false);
                    setPwData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }
                }}
              >
                <div className="space-y-1.5">
                  <label className="text-sm text-zinc-400 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      className="input input-bordered w-full pr-10"
                      placeholder="Enter current password"
                      value={pwData.currentPassword}
                      onChange={e =>
                        setPwData({
                          ...pwData,
                          currentPassword: e.target.value,
                        })
                      }
                      required
                      disabled={isChangingPw}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
                      onClick={() => setShowCurrent(!showCurrent)}
                    >
                      {showCurrent ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-zinc-400 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      className="input input-bordered w-full pr-10"
                      placeholder="At least 6 characters"
                      value={pwData.newPassword}
                      onChange={e =>
                        setPwData({ ...pwData, newPassword: e.target.value })
                      }
                      minLength={6}
                      required
                      disabled={isChangingPw}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-zinc-400 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="input input-bordered w-full"
                    placeholder="Re-enter new password"
                    value={pwData.confirmPassword}
                    onChange={e =>
                      setPwData({ ...pwData, confirmPassword: e.target.value })
                    }
                    minLength={6}
                    required
                    disabled={isChangingPw}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={
                    isChangingPw ||
                    !pwData.currentPassword ||
                    !pwData.newPassword ||
                    !pwData.confirmPassword
                  }
                >
                  {isChangingPw ? 'Changing...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium  mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split('T')[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
