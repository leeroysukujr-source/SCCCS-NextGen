import React from 'react';
import ChatLayout from '../components/chat/ChatLayout';

const Messaging = () => {
  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <ChatLayout />
    </div>
  );
};

export default Messaging;
