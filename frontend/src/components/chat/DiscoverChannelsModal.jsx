import React, { useState, useEffect } from 'react';
import { FiSearch, FiX, FiHash, FiBookOpen } from 'react-icons/fi';
import { channelsAPI } from '../../api/channels';
import './DiscoverChannelsModal.css';

const DiscoverChannelsModal = ({ isOpen, onClose, onSuccess }) => {
  const [search, setSearch] = useState('');
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchChannels();
    }
  }, [isOpen]);

  const fetchChannels = async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      const data = await channelsAPI.getAvailable(query);
      setChannels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch available channels', err);
      setError('Could not load channels.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isOpen) fetchChannels(search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, isOpen]);

  const handleJoin = async (channelId) => {
    try {
      await channelsAPI.joinChannel(channelId);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to join channel', err);
      setError(err.response?.data?.error || 'Failed to join channel');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="discover-modal-overlay" onClick={onClose}>
      <div className="discover-modal-content" onClick={e => e.stopPropagation()}>
        <div className="discover-modal-header">
          <h2>Discover Channels</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="discover-search-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search public and published course channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {error && <div className="discover-error">{error}</div>}

        <div className="discover-channels-list">
          {loading ? (
            <div className="discover-loading">Loading channels...</div>
          ) : channels.length === 0 ? (
            <div className="discover-empty">No available channels found.</div>
          ) : (
            channels.map(channel => (
              <div key={channel.id} className="discover-channel-card">
                <div className="channel-icon-wrapper">
                  {channel.type === 'course' ? <FiBookOpen /> : <FiHash />}
                </div>
                <div className="channel-details">
                  <h3>{channel.name}</h3>
                  {channel.description && <p>{channel.description}</p>}
                  {channel.type === 'course' && channel.course_code && (
                    <span className="course-code-badge">{channel.course_code}</span>
                  )}
                </div>
                <button 
                  className={`join-btn ${channel.is_member ? 'joined' : ''}`}
                  onClick={() => !channel.is_member && handleJoin(channel.id)}
                  disabled={channel.is_member}
                >
                  {channel.is_member ? 'Joined' : 'Join'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscoverChannelsModal;
