import React, { useState, useEffect } from 'react';
import { channelsAPI } from '../../api/channels';
import { directMessagesAPI } from '../../api/directMessages';
import { FiHash, FiLock, FiUser, FiSearch, FiMessageSquare, FiPlus, FiMessageCircle } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import './ChatSidebar.css';

  const [dms, setDms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const fetchData = async () => {
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
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

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
           <button className="action-add-btn" onClick={() => onAction(activeTab)}>
             <FiPlus />
           </button>
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
