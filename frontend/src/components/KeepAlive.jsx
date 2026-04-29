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
        const HEALTH_ENDPOINT = `${API_URL}/health`;

        // Function to perform the ping
        const pingBackend = async () => {
            try {
                // Use a simple fetch to avoid interceptor overhead if possible, 
                // but axios is fine too since we want to keep the whole pipeline warm
                await axios.get(HEALTH_ENDPOINT, { 
                    headers: { 'bypass-tunnel-reminder': 'true' },
                    timeout: 10000 
                });
                console.log('[KeepAlive] 💓 Backend pinged successfully at', new Date().toLocaleTimeString());
            } catch (error) {
                console.warn('[KeepAlive] ⚠️ Ping failed (Backend might be waking up):', error.message);
            }
        };

        // Initial ping on load
        pingBackend();

        // Set up interval (5 minutes = 300,000 ms)
        // Render usually spins down after 15 minutes of inactivity
        const intervalId = setInterval(pingBackend, 300000);

        return () => clearInterval(intervalId);
    }, []);

    return null; // This component doesn't render anything
};

export default KeepAlive;
