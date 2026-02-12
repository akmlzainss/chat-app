import React from 'react';
import { useChatStore } from '../store/useChatStore';

import Sidebar from '../components/Sidebar';
import NoChatSelected from '../components/NoChatSelected';
import ChatContainer from '../components/ChatContainer';

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-dvh bg-base-200 overflow-hidden">
      <div className="flex items-center justify-center pt-16 lg:pt-20 lg:px-4 h-full">
        <div className="bg-base-100 lg:rounded-lg shadow-cl w-full max-w-6xl h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-8rem)]">
          <div className="flex h-full lg:rounded-lg overflow-hidden relative">
            {/* Mobile: hide sidebar when chat is open */}
            <div
              className={`h-full ${selectedUser ? 'hidden lg:flex' : 'w-full lg:w-auto flex'}`}
            >
              <Sidebar />
            </div>

            {/* Mobile: hide chat when no user selected (show sidebar instead) */}
            <div
              className={`flex-1 h-full min-h-0 ${selectedUser ? 'flex' : 'hidden lg:flex'}`}
            >
              {selectedUser ? <ChatContainer /> : <NoChatSelected />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
