import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { channelsAPI } from '../../api/channels';
import { directMessagesAPI } from '../../api/directMessages';
import { useSocket } from '../../contexts/SocketProvider';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { FiHash, FiLock, FiUser, FiSearch, FiMessageSquare, FiPlus, FiMessageCircle } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import './ChatSidebar.css';

const ChatSidebar = ({ onSelectChat, selectedId, selectedType, onAction }) => {
  const { user: currentUser } = useAuthStore();
  const { fetchUnreadCounts } = useChatStore();
  const { socket, status } = useSocket();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(window.location.pathname.includes('direct-messages') ? 'dms' : 'channels'); 
  const [search, setSearch] = useState('');
  
  // Use React Query for Channels
  const { data: channels = [], isLoading: channelsLoading, error: channelsError } = useQuery({
    queryKey: ['chat', 'channels'],
    queryFn: async () => {
      const data = await channelsAPI.getChannels();
      return (Array.isArray(data) ? data : []).map(c => ({ 
        ...c, 
        type: 'channel', 
        id: c.id, 
        name: c.name,
        last_message: c.last_message,
        unread_count: c.unread_count || 0
      }));
    },
    staleTime: 60000, 
    refetchInterval: 300000, 
  });

  // Use React Query for DMs
  const { data: dms = [], isLoading: dmsLoading, error: dmsError } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: async () => {
      const data = await directMessagesAPI.getConversations();
      return (Array.isArray(data) ? data : []).map(conv => ({ 
        ...conv, 
        type: 'dm', 
        id: conv.user_id, 
        name: conv.user?.first_name || conv.user?.username || 'Unknown User',
        last_message: conv.last_message,
        user: conv.user,
        unread_count: conv.unread_count || 0
      }));
    },
    staleTime: 60000,
    refetchInterval: 300000,
  });

  const loading = channelsLoading || dmsLoading;
  const error = channelsError || dmsError ? 'Could not load chats.' : null;

  // Real-time Socket Listeners for Sidebar Updates
  useEffect(() => {
    if (socket) {
      const handleSocketMessage = (msg) => {
        console.log('[ChatSidebar] Real-time message received, invalidating queries:', msg);
        // Simply invalidate the queries to trigger a background refetch
        if (msg.channel_id) {
          queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
        } else {
          queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
        }
      };

      socket.on('message_received', handleSocketMessage);
      socket.on('direct_message_received', handleSocketMessage);
      
      // Update global counts when messages arrive
      socket.on('message_received', fetchUnreadCounts);
      socket.on('direct_message_received', fetchUnreadCounts);

      return () => {
        socket.off('message_received', handleSocketMessage);
        socket.off('direct_message_received', handleSocketMessage);
        socket.off('message_received', fetchUnreadCounts);
        socket.off('direct_message_received', fetchUnreadCounts);
      };
    }
  }, [socket, selectedId, selectedType, currentUser?.id, fetchUnreadCounts]);

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
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <h2>{activeTab === 'channels' ? 'Channels' : 'Messages'}</h2>
             <div 
               title={`Real-time Status: ${status}`}
               style={{ 
                 width: '8px', 
                 height: '8px', 
                 borderRadius: '50%', 
                 backgroundColor: status === 'connected' ? '#10b981' : status === 'connecting' ? '#f59e0b' : '#ef4444',
                 boxShadow: status === 'connected' ? '0 0 8px #10b981' : 'none'
               }} 
             />
           </div>
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
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ['chat'] })}>Retry</button>
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
