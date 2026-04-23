import React, { useState, useEffect } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatViewport from './ChatViewport';
import CreateChatroomModal from '../CreateChatroomModal';
import StartChatModal from './StartChatModal';
import './ChatLayout.css';

const ChatLayout = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStartDMModal, setShowStartDMModal] = useState(false);

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

  const handleAction = (tab) => {
    if (tab === 'channels') {
      setShowCreateModal(true);
    } else {
      setShowStartDMModal(true);
    }
  };

  const handleStartDM = (user) => {
    setSelectedChat({
      type: 'dm',
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      user: user
    });
    setShowStartDMModal(false);
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
              onAction={handleAction}
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
              onAction={handleAction}
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

      {/* Modals */}
      <CreateChatroomModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          // Sidebar fetches data on interval, but we could trigger it here if needed
        }}
      />

      <StartChatModal 
        isOpen={showStartDMModal} 
        onClose={() => setShowStartDMModal(false)}
        onSelectUser={handleStartDM}
      />
    </div>
  );
};

export default ChatLayout;
