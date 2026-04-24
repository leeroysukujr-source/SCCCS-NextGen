import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketProvider';
import { useAuthStore } from '../../store/authStore';
import { encryptionUtil } from '../../utils/encryption';
import { channelsAPI } from '../../api/channels';
import { directMessagesAPI } from '../../api/directMessages';
import { messagesAPI } from '../../api/messages';
import { FiArrowLeft, FiSend, FiLock, FiShield, FiMoreVertical, FiSearch, FiMessageSquare } from 'react-icons/fi';
import './ChatViewport.css';

const ChatViewport = ({ selectedChat, onBack, isMobile }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;
    setLoading(true);
    try {
      let data = [];
      if (selectedChat.type === 'channel') {
        data = await messagesAPI.getMessages(selectedChat.id);
      } else {
        const dmId = selectedChat.conversation_id || selectedChat.id;
        data = await directMessagesAPI.getConversation(dmId);
      }
      
      const decrypted = await Promise.all((Array.isArray(data) ? data : []).map(async (msg) => {
        if (msg.is_encrypted) {
          try {
            const privateKey = localStorage.getItem('e2ee_private_key');
            if (privateKey) {
              const content = await encryptionUtil.decryptMessage(msg.content, privateKey);
              return { ...msg, content };
            }
          } catch (e) {
            console.error('Decryption failed for message:', msg.id, e);
          }
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

  useEffect(() => {
    if (selectedChat && socket) {
      fetchMessages();

      // Room joining logic
      if (selectedChat.type === 'channel') {
        socket.emit('join_channel', { channel_id: selectedChat.id });
      }

      const handleNewMessage = (msg) => {
        if (selectedChat.type === 'channel') {
          if (String(msg.channel_id) === String(selectedChat.id)) {
            setMessages(prev => [...prev, msg]);
          }
        } else {
          // For DMs, determine if message belongs to this conversation
          const msgPartnerId = String(msg.sender_id) === String(user?.id) ? msg.recipient_id : msg.sender_id;
          if (String(msgPartnerId) === String(selectedChat.id)) {
            setMessages(prev => [...prev, msg]);
          }
        }
      };

      socket.on('message_received', handleNewMessage);
      socket.on('direct_message_received', handleNewMessage);

      return () => {
        socket.off('message_received', handleNewMessage);
        socket.off('direct_message_received', handleNewMessage);
      };
    }
  }, [selectedChat, socket, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      let encryptedContent = newMessage;
      if (selectedChat.is_encrypted && selectedChat.public_key) {
        try {
          encryptedContent = await encryptionUtil.encryptMessage(newMessage, selectedChat.public_key);
        } catch (e) {
          console.error('Encryption failed, sending plain text:', e);
        }
      }

      if (selectedChat.type === 'dm') {
        const dmId = selectedChat.conversation_id || selectedChat.id;
        await directMessagesAPI.sendMessage(dmId, { 
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
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const isOwnMessage = (msg) => {
    if (!msg || !user) return false;
    const authorId = msg.author_id || msg.sender_id;
    return String(authorId) === String(user.id) || authorId === 'me';
  };

  if (!selectedChat) {
    return (
      <div className="viewport-empty">
        <div className="empty-state-content">
          <div className="empty-icon-circle">
            <FiMessageSquare size={48} />
          </div>
          <h3>SCCCS Inbox Center</h3>
          <p>Select a colleague or student from your sidebar to start a secure, real-time professional conversation.</p>
          {!isMobile && <div className="hint-pill">Use the search bar to find people quickly</div>}
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
          <button className="icon-btn" title="Search messages"><FiSearch /></button>
          <button className="icon-btn" title="Options"><FiMoreVertical /></button>
        </div>
      </header>

      <div className="messages-area">
        {loading && messages.length === 0 ? (
          <div className="messages-loading">
             <div className="loading-spinner" />
             <span>Loading conversation history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages here yet. Send a message to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={msg.id || idx} 
              className={`message-wrapper ${isOwnMessage(msg) ? 'own' : 'other'}`}
            >
              <div className="message-bubble">
                <div className="message-content">
                  {msg.content}
                </div>
                <div className="message-footer">
                  <span className="message-time">
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  {msg.is_encrypted && <FiLock size={10} className="e2ee-indicator" />}
                </div>
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
          autoFocus={!isMobile}
        />
        <button type="submit" disabled={!newMessage.trim()}>
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default ChatViewport;
