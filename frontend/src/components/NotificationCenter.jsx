import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketProvider';
import { useAuthStore } from '../store/authStore';
import { FiMessageSquare, FiPhone, FiBell, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (socket && user) {
      const handleNewNotification = (data) => {
        // Don't show notification if user is the sender
        if (data.sender_id && String(data.sender_id) === String(user.id)) return;
        if (data.author_id && String(data.author_id) === String(user.id)) return;

        const id = Date.now();
        const newNotif = {
          id,
          title: data.channel_id ? 'New Channel Message' : 'New Direct Message',
          message: data.content || 'You have a new message',
          type: data.channel_id ? 'channel' : 'dm',
          icon: <FiMessageSquare />
        };

        setNotifications(prev => [...prev, newNotif]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
      };

      const handleIncomingCall = (data) => {
        const id = Date.now();
        const newNotif = {
          id,
          title: 'Incoming Call',
          message: `${data.caller_name || 'Someone'} is calling you`,
          type: 'call',
          icon: <FiPhone />,
          isPersistent: true,
          action: () => {
             window.location.href = `/meeting/${data.room_id}?call_type=${data.call_type || 'video'}`;
          }
        };

        setNotifications(prev => [...prev, newNotif]);
      };

      socket.on('message_received', handleNewNotification);
      socket.on('direct_message_received', handleNewNotification);
      socket.on('incoming_call', handleIncomingCall);

      return () => {
        socket.off('message_received', handleNewNotification);
        socket.off('direct_message_received', handleNewNotification);
        socket.off('incoming_call', handleIncomingCall);
      };
    }
  }, [socket, user]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="notification-center">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`notification-toast ${notif.type}`}
            onClick={notif.action}
          >
            <div className="notif-icon">{notif.icon}</div>
            <div className="notif-content">
              <h4>{notif.title}</h4>
              <p>{notif.message}</p>
            </div>
            <button className="notif-close" onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}>
              <FiX />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
