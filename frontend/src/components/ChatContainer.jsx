import { useChatStore } from '../store/useChatStore';
import { useEffect, useRef, useState, useCallback } from 'react';
import ChatHeader from './ChatHeader';
import MessageSkeleton from './skeletons/MessageSkeleton';
import MessageInput from './MessageInput';
import { formatMessageTime } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { Search, X, Trash2, Loader2 } from 'lucide-react';

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    hasMore,
    isTyping,
    deleteMessage,
    isDeletingMessage,
    clearUnread,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevHeightRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const prevMsgCountRef = useRef(0);
  const sentReadIdsRef = useRef(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((behavior = 'auto') => {
    requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  }, []);

  // Initial load + subscribe
  useEffect(() => {
    isInitialLoadRef.current = true;
    prevMsgCountRef.current = 0;
    sentReadIdsRef.current = new Set();
    getMessages(selectedUser._id, { skip: 0, limit: 20 });
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [
    selectedUser._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  // Scroll management: initial load, new messages, older messages
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !Array.isArray(messages) || messages.length === 0) return;

    // After loading older messages — restore scroll position
    if (loadingOlderRef.current) {
      requestAnimationFrame(() => {
        const newHeight = el.scrollHeight;
        const addedHeight = newHeight - prevHeightRef.current;
        el.scrollTop = addedHeight;
      });
      loadingOlderRef.current = false;
      prevMsgCountRef.current = messages.length;
      return;
    }

    // Initial load — always snap to bottom
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      scrollToBottom();
      prevMsgCountRef.current = messages.length;
      return;
    }

    // New message arrived (appended at end)
    if (messages.length > prevMsgCountRef.current) {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      // If near bottom or the new message is ours, scroll down
      const lastMsg = messages[messages.length - 1];
      const isMine = lastMsg?.senderId === authUser._id;
      if (distFromBottom < 150 || isMine) {
        scrollToBottom('smooth');
      }
    }

    prevMsgCountRef.current = messages.length;
  }, [messages, authUser._id, scrollToBottom]);

  // Mark messages as read (separate effect, debounced)
  useEffect(() => {
    if (!socket || !Array.isArray(messages) || messages.length === 0) return;

    const unread = messages
      .filter(
        m =>
          m.senderId === selectedUser._id &&
          m.status !== 'read' &&
          !sentReadIdsRef.current.has(m._id)
      )
      .map(m => m._id);

    if (unread.length === 0) return;

    const timer = setTimeout(() => {
      unread.forEach(id => sentReadIdsRef.current.add(id));
      socket.emit('messageRead', {
        messageIds: unread,
        from: selectedUser._id,
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [messages, selectedUser._id, socket]);

  // Clear unread count when entering a chat
  useEffect(() => {
    if (selectedUser?._id) clearUnread(selectedUser._id);
  }, [selectedUser?._id, clearUnread]);

  // Filter messages by search text
  const filteredMessages = searchText
    ? messages.filter(m =>
        m.text?.toLowerCase().includes(searchText.toLowerCase())
      )
    : messages;

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 h-full">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <ChatHeader onSearchToggle={() => setSearchOpen(prev => !prev)} />

      {/* Search Bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-base-300 bg-base-200/50 shrink-0">
          <Search className="w-4 h-4 text-base-content/50 flex-shrink-0" />
          <input
            type="text"
            className="input input-xs input-bordered flex-1"
            placeholder="Search messages..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            autoFocus
          />
          <button
            className="btn btn-ghost btn-xs btn-circle"
            onClick={() => {
              setSearchOpen(false);
              setSearchText('');
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-100 overscroll-contain min-h-0"
        style={{ willChange: 'scroll-position' }}
        ref={scrollContainerRef}
        onScroll={e => {
          const el = e.currentTarget;
          if (el.scrollTop === 0 && hasMore && !isMessagesLoading) {
            prevHeightRef.current = el.scrollHeight;
            loadingOlderRef.current = true;
            getMessages(selectedUser._id, { skip: messages.length, limit: 20 });
          }
        }}
      >
        {Array.isArray(filteredMessages) &&
          filteredMessages.map(message => {
            const isSent = message.senderId === authUser._id;
            const canDelete =
              isSent &&
              Date.now() - new Date(message.createdAt).getTime() <
                15 * 60 * 1000;

            return (
              <div
                key={message._id}
                className={`flex items-center gap-1 group ${isSent ? 'justify-end' : 'justify-start'}`}
              >
                {/* Delete button — visible on hover, left of sent bubble */}
                {canDelete && (
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-ghost btn-xs btn-circle flex-shrink-0"
                    disabled={isDeletingMessage === message._id}
                    onClick={() => setConfirmDeleteId(message._id)}
                    title="Unsend message"
                  >
                    {isDeletingMessage === message._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-error" />
                    )}
                  </button>
                )}

                <div
                  className={`
                    chat-bubble flex flex-col max-w-[75%]
                    ${isSent ? 'chat-bubble-primary text-primary-content' : 'bg-base-200 text-base-content'}
                  `}
                >
                  {/* Image */}
                  {message.image && (
                    <div className="relative rounded-lg overflow-hidden mb-2">
                      <img
                        src={message.image}
                        alt="Attachment"
                        className="max-w-[280px] max-h-[400px] w-auto h-auto object-cover rounded-lg"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Text */}
                  {message.text && (
                    <p className="text-sm break-words">{message.text}</p>
                  )}

                  {/* Time + Status */}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <time
                      className={`text-[10px] ${isSent ? 'text-primary-content/70' : 'text-base-content/70'}`}
                    >
                      {formatMessageTime(message.createdAt)}
                    </time>
                    {isSent && (
                      <span className="text-[10px] text-primary-content/70">
                        {message.status === 'read'
                          ? 'Read'
                          : message.status === 'delivered'
                            ? 'Delivered'
                            : 'Sent'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-base-200 rounded-xl p-3 shadow-sm flex items-center gap-1">
              <span
                className="w-2 h-2 bg-base-content rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 bg-base-content rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 bg-base-content rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      <MessageInput />

      {/* Centered delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-base-100 rounded-xl shadow-xl p-6 w-80 max-w-[90vw] flex flex-col items-center gap-4 animate-in">
            <div className="bg-error/10 p-3 rounded-full">
              <Trash2 className="w-6 h-6 text-error" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-base">Delete Message</h3>
              <p className="text-sm text-base-content/60 mt-1">
                Are you sure you want to delete this message? This action cannot
                be undone.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-error flex-1"
                onClick={() => {
                  deleteMessage(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
