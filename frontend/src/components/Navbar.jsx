import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import {
  LogOut,
  MessageSquare,
  Settings,
  User,
  Users,
  UserPlus,
  Bell,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const {
    friendRequestsReceived,
    setRequestsOpen,
    setSidebarMode,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useChatStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [requestsOpen2, setRequestsOpen2] = useState(false);
  const profileRef = useRef(null);
  const requestsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = e => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (requestsRef.current && !requestsRef.current.contains(e.target)) {
        setRequestsOpen2(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              onClick={() => {
                useChatStore.getState().setSelectedUser(null);
                useChatStore.getState().setSidebarMode('friends');
              }}
              className="flex items-center gap-2.5 hover:opacity-80 transition-all"
            >
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold">Chatty</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={'/settings'}
              className={`
              btn btn-sm gap-2 transition-colors
              
              `}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <>
                <button
                  className="btn btn-sm gap-2"
                  onClick={() => {
                    setSidebarMode('friends');
                    setRequestsOpen(false);
                    navigate('/');
                  }}
                  title="Friends"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Friends</span>
                </button>
                <button
                  className="btn btn-sm gap-2"
                  onClick={() => {
                    setSidebarMode('discover');
                    setRequestsOpen(false);
                    navigate('/');
                  }}
                  title="Discover"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Discover</span>
                </button>
                <div className="relative" ref={requestsRef}>
                  <button
                    className="btn btn-sm gap-2"
                    onClick={() => {
                      setRequestsOpen2(!requestsOpen2);
                      setRequestsOpen(true);
                      navigate('/');
                    }}
                    title="Requests"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="hidden sm:inline">Requests</span>
                    {friendRequestsReceived.length > 0 && (
                      <span className="badge badge-primary badge-sm">
                        {friendRequestsReceived.length}
                      </span>
                    )}
                  </button>
                  {requestsOpen2 && (
                    <div className="absolute right-0 z-50 mt-2 p-2 bg-base-100 rounded-box shadow-lg border border-base-300 w-64">
                      {friendRequestsReceived.length === 0 ? (
                        <div className="text-sm text-base-content/60 p-2">
                          No requests
                        </div>
                      ) : (
                        friendRequestsReceived.map(u => (
                          <div
                            key={u._id}
                            className="flex items-center justify-between py-1"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={u.profilePic || '/avatar.png'}
                                alt={u.fullName}
                                className="size-6 rounded-full"
                              />
                              <span className="text-sm truncate">
                                {u.fullName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                className="btn btn-success btn-xs"
                                onClick={() => {
                                  acceptFriendRequest(u._id);
                                }}
                              >
                                Accept
                              </button>
                              <button
                                className="btn btn-outline btn-xs"
                                onClick={() => {
                                  rejectFriendRequest(u._id);
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {authUser && (
              <div className="relative" ref={profileRef}>
                <button
                  className="btn btn-sm gap-2"
                  title="Profile"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    <img
                      src={
                        authUser.profilePic &&
                        authUser.profilePic.startsWith('http')
                          ? authUser.profilePic
                          : '/avatar.png'
                      }
                      alt={authUser.fullName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={e => {
                        e.currentTarget.src = '/avatar.png';
                      }}
                    />
                  </div>
                  <span className="hidden sm:inline max-w-[80px] truncate">
                    {authUser.fullName}
                  </span>
                </button>
                {profileOpen && (
                  <ul className="absolute right-0 z-50 mt-2 menu p-2 shadow-lg bg-base-100 rounded-box w-48 border border-base-300">
                    <li>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2"
                        onClick={() => setProfileOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="flex items-center gap-2 text-error"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
