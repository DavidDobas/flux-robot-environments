import React, { useState, useEffect } from 'react';
import DatasetControls from '../components/DatasetControls';
import { useDatasetGeneration } from '../hooks/useDatasetGeneration';

const CapturesPage = () => {
    const [selectedScene, setSelectedScene] = useState('table');
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [captures, setCaptures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);


    // Dataset generation hook
    const {
        generationState,
        generatedImages,
        progress,
        currentlyProcessing,
        totalToProcess,
        error: generationError,
        currentGenerationId,
        availableGenerations,
        currentPrompts,
        firstImagePrompt,
        setFirstImagePrompt,
        batchImagePrompt,
        setBatchImagePrompt,
        generateFirstImage,
        generateBatchImages,
        listGenerations,
        loadGenerationById,
        startNewGeneration,
        reset
    } = useDatasetGeneration(selectedSession, selectedScene);
    
    // State for showing used prompts (for completed generations)
    const [showCurrentPrompts, setShowCurrentPrompts] = useState(false);

    // Fetch sessions when scene changes
    useEffect(() => {
        const fetchSessions = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const response = await fetch(`http://localhost:3000/sessions/${selectedScene}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch sessions');
                }
                const data = await response.json();
                setSessions(data.sessions || []);
                
                // Auto-select the first session if available
                if (data.sessions && data.sessions.length > 0) {
                    setSelectedSession(data.sessions[0].sessionId);
                } else {
                    setSelectedSession(null);
                    setCaptures([]);
                }
            } catch (err) {
                console.error('Error fetching sessions:', err);
                setError(err.message);
                setSessions([]);
                setSelectedSession(null);
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();
        // Reset generation when scene changes
        reset();
    }, [selectedScene, reset]);

    // Fetch captures when session changes
    useEffect(() => {
        if (!selectedSession) {
            setCaptures([]);
            return;
        }

        const fetchCaptures = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const response = await fetch(`http://localhost:3000/sessions/${selectedScene}/${selectedSession}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch captures');
                }
                const data = await response.json();
                setCaptures(data.captures || []);
            } catch (err) {
                console.error('Error fetching captures:', err);
                setError(err.message);
                setCaptures([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCaptures();
        // Reset generation when session changes
        reset();
    }, [selectedScene, selectedSession, reset]);

    // Format session datetime for display
    const formatSessionDateTime = (sessionId) => {
        const parts = sessionId.replace('session-', '').split('-');
        if (parts.length === 6) {
            const [year, month, day, hours, minutes, seconds] = parts;
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
        return sessionId;
    };

    // Get session info for display
    const getSessionInfo = () => {
        const session = sessions.find(s => s.sessionId === selectedSession);
        if (!session) return null;
        return session;
    };

    const sessionInfo = getSessionInfo();

    // Format generation datetime for display
    const formatGenerationDateTime = (generationId) => {
        // generationId format: gen-YYYY-MM-DD-HH-MM-SS
        const parts = generationId.replace('gen-', '').split('-');
        if (parts.length === 6) {
            const [year, month, day, hours, minutes, seconds] = parts;
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
        return generationId;
    };

    // Handler for generation selection change
    const handleGenerationChange = async (generationId) => {
        console.log(`🔄 Generation dropdown changed to: ${generationId}`);
        if (generationId === 'new') {
            console.log('📝 New generation selected from dropdown');
            startNewGeneration();
        } else {
            console.log(`📂 Loading generation: ${generationId}`);
            await loadGenerationById(generationId);
        }
    };

    // Handler for starting a new generation (triggered by button)
    const handleStartNewGeneration = async () => {
        console.log('🔘 Start New Generation button clicked');
        startNewGeneration();
        // Refresh the generations list but don't auto-select
        console.log('📋 Refreshing generations list (no auto-select)...');
        await listGenerations(false); // Pass false to prevent auto-selecting
        console.log('✅ Ready for new generation!');
    };

    // Load generations when session changes or page loads (only once, with auto-select)
    useEffect(() => {
        if (selectedSession) {
            console.log('📋 Session changed - fetching generations with auto-select');
            listGenerations(true); // Force auto-select on initial load
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSession, selectedScene]); // Only run when session/scene changes, not when listGenerations changes

    // Handler for generating dataset
    const handleGenerateDataset = async () => {
        if (captures.length === 0) return;
        
        console.log('🎯 Generate Dataset clicked');
        const firstCaptureUrl = `http://localhost:3000/captures/${captures[0].path}`;
        await generateFirstImage(firstCaptureUrl);
        // Refresh generations list after creating first image (without auto-select, keep current)
        console.log('📋 Refreshing generations list after first image...');
        await listGenerations(false);
    };

    // Handler for generating remaining images
    const handleGenerateRest = async () => {
        if (captures.length <= 1) return;
        
        console.log('🎯 Generate the Rest clicked');
        const captureUrls = captures.map(c => `http://localhost:3000/captures/${c.path}`);
        await generateBatchImages(captureUrls);
        // Refresh generations list after batch completion (without auto-select, keep current)
        console.log('📋 Refreshing generations list after batch completion...');
        await listGenerations(false);
    };

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            height: '100vh', 
            width: '100vw',
            background: '#f5f5f5'
        }}>
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            maxWidth: '1000px',
            background: '#f5f5f5'
        }}>
            {/* Fixed Header - Scene Tabs Only */}
            <div style={{ 
                padding: '20px',
                borderBottom: '2px solid #e0e0e0',
                background: '#fff'
            }}>
                <h1 style={{ marginTop: 0, marginBottom: '20px' }}>
                    Dataset Generation
                </h1>
                
                {/* Scene Tabs */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setSelectedScene('table')}
                        style={{
                            flex: 1,
                            padding: '12px 20px',
                            background: selectedScene === 'table' ? '#2196F3' : '#e0e0e0',
                            color: selectedScene === 'table' ? 'white' : '#666',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: selectedScene === 'table' ? 'bold' : 'normal',
                            fontSize: '16px',
                            transition: 'all 0.3s'
                        }}
                    >
                        Table Scene
                    </button>
                    <button
                        onClick={() => setSelectedScene('moon')}
                        style={{
                            flex: 1,
                            padding: '12px 20px',
                            background: selectedScene === 'moon' ? '#2196F3' : '#e0e0e0',
                            color: selectedScene === 'moon' ? 'white' : '#666',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: selectedScene === 'moon' ? 'bold' : 'normal',
                            fontSize: '16px',
                            transition: 'all 0.3s'
                        }}
                    >
                        Moon Scene
                    </button>
                    <button
                        onClick={() => setSelectedScene('cat')}
                        style={{
                            flex: 1,
                            padding: '12px 20px',
                            background: selectedScene === 'cat' ? '#2196F3' : '#e0e0e0',
                            color: selectedScene === 'cat' ? 'white' : '#666',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: selectedScene === 'cat' ? 'bold' : 'normal',
                            fontSize: '16px',
                            transition: 'all 0.3s'
                        }}
                    >
                        Cat Scene
                    </button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto',
                background: '#fafafa'
            }}>
                {/* Session Selection and Controls */}
                <div style={{
                    padding: '20px',
                    background: '#fff',
                    borderBottom: '2px solid #e0e0e0'
                }}>
                    {/* Session Dropdown */}
                    {sessions.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                color: '#333'
                            }}>
                                Select Session:
                            </label>
                            <select
                                value={selectedSession || ''}
                                onChange={(e) => setSelectedSession(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    fontSize: '14px',
                                    border: '2px solid #e0e0e0',
                                    borderRadius: '4px',
                                    background: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                {sessions.map((session) => (
                                    <option key={session.sessionId} value={session.sessionId}>
                                        {formatSessionDateTime(session.sessionId)} - {session.captureCount} captures
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Generation Selector - Always show if session is selected */}
                    {selectedSession && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                color: '#333'
                            }}>
                                Select Generation:
                            </label>
                            <select
                                value={currentGenerationId || 'new'}
                                onChange={(e) => handleGenerationChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    fontSize: '14px',
                                    border: '2px solid #e0e0e0',
                                    borderRadius: '4px',
                                    background: currentGenerationId ? '#fff' : '#fffbea',
                                    cursor: 'pointer',
                                    fontWeight: currentGenerationId ? 'normal' : 'bold',
                                    color: currentGenerationId ? '#333' : '#d97706'
                                }}
                            >
                                <option value="new">+ Start New Generation</option>
                                {availableGenerations.map((gen) => (
                                    <option key={gen.generationId} value={gen.generationId}>
                                        {formatGenerationDateTime(gen.generationId)} - {gen.imageCount} images
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Prompt Editors - Shown inline based on state */}
                    {generationState === 'idle' && (
                        <div style={{ marginTop: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                color: '#333'
                            }}>
                                First Image Prompt:
                            </label>
                            <textarea
                                value={firstImagePrompt}
                                onChange={(e) => setFirstImagePrompt(e.target.value)}
                                placeholder="Prompt for generating the first reference image..."
                                style={{
                                    width: '100%',
                                    minHeight: '80px',
                                    padding: '10px',
                                    fontSize: '13px',
                                    border: '2px solid #e0e0e0',
                                    borderRadius: '4px',
                                    fontFamily: 'monospace',
                                    resize: 'vertical',
                                    marginBottom: '15px'
                                }}
                            />
                        </div>
                    )}

                    {generationState === 'first-complete' && (
                        <div style={{ marginTop: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                color: '#333'
                            }}>
                                Batch Images Prompt:
                            </label>
                            <textarea
                                value={batchImagePrompt}
                                onChange={(e) => setBatchImagePrompt(e.target.value)}
                                placeholder="Prompt for applying style to remaining images..."
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    padding: '10px',
                                    fontSize: '13px',
                                    border: '2px solid #e0e0e0',
                                    borderRadius: '4px',
                                    fontFamily: 'monospace',
                                    resize: 'vertical',
                                    marginBottom: '15px'
                                }}
                            />
                        </div>
                    )}

                    {/* Session Info and Controls */}
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                        {sessionInfo && (
                            <div style={{
                                flex: 1,
                                padding: '12px',
                                background: '#e3f2fd',
                                borderRadius: '4px',
                                fontSize: '13px',
                                color: '#1976d2'
                            }}>
                                <strong>Session:</strong> {formatSessionDateTime(sessionInfo.sessionId)}
                                <br />
                                <strong>Captures:</strong> {sessionInfo.captureCount}
                            </div>
                        )}
                        
                        <div style={{ flex: 1 }}>
                        <DatasetControls
                            generationState={generationState}
                            progress={progress}
                            currentlyProcessing={currentlyProcessing}
                            totalToProcess={totalToProcess}
                            error={generationError}
                            onGenerateDataset={handleGenerateDataset}
                            onGenerateRest={handleGenerateRest}
                            onReset={handleStartNewGeneration}
                            disabled={captures.length === 0}
                        />
                        </div>
                    </div>

                    {/* Show Prompts for Current Generation - Only for completed generations */}
                    {currentPrompts && (generationState === 'first-complete' || generationState === 'batch-complete') && (
                        <div style={{ marginTop: '20px' }}>
                            <button
                                onClick={() => setShowCurrentPrompts(!showCurrentPrompts)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: '#e8f5e9',
                                    border: '1px solid #4CAF50',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    color: '#2e7d32'
                                }}
                            >
                                <span>📝 View Used Prompts</span>
                                <span>{showCurrentPrompts ? '▼' : '▶'}</span>
                            </button>
                            
                            {showCurrentPrompts && (
                                <div style={{
                                    marginTop: '10px',
                                    padding: '15px',
                                    background: '#f1f8e9',
                                    border: '1px solid #8BC34A',
                                    borderRadius: '4px'
                                }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{
                                            fontWeight: 'bold',
                                            fontSize: '13px',
                                            color: '#558B2F',
                                            marginBottom: '5px'
                                        }}>
                                            First Image Prompt:
                                        </div>
                                        <div style={{
                                            padding: '10px',
                                            background: '#fff',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            color: '#333'
                                        }}>
                                            {currentPrompts.firstImage}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div style={{
                                            fontWeight: 'bold',
                                            fontSize: '13px',
                                            color: '#558B2F',
                                            marginBottom: '5px'
                                        }}>
                                            Batch Images Prompt:
                                        </div>
                                        <div style={{
                                            padding: '10px',
                                            background: '#fff',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            color: '#333'
                                        }}>
                                            {currentPrompts.batchImages}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Image Pairs */}
                <div style={{ padding: '20px' }}>
                {loading && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        Loading...
                    </div>
                )}

                {error && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#f44336' }}>
                        Error: {error}
                    </div>
                )}

                {!loading && !error && captures.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        No captures found. Start capturing on the Robot page.
                    </div>
                )}

                {!loading && !error && captures.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {captures.map((capture, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    gap: '20px',
                                    background: '#fff',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            >
                                {/* Original Capture */}
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        padding: '10px',
                                        background: '#f5f5f5',
                                        borderBottom: '2px solid #e0e0e0',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        marginBottom: '10px',
                                        borderRadius: '4px'
                                    }}>
                                        Original #{index + 1}
                                    </div>
                                    <img
                                        src={`http://localhost:3000/captures/${capture.path}`}
                                        alt={capture.filename}
                                        style={{
                                            width: '100%',
                                            display: 'block',
                                            borderRadius: '4px',
                                            border: '2px solid #e0e0e0'
                                        }}
                                    />
                                </div>

                                {/* Generated Image */}
                                <div style={{ flex: 1 }}>
                                    {generatedImages[index] ? (
                                        <>
                                            <div style={{
                                                padding: '10px',
                                                background: '#e8f5e9',
                                                borderBottom: '2px solid #4CAF50',
                                                fontWeight: 'bold',
                                                fontSize: '14px',
                                                color: '#2e7d32',
                                                marginBottom: '10px',
                                                borderRadius: '4px'
                                            }}>
                                                Generated #{index + 1}
                                            </div>
                                            <img
                                                src={generatedImages[index]}
                                                alt={`Generated ${index + 1}`}
                                                style={{
                                                    width: '100%',
                                                    display: 'block',
                                                    borderRadius: '4px',
                                                    border: '2px solid #4CAF50'
                                                }}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            {/* Determine the state of this image */}
                                            {(() => {
                                                const isFirstImage = index === 0;
                                                const isGeneratingFirst = generationState === 'generating-first';
                                                const isGeneratingBatch = generationState === 'generating-batch';
                                                
                                                // Show "Loading..." if:
                                                // - It's the first image and we're generating it
                                                // - We're in batch mode (all are loading in parallel)
                                                const isLoading = (isFirstImage && isGeneratingFirst) || isGeneratingBatch;
                                                
                                                if (isLoading) {
                                                    return (
                                                        <>
                                                            <div style={{
                                                                padding: '10px',
                                                                background: '#fff3e0',
                                                                borderBottom: '2px solid #FF9800',
                                                                fontWeight: 'bold',
                                                                fontSize: '14px',
                                                                color: '#e65100',
                                                                marginBottom: '10px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                Loading...
                                                            </div>
                                                            <div style={{
                                                                width: '100%',
                                                                aspectRatio: '16/9',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexDirection: 'column',
                                                                gap: '10px',
                                                                background: '#fff3e0',
                                                                borderRadius: '4px',
                                                                border: '2px solid #FF9800',
                                                                color: '#e65100',
                                                                fontSize: '14px'
                                                            }}>
                                                                <div style={{
                                                                    width: '40px',
                                                                    height: '40px',
                                                                    border: '4px solid #ffe0b2',
                                                                    borderTop: '4px solid #FF9800',
                                                                    borderRadius: '50%',
                                                                    animation: 'spin 1s linear infinite'
                                                                }} />
                                                                <style>{`
                                                                    @keyframes spin {
                                                                        0% { transform: rotate(0deg); }
                                                                        100% { transform: rotate(360deg); }
                                                                    }
                                                                `}</style>
                                                                Generating...
                                                            </div>
                                                        </>
                                                    );
                                                } else {
                                                    // Show "Waiting..." for images not yet started
                                                    return (
                                                        <>
                                                            <div style={{
                                                                padding: '10px',
                                                                background: '#f5f5f5',
                                                                borderBottom: '2px solid #e0e0e0',
                                                                fontWeight: 'bold',
                                                                fontSize: '14px',
                                                                color: '#999',
                                                                marginBottom: '10px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                Waiting...
                                                            </div>
                                                            <div style={{
                                                                width: '100%',
                                                                aspectRatio: '16/9',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                background: '#f5f5f5',
                                                                borderRadius: '4px',
                                                                border: '2px dashed #ddd',
                                                                color: '#999',
                                                                fontSize: '14px'
                                                            }}>
                                                                Not started yet
                                                            </div>
                                                        </>
                                                    );
                                                }
                                            })()}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
};

export default CapturesPage;
