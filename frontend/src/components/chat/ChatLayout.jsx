import React, { useState, useEffect } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatViewport from './ChatViewport';
import './ChatLayout.css';

const ChatLayout = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  return (
    <div className={`chat-layout-container ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Mobile Stack Pattern: Either show list OR show viewport */}
      {isMobile ? (
        !selectedChat ? (
          <div className="sidebar-pane">
            <ChatSidebar 
              onSelectChat={handleSelectChat} 
              selectedId={selectedChat?.id} 
              selectedType={selectedChat?.type}
            />
          </div>
        ) : (
          <div className="viewport-pane">
            <ChatViewport 
              selectedChat={selectedChat} 
              onBack={handleBack} 
              isMobile={true}
            />
          </div>
        )
      ) : (
        /* Desktop: Side-by-side Layout */
        <>
          <div className="sidebar-pane">
            <ChatSidebar 
              onSelectChat={handleSelectChat} 
              selectedId={selectedChat?.id} 
              selectedType={selectedChat?.type}
            />
          </div>
          <div className="viewport-pane">
            <ChatViewport 
              selectedChat={selectedChat} 
              onBack={handleBack} 
              isMobile={false}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ChatLayout;
