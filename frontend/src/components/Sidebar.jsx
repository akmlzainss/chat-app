import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import SidebarSkeleton from './skeletons/SidebarSkeleton';
import { Users, Plus } from 'lucide-react';

const Sidebar = () => {
  const {
    getFriends,
    getDiscoverUsers,
    friends,
    discoverUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    sendFriendRequest,
    friendRequestsSent,
    sidebarMode,
    resetDiscover,
    unreadCounts,
    clearUnread,
    lastMessages,
  } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  const { requestsOpen } = useChatStore();
  const [discoverQuery, setDiscoverQuery] = useState('');

  useEffect(() => {
    if (sidebarMode === 'discover') {
      resetDiscover();
      getDiscoverUsers({
        q: discoverQuery,
        skip: 0,
        limit: discoverQuery ? 50 : 5,
        append: false,
      });
    } else {
      getFriends();
    }
  }, [sidebarMode, getFriends, getDiscoverUsers, resetDiscover]);

  const baseList = sidebarMode === 'discover' ? discoverUsers : friends;

  let visibleList = showOnlineOnly
    ? baseList.filter(u => onlineUsers.includes(u._id))
    : baseList;

  const listRef = useRef(null);
  const [startIndex, setStartIndex] = useState(0);
  const [viewportCount, setViewportCount] = useState(12);
  const rowHeight = 64;
  const overscan = 6;
  const debounceRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const updateCounts = () => {
      setViewportCount(Math.ceil(el.clientHeight / rowHeight));
    };
    updateCounts();
    const onScroll = () => {
      const sTop = el.scrollTop;
      setStartIndex(Math.max(0, Math.floor(sTop / rowHeight) - overscan));
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (nearBottom && sidebarMode === 'discover' && discoverQuery.trim()) {
        const st = useChatStore.getState();
        if (st.discoverHasMore) {
          getDiscoverUsers({
            q: discoverQuery,
            skip: st.discoverSkip,
            limit: st.discoverLimit,
            append: true,
          });
        }
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateCounts);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateCounts);
    };
  }, [rowHeight]);

  const endIndex = Math.min(
    visibleList.length,
    startIndex + viewportCount + overscan * 2
  );
  const slice = visibleList.slice(startIndex, endIndex);
  const offsetY = startIndex * rowHeight;
  const totalHeight = visibleList.length * rowHeight;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside
      className={`h-full w-full lg:w-72 border-r border-base-300 flex flex-col overflow-hidden`}
    >
      <div className="border-b border-base-300 w-full p-3 relative z-10 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5" />
            <span className="font-medium">Contacts</span>
          </div>
        </div>
      </div>

      {sidebarMode === 'discover' && (
        <div className="px-3 py-2 border-b border-base-300 shrink-0">
          <input
            type="text"
            className="input input-bordered input-xs w-full"
            placeholder="Search users..."
            value={discoverQuery}
            onChange={e => {
              const v = e.target.value;
              setDiscoverQuery(v);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                resetDiscover();
                getDiscoverUsers({
                  q: v,
                  skip: 0,
                  limit: v.trim() ? 50 : 5,
                  append: false,
                });
              }, 250);
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto w-full py-2 min-h-0" ref={listRef}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {slice.map(user => {
              const isOnline = onlineUsers.includes(user._id);

              return (
                <div
                  key={user._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedUser(user);
                    clearUnread(user._id);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedUser(user);
                      clearUnread(user._id);
                    }
                  }}
                  className={`
                w-full p-3 pr-10 flex items-center gap-3 hover:bg-base-300 transition-colors cursor-pointer relative
                ${selectedUser?._id === user._id ? 'bg-base-300 ring-1 ring-base-300' : ''}
              `}
                >
                  {/* Avatar + Online dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      <img
                        src={
                          user.profilePic &&
                          (user.profilePic.startsWith('http') ||
                            user.profilePic.startsWith('data:'))
                            ? user.profilePic
                            : '/avatar.png'
                        }
                        alt={user.fullName}
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
                      <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full ring-2 ring-base-100" />
                    )}
                  </div>

                  <div className="text-left min-w-0 flex-1">
                    <div className="font-medium truncate">
                      <span className="truncate">{user.fullName}</span>
                    </div>
                    <div className="text-xs truncate">
                      {sidebarMode === 'discover' ? (
                        <span
                          className={
                            isOnline ? 'text-success' : 'text-base-content/50'
                          }
                        >
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      ) : lastMessages[user._id] ? (
                        <span className="text-base-content/50">
                          {lastMessages[user._id].senderId ===
                          useAuthStore.getState().authUser?._id
                            ? 'You: '
                            : ''}
                          {lastMessages[user._id].text ||
                            (lastMessages[user._id].image ? '📷 Photo' : '')}
                        </span>
                      ) : (
                        <span
                          className={
                            isOnline ? 'text-success' : 'text-base-content/50'
                          }
                        >
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add friend button */}
                  {sidebarMode === 'discover' && (
                    <div className="flex absolute right-3 top-1/2 -translate-y-1/2 items-center">
                      {friendRequestsSent?.includes?.(user._id) ? (
                        <span className="text-[10px] text-base-content/50 whitespace-nowrap">
                          Requested
                        </span>
                      ) : (
                        <button
                          className="btn btn-circle btn-ghost btn-xs"
                          onClick={e => {
                            e.stopPropagation();
                            sendFriendRequest(user._id);
                          }}
                          title="Add friend"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Unread count badge */}
                  {sidebarMode !== 'discover' && unreadCounts[user._id] > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 badge badge-primary badge-sm text-[10px] font-bold min-w-[20px]">
                      {unreadCounts[user._id]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {visibleList.length === 0 && (
          <div className="text-center text-base-content/50 py-8 text-sm">
            {showOnlineOnly ? 'No online users' : 'No users found'}
          </div>
        )}
      </div>
      <div className="border-t border-base-300 w-full p-2 shrink-0">
        <div className="flex items-center justify-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={e => setShowOnlineOnly(e.target.checked)}
              className="toggle toggle-sm"
              aria-label="Online only"
            />
            <span className="text-xs">Online only</span>
          </label>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
