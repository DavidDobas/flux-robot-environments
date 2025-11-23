import React, { useState, useRef, useEffect, useCallback } from 'react';
import UrdfViewer from '../components/UrdfViewer';

const RobotPage = () => {
    const [joints, setJoints] = useState({});
    const [wsConnected, setWsConnected] = useState(false);
    const [mockConnected, setMockConnected] = useState(false);
    const [wsStatus, setWsStatus] = useState('Disconnected');
    const [cameraPose, setCameraPose] = useState(null);
    const [sceneType, setSceneType] = useState('table');

    const urdfViewerRef = useRef(null);
    const jointValuesRef = useRef({});
    const wsRef = useRef(null);
    const mockIntervalRef = useRef(null);

    const handleJointChange = (name, value) => {
        const numValue = parseFloat(value);
        jointValuesRef.current[name] = numValue;

        if (urdfViewerRef.current) {
            const viewer = urdfViewerRef.current;
            // Use the viewer's setJointValue method
            if (viewer.setJointValue) {
                viewer.setJointValue(name, numValue);
            }
        }

        // Update the display value
        const displayElement = document.getElementById(`joint-value-${name}`);
        if (displayElement) {
            displayElement.textContent = numValue.toFixed(2);
        }
    };

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
        });
    }, [joints]);

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

    const startMockWebSocket = useCallback(() => {
        if (mockIntervalRef.current) {
            clearInterval(mockIntervalRef.current);
        }

        setMockConnected(true);
        setWsStatus('Mock Active');

        const fps = 30;
        const duration = 2000; // 2 seconds
        const startTime = Date.now();
        const minValue = -1;
        const maxValue = 1;

        mockIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = (elapsed % duration) / duration; // 0 to 1, repeating

            // Oscillate between -1 and 1
            const value = minValue + (maxValue - minValue) * progress;

            // Create mock action data matching the real WebSocket format
            const mockActions = {
                shoulder_pan: value,
            };

            updateJointsFromData(mockActions);
        }, 1000 / fps);
    }, [updateJointsFromData]);

    const stopMockWebSocket = useCallback(() => {
        if (mockIntervalRef.current) {
            clearInterval(mockIntervalRef.current);
            mockIntervalRef.current = null;
        }
        setMockConnected(false);
        setWsStatus('Disconnected');
    }, []);

    const onJointsLoaded = React.useCallback((loadedJoints) => {
        // Transform to a format easier for UI
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

    const lastPoseUpdateRef = useRef(0);
    const onCameraPoseChange = React.useCallback((pose) => {
        const now = Date.now();
        if (now - lastPoseUpdateRef.current > 200) {
            setCameraPose(pose);
            lastPoseUpdateRef.current = now;
        }
    }, []);

    const captureCamera = useCallback(() => {
        if (urdfViewerRef.current && urdfViewerRef.current.captureFromPose) {
            const fixedPose = {
                position: { x: 0.10, y: 0.49, z: -0.16 },
                rotation: { x: -1.57, y: -0.46, z: -1.58 }
            };
            urdfViewerRef.current.captureFromPose(fixedPose);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (mockIntervalRef.current) {
                clearInterval(mockIntervalRef.current);
            }
        };
    }, []);

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
            <div style={{ flex: 1, position: 'relative' }}>
                <UrdfViewer
                    ref={urdfViewerRef}
                    urdfPath="/robot/so101_new_calib.urdf"
                    onJointsLoaded={onJointsLoaded}
                    onCameraPoseChange={onCameraPoseChange}
                    sceneType={sceneType}
                />
            </div>
            <div style={{ width: '300px', padding: '20px', background: '#f5f5f5', overflowY: 'auto' }}>
                <h2>Joint Controls</h2>

                {/* Scene Selector */}
                <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>Scene Selection</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setSceneType('table')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: sceneType === 'table' ? '#2196F3' : '#e0e0e0',
                                color: sceneType === 'table' ? 'white' : '#666',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: sceneType === 'table' ? 'bold' : 'normal',
                                transition: 'all 0.3s'
                            }}
                        >
                            Table Scene
                        </button>
                        <button
                            onClick={() => setSceneType('moon')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: sceneType === 'moon' ? '#2196F3' : '#e0e0e0',
                                color: sceneType === 'moon' ? 'white' : '#666',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: sceneType === 'moon' ? 'bold' : 'normal',
                                transition: 'all 0.3s'
                            }}
                        >
                            Moon Scene
                        </button>
                    </div>
                </div>

                {/* WebSocket Controls */}
                <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>WebSocket Control</h3>
                    <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                        Status: <strong style={{ color: wsConnected ? '#4CAF50' : mockConnected ? '#FF9800' : '#666' }}>{wsStatus}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        {!wsConnected && !mockConnected && (
                            <>
                                <button
                                    onClick={connectWebSocket}
                                    style={{
                                        padding: '8px 12px',
                                        background: '#4CAF50',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Listen to WebSocket
                                </button>
                                <button
                                    onClick={startMockWebSocket}
                                    style={{
                                        padding: '8px 12px',
                                        background: '#FF9800',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    WebSocket Mock
                                </button>
                            </>
                        )}
                        {wsConnected && (
                            <button
                                onClick={disconnectWebSocket}
                                style={{
                                    padding: '8px 12px',
                                    background: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Disconnect
                            </button>
                        )}
                        {mockConnected && (
                            <button
                                onClick={stopMockWebSocket}
                                style={{
                                    padding: '8px 12px',
                                    background: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Stop Mock
                            </button>
                        )}
                    </div>
                </div>

                {/* Joint Sliders */}
                {Object.entries(joints).map(([name, data]) => (
                    <div key={name} style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>{name}</label>
                            <span id={`joint-value-${name}`} style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                {data.value.toFixed(2)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={data.min}
                            max={data.max}
                            step="0.01"
                            defaultValue={data.value}
                            data-joint={name}
                            onChange={(e) => handleJointChange(name, e.target.value)}
                            style={{ width: '100%' }}
                            disabled={wsConnected || mockConnected}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
                            <span>{Number(data.min).toFixed(2)}</span>
                            <span>{Number(data.max).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
                {Object.keys(joints).length === 0 && <p>Loading joints...</p>}

                {/* Camera Pose Display */}
                {cameraPose && (
                    <div style={{ marginTop: '20px', padding: '15px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>Camera Pose</h3>
                        <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Position:</strong>
                                <div style={{ paddingLeft: '10px' }}>
                                    <div>x: {cameraPose.position.x.toFixed(2)}</div>
                                    <div>y: {cameraPose.position.y.toFixed(2)}</div>
                                    <div>z: {cameraPose.position.z.toFixed(2)}</div>
                                </div>
                            </div>
                            <div>
                                <strong>Rotation:</strong>
                                <div style={{ paddingLeft: '10px' }}>
                                    <div>x: {cameraPose.rotation.x.toFixed(2)}</div>
                                    <div>y: {cameraPose.rotation.y.toFixed(2)}</div>
                                    <div>z: {cameraPose.rotation.z.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={captureCamera}
                            style={{
                                marginTop: '15px',
                                padding: '10px 16px',
                                background: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                width: '100%'
                            }}
                        >
                            Capture Camera
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RobotPage;
