import { X, Search } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';

const ChatHeader = ({ onSearchToggle }) => {
  const { selectedUser, setSelectedUser, isTyping } = useChatStore();
  const { friends, removeFriend } = useChatStore();
  const { onlineUsers } = useAuthStore();

  const isOnline = onlineUsers.includes(selectedUser._id);

  return (
    <div className="p-2.5 border-b border-base-300 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <div className="size-10 rounded-full overflow-hidden">
              <img
                src={selectedUser.profilePic || '/avatar.png'}
                alt={selectedUser.fullName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                onError={e => {
                  e.currentTarget.src = '/avatar.png';
                }}
              />
            </div>
            {isOnline && (
              <span className="absolute bottom-0 right-0 size-2.5 bg-success rounded-full ring-2 ring-base-100" />
            )}
          </div>

          {/* User info + Typing Indicator */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{selectedUser.fullName}</h3>

            <div className="flex items-center gap-1.5 h-4">
              {isTyping ? (
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xs text-primary font-medium">
                    typing
                  </span>
                  <div className="flex items-center gap-0.5 pb-0.5">
                    <span
                      className="w-1 h-1 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: '0ms', animationDuration: '1s' }}
                    />
                    <span
                      className="w-1 h-1 bg-primary rounded-full animate-bounce"
                      style={{
                        animationDelay: '200ms',
                        animationDuration: '1s',
                      }}
                    />
                    <span
                      className="w-1 h-1 bg-primary rounded-full animate-bounce"
                      style={{
                        animationDelay: '400ms',
                        animationDuration: '1s',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <p
                  className={`text-xs ${isOnline ? 'text-success font-medium' : 'text-base-content/50'}`}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {friends?.some?.(
            id => String(id._id || id) === String(selectedUser._id)
          ) && (
            <button
              className="btn btn-outline btn-xs"
              onClick={() => removeFriend(selectedUser._id)}
            >
              Unfriend
            </button>
          )}
          {onSearchToggle && (
            <button
              onClick={onSearchToggle}
              className="btn btn-ghost btn-circle btn-sm"
              title="Search messages"
            >
              <Search size={18} />
            </button>
          )}
          <button
            onClick={() => setSelectedUser(null)}
            className="btn btn-ghost btn-circle btn-sm"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
