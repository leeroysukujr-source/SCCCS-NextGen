import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { presenceAPI } from '../api/presence'

export default function PresenceManager() {
    const { user } = useAuthStore()

    useEffect(() => {
        if (!user) return

        // Initial update
        presenceAPI.updatePresence({ status: 'online' }).catch(console.error)

        // Heartbeat every 30 seconds
        const interval = setInterval(() => {
            presenceAPI.updatePresence({ status: 'online' }).catch(console.error)
        }, 30000)

        // Update on visibility change (throttled)
        let lastVisibilityUpdate = 0;
        const handleVisibilityChange = () => {
            const now = Date.now();
            if (document.visibilityState === 'visible' && now - lastVisibilityUpdate > 5000) {
                lastVisibilityUpdate = now;
                presenceAPI.updatePresence({ status: 'online' }).catch(console.error);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [user])

    return null
}
