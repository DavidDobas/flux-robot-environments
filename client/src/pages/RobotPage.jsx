import React, { useState, useRef, useCallback } from 'react';
import UrdfViewer from '../components/UrdfViewer';
import SceneSelector from '../components/SceneSelector';
import ControlPanel from '../components/ControlPanel';
import DebugPanel from '../components/DebugPanel';
import { useWebSocket } from '../hooks/useWebSocket';

const RobotPage = () => {
    const [joints, setJoints] = useState({});
    const [cameraPose, setCameraPose] = useState(null);
    const [sceneType, setSceneType] = useState('table');
    const [isCapturing, setIsCapturing] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    const urdfViewerRef = useRef(null);
    const jointValuesRef = useRef({});
    const captureIntervalRef = useRef(null);
    const lastPoseUpdateRef = useRef(0);

    // Fixed camera pose for captures
    const fixedCameraPose = {
        position: { x: 0.10, y: 0.49, z: -0.16 },
        rotation: { x: -1.57, y: -0.46, z: -1.58 }
    };

    // Joint update handler
    const handleJointUpdate = useCallback((motorName, scaledValue) => {
        jointValuesRef.current[motorName] = scaledValue;

        if (urdfViewerRef.current && urdfViewerRef.current.setJointValue) {
            urdfViewerRef.current.setJointValue(motorName, scaledValue);
        }

        // Update display value
        const displayElement = document.getElementById(`joint-value-${motorName}`);
        if (displayElement) {
            displayElement.textContent = scaledValue.toFixed(2);
        }

        // Update slider if it exists
        const slider = document.querySelector(`input[type="range"][data-joint="${motorName}"]`);
        if (slider) {
            slider.value = scaledValue;
        }
    }, []);

    // WebSocket hook
    const { wsConnected, wsStatus, connectWebSocket, disconnectWebSocket } = 
        useWebSocket(joints, handleJointUpdate);

    // Manual joint change handler
    const handleJointChange = (name, value) => {
        const numValue = parseFloat(value);
        handleJointUpdate(name, numValue);
    };

    // Joints loaded handler
    const onJointsLoaded = useCallback((loadedJoints) => {
        const jointsData = {};
        Object.entries(loadedJoints).forEach(([name, joint]) => {
            if (joint._jointType !== 'fixed') {
                const initialValue = joint.jointValue?.[0] || 0;
                jointsData[name] = {
                    min: joint.limit.lower,
                    max: joint.limit.upper,
                    value: initialValue,
                    type: joint._jointType
                };
                jointValuesRef.current[name] = initialValue;
            }
        });
        setJoints(jointsData);
    }, []);

    // Camera pose change handler (throttled)
    const onCameraPoseChange = useCallback((pose) => {
        const now = Date.now();
        if (now - lastPoseUpdateRef.current > 200) {
            setCameraPose(pose);
            lastPoseUpdateRef.current = now;
        }
    }, []);

    // Generate session ID based on current datetime
    const generateSessionId = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `session-${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
    };

    // Single capture handler
    const captureCamera = useCallback(() => {
        if (urdfViewerRef.current && urdfViewerRef.current.captureFromPose) {
            // Create a new session for single capture
            const sessionId = generateSessionId();
            urdfViewerRef.current.captureFromPose(fixedCameraPose, sceneType, sessionId);
        }
    }, [sceneType]);

    // Start continuous capture
    const startCapture = useCallback(() => {
        if (captureIntervalRef.current) return; // Already capturing

        // Create a new session for this capture sequence
        const sessionId = generateSessionId();
        setCurrentSessionId(sessionId);
        setIsCapturing(true);
        
        // Capture immediately
        if (urdfViewerRef.current && urdfViewerRef.current.captureFromPose) {
            urdfViewerRef.current.captureFromPose(fixedCameraPose, sceneType, sessionId);
        }

        // Then capture every 1 second
        captureIntervalRef.current = setInterval(() => {
            if (urdfViewerRef.current && urdfViewerRef.current.captureFromPose) {
                urdfViewerRef.current.captureFromPose(fixedCameraPose, sceneType, sessionId);
            }
        }, 1000);
    }, [sceneType]);

    // Stop continuous capture
    const stopCapture = useCallback(() => {
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }
        setIsCapturing(false);
        setCurrentSessionId(null);
    }, []);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (captureIntervalRef.current) {
                clearInterval(captureIntervalRef.current);
            }
        };
    }, []);

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
            {/* 3D Viewer */}
            <div style={{ flex: 1, position: 'relative' }}>
                <UrdfViewer
                    ref={urdfViewerRef}
                    urdfPath="/robot/so101_new_calib.urdf"
                    onJointsLoaded={onJointsLoaded}
                    onCameraPoseChange={onCameraPoseChange}
                    sceneType={sceneType}
                />
            </div>

            {/* Control Sidebar */}
            <div style={{ 
                width: '300px', 
                background: '#f5f5f5', 
                display: 'flex',
                flexDirection: 'column',
                height: '100vh'
            }}>
                <div style={{ 
                    padding: '20px', 
                    overflowY: 'auto',
                    flex: '0 1 auto'
                }}>
                    <h2 style={{ marginTop: 0 }}>Robot Control</h2>

                    {/* Scene Selector */}
                    <SceneSelector 
                        sceneType={sceneType} 
                        onChange={setSceneType} 
                    />

                    {/* Control Panel */}
                    <ControlPanel
                        wsConnected={wsConnected}
                        wsStatus={wsStatus}
                        onConnect={connectWebSocket}
                        onDisconnect={disconnectWebSocket}
                        isCapturing={isCapturing}
                        onStartCapture={startCapture}
                        onStopCapture={stopCapture}
                    />
                </div>

                {/* Debug Panel (at bottom, collapsible) */}
                <DebugPanel
                    cameraPose={cameraPose}
                    joints={joints}
                    onJointChange={handleJointChange}
                    onCapture={captureCamera}
                    disabled={wsConnected}
                />
            </div>
        </div>
    );
};

export default RobotPage;
