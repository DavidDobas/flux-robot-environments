import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing WebSocket connection and joint updates
 * @param {Object} joints - Joint configuration object
 * @param {Function} onJointUpdate - Callback to update joint values
 * @returns {Object} WebSocket state and control functions
 */
export const useWebSocket = (joints, onJointUpdate) => {
    const [wsConnected, setWsConnected] = useState(false);
    const [wsStatus, setWsStatus] = useState('Disconnected');
    const wsRef = useRef(null);

    const updateJointsFromData = useCallback((actions) => {
        // Update joints based on WebSocket data
        // Python sends values in -100 to 100 range (or 0 to 100 for gripper)
        // We need to rescale to the actual joint limits
        Object.entries(actions).forEach(([motorName, value]) => {
            // Get the joint info to know the limits
            const jointInfo = joints[motorName];

            let scaledValue = value;

            if (jointInfo) {
                // Rescale from -100 to 100 range to joint's min/max range
                // For gripper, assume 0-100 range
                const isGripper = motorName.includes('gripper');

                if (isGripper) {
                    // Gripper: 0 to 100 -> min to max
                    scaledValue = jointInfo.min + (value / 100) * (jointInfo.max - jointInfo.min);
                } else {
                    // Other joints: -100 to 100 -> min to max
                    scaledValue = jointInfo.min + ((value + 100) / 200) * (jointInfo.max - jointInfo.min);
                }
            } else {
                // If we don't have joint info yet, convert from degrees to radians as a fallback
                scaledValue = (value * Math.PI) / 180;
            }

            onJointUpdate(motorName, scaledValue);
        });
    }, [joints, onJointUpdate]);

    const connectWebSocket = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        setWsStatus('Connecting...');
        const ws = new WebSocket('ws://localhost:8765');

        ws.onopen = () => {
            console.log('WebSocket connected');
            setWsConnected(true);
            setWsStatus('Connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.actions) {
                    updateJointsFromData(data.actions);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setWsStatus('Error');
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setWsConnected(false);
            setWsStatus('Disconnected');
            wsRef.current = null;
        };

        wsRef.current = ws;
    }, [updateJointsFromData]);

    const disconnectWebSocket = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setWsConnected(false);
        setWsStatus('Disconnected');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return {
        wsConnected,
        wsStatus,
        connectWebSocket,
        disconnectWebSocket
    };
};

