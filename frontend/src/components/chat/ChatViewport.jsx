import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../api/socket';
import { encryptionUtil } from '../../utils/encryption';
import { channelsAPI } from '../../api/channels';
import { directMessagesAPI } from '../../api/directMessages';
import { messagesAPI } from '../../api/messages';
import { FiArrowLeft, FiSend, FiLock, FiShield, FiMoreVertical } from 'react-icons/fi';
import './ChatViewport.css';

const ChatViewport = ({ selectedChat, onBack, isMobile }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const socket = useSocket();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      // Room joining logic via socket
      if (socket) {
        const roomId = selectedChat.type === 'channel' ? selectedChat.id : selectedChat.conversation_id;
        socket.emit('join_room', { room: roomId });
      }
    }
  }, [selectedChat, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      let data = [];
      if (selectedChat.type === 'channel') {
        data = await messagesAPI.getMessages(selectedChat.id);
      } else {
        data = await directMessagesAPI.getConversation(selectedChat.id);
      }
      
      // Decrypt if necessary
      const decrypted = await Promise.all(data.map(async (msg) => {
        if (msg.is_encrypted) {
          const content = await encryptionUtil.decryptMessage(msg.content, localStorage.getItem('e2ee_private_key'));
          return { ...msg, content };
        }
        return msg;
      }));
      
      setMessages(decrypted);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      let encryptedContent = newMessage;
      if (selectedChat.is_encrypted) {
        encryptedContent = await encryptionUtil.encryptMessage(newMessage, selectedChat.public_key);
      }

      if (selectedChat.type === 'dm') {
        await directMessagesAPI.sendMessage(selectedChat.id, { 
          content: encryptedContent,
          message_type: 'text'
        });
      } else {
        await messagesAPI.createMessage(selectedChat.id, {
          content: encryptedContent,
          message_type: 'text'
        });
      }
      
      setNewMessage('');
      fetchMessages(); // Refresh list
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  if (!selectedChat) {
    return (
      <div className="viewport-empty">
        <div className="empty-state-content">
          <div className="empty-icon-circle">
            <FiMessageSquare size={48} />
          </div>
          <h3>Select a Conversation</h3>
          <p>Choose a channel or direct message from the sidebar to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-viewport-container">
      <header className="viewport-header">
        {isMobile && (
          <button className="back-btn" onClick={onBack} aria-label="Go back">
            <FiArrowLeft size={24} />
          </button>
        )}
        <div className="header-info">
          <div className="header-title-row">
            <h3>{selectedChat.name}</h3>
            {selectedChat.is_encrypted && <FiLock className="e2ee-badge" title="End-to-end encrypted" />}
          </div>
          <p className="header-status">
            {selectedChat.type === 'channel' ? 'Channel' : 'Direct Message'}
          </p>
        </div>
        <div className="header-actions">
          <button className="icon-btn"><FiSearch /></button>
          <button className="icon-btn"><FiMoreVertical /></button>
        </div>
      </header>

      <div className="messages-area">
        {loading && messages.length === 0 ? (
          <div className="messages-loading">Loading messages...</div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={msg.id || idx} 
              className={`message-bubble ${msg.sender_id === 'me' ? 'own' : 'other'}`}
            >
              <div className="message-content">
                {msg.content}
              </div>
              <div className="message-footer">
                <span className="message-time">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.is_encrypted && <FiLock size={10} className="e2ee-indicator" />}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-area" onSubmit={handleSend}>
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" disabled={!newMessage.trim()}>
          <FiSend />
        </button>
      </form>
    </div>
  );
};

// Simple import for FiMessageSquare if needed
import { FiMessageSquare } from 'react-icons/fi';

export default ChatViewport;
