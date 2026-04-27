import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';

const MeetingContext = createContext();

export const MeetingProvider = ({ children }) => {
    const [activeMeeting, setActiveMeeting] = useState(null); // { roomId, token, url, name, isMinimized, roomInfo }
    const { user } = useAuthStore();

    const joinMeeting = useCallback(async (roomId, guestName = '') => {
        try {
            const res = await apiClient.post('/meeting-livekit/token', { 
                room_id: roomId, 
                guest_name: guestName || user?.full_name || user?.username || 'Guest'
            });

            const { token, url } = res.data;
            const roomInfoRes = await apiClient.get(`/rooms/${roomId}`);
            
            setActiveMeeting({
                roomId,
                token,
                url,
                name: roomInfoRes.data.name,
                roomInfo: roomInfoRes.data,
                isMinimized: false
            });
            
            return true;
        } catch (error) {
            console.error('Failed to join meeting:', error);
            return false;
        }
    }, [user]);

    const leaveMeeting = useCallback(() => {
        setActiveMeeting(null);
    }, []);

    const setMinimized = useCallback((isMinimized) => {
        setActiveMeeting(prev => prev ? { ...prev, isMinimized } : null);
    }, []);

    const updateMeetingInfo = useCallback((updates) => {
        setActiveMeeting(prev => prev ? { ...prev, ...updates } : updates);
    }, []);

    return (
        <MeetingContext.Provider value={{
            activeMeeting,
            joinMeeting,
            leaveMeeting,
            setMinimized,
            updateMeetingInfo
        }}>
            {children}
        </MeetingContext.Provider>
    );
};

export const useMeeting = () => {
    const context = useContext(MeetingContext);
    if (!context) {
        throw new Error('useMeeting must be used within a MeetingProvider');
    }
    return context;
};
