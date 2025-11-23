import React, { useState } from 'react';
import JointControls from './JointControls';

/**
 * Collapsible debug panel containing camera pose, joints, and capture button
 * @param {Object} props
 * @param {Object} props.cameraPose - Camera pose data
 * @param {Object} props.joints - Joint configuration
 * @param {Function} props.onJointChange - Joint change handler
 * @param {Function} props.onCapture - Single capture handler
 * @param {boolean} props.disabled - Whether controls are disabled
 */
const DebugPanel = ({ 
    cameraPose, 
    joints, 
    onJointChange, 
    onCapture, 
    disabled = false 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div style={{ 
            marginTop: 'auto',
            borderTop: '2px solid #e0e0e0',
            background: '#fafafa' 
        }}>
            {/* Collapsible Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: '#f5f5f5',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    color: '#333'
                }}
            >
                <span>Debug Panel</span>
                <span style={{ 
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                }}>
                    ▼
                </span>
            </button>

            {/* Collapsible Content */}
            {isExpanded && (
                <div style={{ 
                    padding: '20px',
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}>
                    {/* Camera Pose Display */}
                    {cameraPose && (
                        <div style={{ 
                            marginBottom: '20px', 
                            padding: '15px', 
                            background: '#fff', 
                            borderRadius: '8px', 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                        }}>
                            <h3 style={{ 
                                marginTop: 0, 
                                marginBottom: '10px', 
                                fontSize: '16px' 
                            }}>
                                Camera Pose
                            </h3>
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
                                onClick={onCapture}
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

                    {/* Joint Controls */}
                    <div style={{ 
                        padding: '15px', 
                        background: '#fff', 
                        borderRadius: '8px', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                    }}>
                        <h3 style={{ 
                            marginTop: 0, 
                            marginBottom: '15px', 
                            fontSize: '16px' 
                        }}>
                            Joint Controls
                        </h3>
                        <JointControls 
                            joints={joints}
                            onChange={onJointChange}
                            disabled={disabled}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebugPanel;

