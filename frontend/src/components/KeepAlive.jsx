import { useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

/**
 * KeepAlive Component
 * Prevents Render.com and other free-tier hosting services from sleeping (spinning down)
 * by pinging the health endpoint every 5 minutes.
 */
const KeepAlive = () => {
    useEffect(() => {
        const API_URL = getApiUrl();
        const HEALTH_ENDPOINT = `${API_URL}/health`.replace('/api/health', '/health'); // Ensure root health
        const API_HEALTH = `${API_URL}/health`; // Standard /api/health

        // Function to perform the ping
        const pingBackend = async () => {
            try {
                // Use a longer timeout for Render cold starts
                await axios.get(HEALTH_ENDPOINT, { 
                    headers: { 'bypass-tunnel-reminder': 'true' },
                    timeout: 30000 // 30 seconds
                });
                console.log('[KeepAlive] 💓 Backend pinged successfully at', new Date().toLocaleTimeString());
            } catch (error) {
                console.warn('[KeepAlive] ⚠️ Ping failed (Backend might be waking up):', error.message);
            }
        };

        // Initial ping on load
        pingBackend();

        // Set up interval (1 minute = 60,000 ms) for maximum responsiveness on defense day
        const intervalId = setInterval(() => {
            pingBackend();
            // Also ping /api/health as a secondary path
            axios.get(API_HEALTH, { headers: { 'bypass-tunnel-reminder': 'true' }, timeout: 30000 }).catch(() => {});
        }, 60000);

        return () => clearInterval(intervalId);
    }, []);

    return null; // This component doesn't render anything
};

export default KeepAlive;
