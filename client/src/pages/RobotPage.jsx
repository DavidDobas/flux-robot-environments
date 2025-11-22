import React, { useState, useRef } from 'react';
import UrdfViewer from '../components/UrdfViewer';

const RobotPage = () => {
    const [joints, setJoints] = useState({});
    const urdfViewerRef = useRef(null);
    const jointValuesRef = useRef({});

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

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
            <div style={{ flex: 1, position: 'relative' }}>
                <UrdfViewer
                    ref={urdfViewerRef}
                    urdfPath="/robot/so101_new_calib.urdf"
                    onJointsLoaded={onJointsLoaded}
                />
            </div>
            <div style={{ width: '300px', padding: '20px', background: '#f5f5f5', overflowY: 'auto' }}>
                <h2>Joint Controls</h2>
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
                            onChange={(e) => handleJointChange(name, e.target.value)}
                            style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
                            <span>{Number(data.min).toFixed(2)}</span>
                            <span>{Number(data.max).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
                {Object.keys(joints).length === 0 && <p>Loading joints...</p>}
            </div>
        </div>
    );
};

export default RobotPage;
