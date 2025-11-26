import React from 'react';

/**
 * Controls for dataset generation
 * @param {Object} props
 * @param {string} props.generationState - Current generation state
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {number} props.currentlyProcessing - Current image being processed
 * @param {number} props.totalToProcess - Total images to process
 * @param {string} props.error - Error message if any
 * @param {Function} props.onGenerateDataset - Handler for initial dataset generation
 * @param {Function} props.onGenerateRest - Handler for batch generation
 * @param {Function} props.onReset - Handler to reset generation
 * @param {boolean} props.disabled - Whether controls are disabled
 */
const DatasetControls = ({
    generationState,
    progress,
    currentlyProcessing,
    totalToProcess,
    error,
    onGenerateDataset,
    onGenerateRest,
    onReset,
    disabled = false
}) => {
    const isFirstComplete = generationState === 'first-complete';
    const isBatchComplete = generationState === 'batch-complete';

    return (
        <div style={{
            padding: '20px',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px'
        }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
                Dataset Generation
            </h3>

            {/* Error Display */}
            {error && (
                <div style={{
                    padding: '12px',
                    background: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px',
                    marginBottom: '15px',
                    fontSize: '14px'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Initial State */}
            {generationState === 'idle' && (
                <div>
                    <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                        Generate realistic versions of your captured images using AI.
                    </p>
                    <button
                        onClick={onGenerateDataset}
                        disabled={disabled}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            background: disabled ? '#ccc' : '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            transition: 'background 0.3s'
                        }}
                        onMouseEnter={(e) => {
                            if (!disabled) e.target.style.background = '#45a049';
                        }}
                        onMouseLeave={(e) => {
                            if (!disabled) e.target.style.background = '#4CAF50';
                        }}
                    >
                        Generate Dataset
                    </button>
                </div>
            )}

            {/* Generating First Image */}
            {generationState === 'generating-first' && (
                <div>
                    <p style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }}>
                        Generating reference image...
                    </p>
                    <div style={{
                        width: '100%',
                        height: '8px',
                        background: '#e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginBottom: '10px'
                    }}>
                        <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #4CAF50, #45a049)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
                        {progress}%
                    </p>
                </div>
            )}

            {/* First Image Complete */}
            {isFirstComplete && (
                <div>
                    <div style={{
                        padding: '12px',
                        background: '#e8f5e9',
                        color: '#2e7d32',
                        borderRadius: '4px',
                        marginBottom: '15px',
                        fontSize: '14px'
                    }}>
                        ✓ Reference image generated successfully!
                    </div>
                    <button
                        onClick={onGenerateRest}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            background: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            marginBottom: '10px',
                            transition: 'background 0.3s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#1976D2'}
                        onMouseLeave={(e) => e.target.style.background = '#2196F3'}
                    >
                        Generate the Rest
                    </button>
                    <button
                        onClick={onReset}
                        style={{
                            width: '100%',
                            padding: '8px 16px',
                            background: 'transparent',
                            color: '#666',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#f5f5f5';
                            e.target.style.borderColor = '#999';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.borderColor = '#ddd';
                        }}
                    >
                        Reset
                    </button>
                </div>
            )}

            {/* Generating Batch */}
            {generationState === 'generating-batch' && (
                <div>
                    <p style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }}>
                        Generating remaining images... ({currentlyProcessing}/{totalToProcess})
                    </p>
                    <div style={{
                        width: '100%',
                        height: '8px',
                        background: '#e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginBottom: '10px'
                    }}>
                        <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #2196F3, #1976D2)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
                        {progress}%
                    </p>
                </div>
            )}

            {/* Batch Complete */}
            {isBatchComplete && (
                <div>
                    <div style={{
                        padding: '12px',
                        background: '#e8f5e9',
                        color: '#2e7d32',
                        borderRadius: '4px',
                        marginBottom: '15px',
                        fontSize: '14px'
                    }}>
                        ✓ All images generated successfully!
                    </div>
                    <button
                        onClick={onReset}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            background: '#FF9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            transition: 'background 0.3s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#F57C00'}
                        onMouseLeave={(e) => e.target.style.background = '#FF9800'}
                    >
                        Start New Generation
                    </button>
                </div>
            )}
        </div>
    );
};

export default DatasetControls;


