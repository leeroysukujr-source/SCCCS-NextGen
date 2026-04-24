import React, { useState, useEffect, useRef } from 'react';
import { channelsAPI } from '../../api/channels';
import { directMessagesAPI } from '../../api/directMessages';
import { useSocket } from '../../contexts/SocketProvider';
import { useAuthStore } from '../../store/authStore';
import { FiHash, FiLock, FiUser, FiSearch, FiMessageSquare, FiPlus, FiMessageCircle } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import './ChatSidebar.css';

const ChatSidebar = ({ onSelectChat, selectedId, selectedType, onAction }) => {
  const { user: currentUser } = useAuthStore();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState(window.location.pathname.includes('direct-messages') ? 'dms' : 'channels'); 
  const [channels, setChannels] = useState([]);
  const [dms, setDms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const isFetchingRef = useRef(false);

  const fetchData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      const [channelsData, conversationsData] = await Promise.all([
        channelsAPI.getChannels().catch(e => { console.error('Channels fetch error:', e); return []; }),
        directMessagesAPI.getConversations().catch(e => { console.error('DMs fetch error:', e); return []; })
      ]);

      setChannels((Array.isArray(channelsData) ? channelsData : []).map(c => ({ 
        ...c, 
        type: 'channel', 
        id: c.id, 
        name: c.name,
        last_message: c.last_message,
        unread_count: c.unread_count || 0
      })));

      setDms((Array.isArray(conversationsData) ? conversationsData : []).map(conv => ({ 
        ...conv, 
        type: 'dm', 
        id: conv.user_id, 
        name: conv.user?.first_name || conv.user?.username || 'Unknown User',
        last_message: conv.last_message,
        user: conv.user,
        unread_count: conv.unread_count || 0
      })));

      setError(null);
    } catch (err) {
      console.error('Failed to fetch chat list', err);
      setError('Could not load chats.');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time Socket Listeners for Sidebar Updates
  useEffect(() => {
    if (socket) {
      const handleSocketMessage = (msg) => {
        console.log('[ChatSidebar] Real-time message received:', msg);
        
        // Handle Channel Message
        if (msg.channel_id) {
          setChannels(prev => {
            const index = prev.findIndex(c => String(c.id) === String(msg.channel_id));
            if (index === -1) return prev; // Not in a channel we track

            const newChannels = [...prev];
            const channel = { ...newChannels[index] };
            
            channel.last_message = {
              content: msg.content,
              created_at: msg.created_at || new Date().toISOString()
            };

            // Increment unread if not currently viewing this channel
            if (selectedId !== channel.id || selectedType !== 'channel') {
              channel.unread_count = (channel.unread_count || 0) + 1;
            }

            newChannels.splice(index, 1);
            newChannels.unshift(channel); // Move to top
            return newChannels;
          });
        } 
        // Handle Direct Message
        else if (msg.sender_id) {
          setDms(prev => {
            // In DMs, the 'id' in our state is the other user's ID
            const otherUserId = String(msg.sender_id) === String(currentUser?.id) ? msg.recipient_id : msg.sender_id;
            const index = prev.findIndex(d => String(d.id) === String(otherUserId));
            
            if (index === -1) {
                // If new conversation, we should probably fetch data again or wait for poll
                // But let's trigger a fetch to be safe
                fetchData();
                return prev;
            }

            const newDms = [...prev];
            const dm = { ...newDms[index] };
            
            dm.last_message = {
              content: msg.content,
              created_at: msg.created_at || new Date().toISOString()
            };

            // Increment unread if message is FROM someone else and we aren't viewing them
            if (String(msg.sender_id) !== String(currentUser?.id)) {
                if (selectedId !== dm.id || selectedType !== 'dm') {
                    dm.unread_count = (dm.unread_count || 0) + 1;
                }
            }

            newDms.splice(index, 1);
            newDms.unshift(dm); // Move to top
            return newDms;
          });
        }
      };

      socket.on('message_received', handleSocketMessage);
      socket.on('direct_message_received', handleSocketMessage);

      return () => {
        socket.off('message_received', handleSocketMessage);
        socket.off('direct_message_received', handleSocketMessage);
      };
    }
  }, [socket, selectedId, selectedType, currentUser?.id]);

  const currentItems = activeTab === 'channels' ? channels : dms;
  const filteredItems = currentItems.filter(item => 
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false })
        .replace('about ', '')
        .replace('less than a minute', 'now')
        .replace(' minute', 'm')
        .replace(' minutes', 'm')
        .replace(' hour', 'h')
        .replace(' hours', 'h')
        .replace(' day', 'd')
        .replace(' days', 'd');
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="chat-sidebar-container">
      <div className="sidebar-header-main">
        <div className="header-top">
           <h2>{activeTab === 'channels' ? 'Channels' : 'Messages'}</h2>
           <div className="chat-sidebar-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
             {activeTab === 'channels' && currentUser?.role === 'student' && (
               <button 
                 className="action-discover-btn" 
                 onClick={() => onAction('discover_channels')}
                 title="Discover Channels"
                 style={{
                   padding: '6px 12px',
                   borderRadius: '8px',
                   border: 'none',
                   background: 'rgba(59, 130, 246, 0.1)',
                   color: 'var(--primary-color, #3b82f6)',
                   fontSize: '0.85rem',
                   fontWeight: '600',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '6px',
                   transition: 'all 0.2s'
                 }}
               >
                 Discover
               </button>
             )}
             <button className="action-add-btn" onClick={() => onAction(activeTab)}>
               <FiPlus />
             </button>
           </div>
        </div>
        
        <div className="tab-switcher">
          <button 
            className={`tab-btn ${activeTab === 'channels' ? 'active' : ''}`}
            onClick={() => setActiveTab('channels')}
          >
            <FiMessageSquare />
            <span>Channels</span>
            {channels.some(c => c.unread_count > 0) && <span className="tab-dot" />}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'dms' ? 'active' : ''}`}
            onClick={() => setActiveTab('dms')}
          >
            <FiMessageCircle />
            <span>Direct Messages</span>
            {dms.some(d => d.unread_count > 0) && <span className="tab-dot" />}
          </button>
        </div>

        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="chat-items-list">
        {loading && currentItems.length === 0 ? (
          <div className="sidebar-loading">
            {[1, 2, 3].map(i => <div key={i} className="skeleton-item" />)}
          </div>
        ) : error ? (
          <div className="sidebar-error">
            <p>{error}</p>
            <button onClick={fetchData}>Retry</button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="sidebar-empty">
            <div className="empty-icon">
              {activeTab === 'channels' ? <FiHash /> : <FiUser />}
            </div>
            <p>{search ? 'No results found' : `No ${activeTab} yet`}</p>
            {!search && (
              <button className="empty-action-btn" onClick={() => onAction(activeTab)}>
                {activeTab === 'channels' ? 'Create Channel' : 'Find People'}
              </button>
            )}
          </div>
        ) : (
          filteredItems.map(item => (
            <div 
              key={`${item.type}-${item.id}`}
              className={`chat-card ${selectedId === item.id && selectedType === item.type ? 'active' : ''} ${item.unread_count > 0 ? 'unread' : ''}`}
              onClick={() => onSelectChat(item)}
            >
              <div className="chat-avatar">
                {item.type === 'channel' ? (
                  <div className={`avatar-initials ${item.is_encrypted ? 'encrypted' : ''}`}>
                    {item.is_encrypted ? <FiLock /> : <FiHash />}
                  </div>
                ) : (
                  <div className="user-avatar-wrapper">
                    {item.user?.avatar_url ? (
                      <img src={item.user.avatar_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="avatar-initials">
                        {item.name?.charAt(0).toUpperCase() || <FiUser />}
                      </div>
                    )}
                    <span className={`status-dot ${item.user?.status === 'online' ? 'online' : 'offline'}`} />
                  </div>
                )}
              </div>
              
              <div className="chat-info">
                <div className="chat-name-row">
                  <span className="chat-name">{item.name}</span>
                  <span className="chat-time">
                    {formatTime(item.last_message?.created_at)}
                  </span>
                </div>
                <div className="chat-last-row">
                  <p className="chat-last-msg">
                    {item.last_message?.content || 'No messages yet'}
                  </p>
                  {item.unread_count > 0 && (
                    <span className="unread-badge">{item.unread_count}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
