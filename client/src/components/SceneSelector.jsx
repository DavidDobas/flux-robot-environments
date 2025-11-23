import React from 'react';

/**
 * Scene selector component for switching between table, moon, and cat scenes
 * @param {Object} props
 * @param {string} props.sceneType - Current scene type ('table', 'moon', or 'cat')
 * @param {Function} props.onChange - Callback when scene type changes
 */
const SceneSelector = ({ sceneType, onChange }) => {
    return (
        <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            background: '#fff', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>
                Scene Selection
            </h3>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    onClick={() => onChange('table')}
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
                    onClick={() => onChange('moon')}
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
                <button
                    onClick={() => onChange('cat')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: sceneType === 'cat' ? '#2196F3' : '#e0e0e0',
                        color: sceneType === 'cat' ? 'white' : '#666',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: sceneType === 'cat' ? 'bold' : 'normal',
                        transition: 'all 0.3s'
                    }}
                >
                    Cat Scene
                </button>
            </div>
        </div>
    );
};

export default SceneSelector;

