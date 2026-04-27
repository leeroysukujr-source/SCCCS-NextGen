import { create } from 'zustand'
import { channelsAPI } from '../api/channels'
import { directMessagesAPI } from '../api/directMessages'
import { roomsAPI } from '../api/rooms'
import { socket } from '../api/socket'

export const useChatStore = create((set, get) => ({
    unreadChannels: 0,
    unreadDMs: 0,
    activeRooms: [],
    loading: false,

    fetchUnreadCounts: async () => {
        try {
            const [channels, conversations] = await Promise.all([
                channelsAPI.getChannels().catch(() => []),
                directMessagesAPI.getConversations().catch(() => [])
            ]);

            const unreadChannels = channels.reduce((acc, c) => acc + (c.unread_count || 0), 0);
            const unreadDMs = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

            set({ unreadChannels, unreadDMs });
        } catch (err) {
            console.error('Failed to fetch unread counts:', err);
        }
    },

    fetchActiveRooms: async () => {
        try {
            const rooms = await roomsAPI.getRooms().catch(() => []);
            // Assuming active rooms have participants or an is_active flag
            const activeRooms = rooms.filter(r => r.is_active || (r.participants && r.participants.length > 0));
            set({ activeRooms });
        } catch (err) {
            console.error('Failed to fetch active rooms:', err);
        }
    },

    updateCounts: (type, change) => {
        if (type === 'channel') {
            set(state => ({ unreadChannels: Math.max(0, state.unreadChannels + change) }));
        } else if (type === 'dm') {
            set(state => ({ unreadDMs: Math.max(0, state.unreadDMs + change) }));
        }
    },

    initSocketListeners: () => {
        if (!socket) return;

        // Cleanup existing listeners if re-initialized
        socket.off('message_received');
        socket.off('direct_message_received');
        socket.off('room_started');
        socket.off('room_ended');
        socket.off('participant_joined');
        socket.off('participant_left');

        socket.on('message_received', () => {
            get().fetchUnreadCounts();
        });

        socket.on('direct_message_received', () => {
            get().fetchUnreadCounts();
        });

        socket.on('room_started', () => {
            get().fetchActiveRooms();
        });

        socket.on('room_ended', () => {
            get().fetchActiveRooms();
        });
        
        socket.on('participant_joined', () => {
            get().fetchActiveRooms();
        });

        socket.on('participant_left', () => {
            get().fetchActiveRooms();
        });
    }
}))
