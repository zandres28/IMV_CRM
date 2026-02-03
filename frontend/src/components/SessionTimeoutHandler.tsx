import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/AuthService';
import { SystemSettingService } from '../services/SystemSettingService';

const SessionTimeoutHandler: React.FC = () => {
    const navigate = useNavigate();
    const [timeoutMinutes, setTimeoutMinutes] = useState<number>(5);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch timeout setting from backend
    useEffect(() => {
        const fetchTimeout = async () => {
            try {
                const setting = await SystemSettingService.getSetting('session_timeout_minutes');
                if (setting && setting.value) {
                    setTimeoutMinutes(parseInt(setting.value, 10));
                }
            } catch (error) {
                console.error("Error fetching session timeout setting", error);
                // Default to 5 if error
            }
        };
        
        // Only fetch if user is logged in
        if (AuthService.getCurrentUser()) {
            fetchTimeout();
        }
    }, []);

    const logout = useCallback(() => {
        if (AuthService.getCurrentUser()) {
            console.log("Session timed out due to inactivity");
            AuthService.logout();
            navigate('/login');
        }
    }, [navigate]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (AuthService.getCurrentUser()) {
            timerRef.current = setTimeout(logout, timeoutMinutes * 60 * 1000);
        }
    }, [logout, timeoutMinutes]);

    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
        
        const handleActivity = () => {
            resetTimer();
        };

        // Initialize timer
        resetTimer();

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [resetTimer]);

    return null; // This component doesn't render anything
};

export default SessionTimeoutHandler;
