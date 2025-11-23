import React from 'react';

/**
 * Joint controls component for displaying and controlling robot joints
 * @param {Object} props
 * @param {Object} props.joints - Joint configuration object
 * @param {Function} props.onChange - Callback when joint value changes
 * @param {boolean} props.disabled - Whether controls are disabled
 */
const JointControls = ({ joints, onChange, disabled = false }) => {
    if (Object.keys(joints).length === 0) {
        return <p style={{ color: '#666', fontStyle: 'italic' }}>Loading joints...</p>;
    }

    return (
        <div>
            {Object.entries(joints).map(([name, data]) => (
                <div key={name} style={{ marginBottom: '15px' }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '5px' 
                    }}>
                        <label style={{ fontWeight: 'bold', fontSize: '14px' }}>
                            {name}
                        </label>
                        <span 
                            id={`joint-value-${name}`} 
                            style={{ fontSize: '12px', fontFamily: 'monospace' }}
                        >
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
                        onChange={(e) => onChange(name, e.target.value)}
                        style={{ width: '100%' }}
                        disabled={disabled}
                    />
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '10px', 
                        color: '#666' 
                    }}>
                        <span>{Number(data.min).toFixed(2)}</span>
                        <span>{Number(data.max).toFixed(2)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default JointControls;

