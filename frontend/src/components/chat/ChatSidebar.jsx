import React, { useState, useEffect } from 'react';
import { channelsAPI } from '../../api/channels';
import { directMessagesAPI } from '../../api/directMessages';
import { FiHash, FiLock, FiUser, FiSearch } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import './ChatSidebar.css';

const ChatSidebar = ({ onSelectChat, selectedId, selectedType }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const [channelsData, conversationsData] = await Promise.all([
        channelsAPI.getChannels(),
        directMessagesAPI.getConversations()
      ]);

      const unified = [
        ...(Array.isArray(channelsData) ? channelsData : []).map(c => ({ 
          ...c, 
          type: 'channel', 
          id: c.id, 
          name: c.name,
          last_message: c.last_message,
          unread_count: c.unread_count || 0
        })),
        ...(Array.isArray(conversationsData) ? conversationsData : []).map(conv => ({ 
          ...conv, 
          type: 'dm', 
          id: conv.user_id, 
          name: conv.user?.first_name || conv.user?.username,
          last_message: conv.last_message,
          user: conv.user,
          unread_count: conv.unread_count || 0
        }))
      ];

      unified.sort((a, b) => {
        const timeA = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
        const timeB = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
        return timeB - timeA;
      });

      setItems(unified);
    } catch (err) {
      console.error('Failed to fetch chat list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredItems = items.filter(item => 
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
      <div className="sidebar-search-header">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search messages..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="chat-items-list">
        {loading && items.length === 0 ? (
          <div className="sidebar-loading">
            <div className="skeleton-item" />
            <div className="skeleton-item" />
            <div className="skeleton-item" />
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
                  <div className={`avatar-initials bg-gradient`}>
                    {item.is_encrypted ? <FiLock /> : <FiHash />}
                  </div>
                ) : (
                  <div className="user-avatar-wrapper">
                    {item.user?.avatar_url ? (
                      <img src={item.user.avatar_url} alt={item.name} className="avatar-img" />
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
