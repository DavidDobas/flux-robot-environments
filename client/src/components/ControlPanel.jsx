import React from 'react';

/**
 * Control panel for WebSocket connection and continuous capture
 * @param {Object} props
 * @param {boolean} props.wsConnected - WebSocket connection status
 * @param {string} props.wsStatus - WebSocket status text
 * @param {Function} props.onConnect - Callback to connect WebSocket
 * @param {Function} props.onDisconnect - Callback to disconnect WebSocket
 * @param {boolean} props.isCapturing - Continuous capture status
 * @param {Function} props.onStartCapture - Callback to start continuous capture
 * @param {Function} props.onStopCapture - Callback to stop continuous capture
 */
const ControlPanel = ({
    wsConnected,
    wsStatus,
    onConnect,
    onDisconnect,
    isCapturing,
    onStartCapture,
    onStopCapture
}) => {
    return (
        <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            background: '#fff', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>
                Control Panel
            </h3>

            {/* WebSocket Control */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    {!wsConnected ? (
                        <button
                            onClick={onConnect}
                            style={{
                                padding: '10px 16px',
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }}
                        >
                            Start Control
                        </button>
                    ) : (
                        <button
                            onClick={onDisconnect}
                            style={{
                                padding: '10px 16px',
                                background: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }}
                        >
                            Stop Control
                        </button>
                    )}
                    <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                        Status: <strong style={{ 
                            color: wsConnected ? '#4CAF50' : '#666' 
                        }}>{wsStatus}</strong>
                    </div>
                </div>
            </div>

            {/* Capture Control */}
            <div style={{ 
                borderTop: '1px solid #e0e0e0', 
                paddingTop: '15px' 
            }}>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    {!isCapturing ? (
                        <button
                            onClick={onStartCapture}
                            style={{
                                padding: '10px 16px',
                                background: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }}
                        >
                            Start Capture
                        </button>
                    ) : (
                        <button
                            onClick={onStopCapture}
                            style={{
                                padding: '10px 16px',
                                background: '#FF9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }}
                        >
                            Stop Capture
                        </button>
                    )}
                    <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                        Capturing: <strong style={{ 
                            color: isCapturing ? '#2196F3' : '#666' 
                        }}>{isCapturing ? 'Active (1/sec)' : 'Inactive'}</strong>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ControlPanel;


