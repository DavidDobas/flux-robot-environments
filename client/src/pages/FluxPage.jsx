import React, { useState, useRef } from 'react';
import { fal } from '@fal-ai/client';
import './FluxPage.css';

const FluxPage = () => {
    const [uploadedImages, setUploadedImages] = useState([]);
    const [prompt, setPrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Configure fal.ai client with API key from environment
    fal.config({
        credentials: import.meta.env.VITE_FAL_KEY
    });

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);

        // Limit to 8 images total
        if (uploadedImages.length + files.length > 8) {
            setError(`You can only upload up to 8 images. Currently have ${uploadedImages.length}.`);
            return;
        }

        setError(null);

        // Upload files to fal.ai storage and create preview URLs
        const newImages = await Promise.all(
            files.map(async (file) => {
                // Upload to fal.ai storage
                const url = await fal.storage.upload(file);

                // Create local preview URL
                const previewUrl = URL.createObjectURL(file);

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    file,
                    url, // fal.ai storage URL
                    previewUrl, // local preview URL
                    name: file.name
                };
            })
        );

        setUploadedImages([...uploadedImages, ...newImages]);
    };

    const removeImage = (id) => {
        const imageToRemove = uploadedImages.find(img => img.id === id);
        if (imageToRemove?.previewUrl) {
            URL.revokeObjectURL(imageToRemove.previewUrl);
        }
        setUploadedImages(uploadedImages.filter(img => img.id !== id));
    };

    const handleGenerate = async () => {
        // Validation
        if (uploadedImages.length === 0) {
            setError('Please upload at least one image.');
            return;
        }
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }

        setError(null);
        setIsLoading(true);
        setProgress(0);
        setGeneratedImage(null);

        try {
            // Prepare image URLs for the API
            const imageUrls = uploadedImages.map(img => img.url);

            // Call Flux API
            const result = await fal.subscribe("fal-ai/alpha-image-232/edit-image", {
                input: {
                    prompt: prompt,
                    image_urls: imageUrls,
                    image_size: "auto",
                    output_format: "png"
                },
                logs: true,
                onQueueUpdate: (update) => {
                    if (update.status === "IN_PROGRESS") {
                        // Update progress based on queue position
                        const progressPercent = Math.min(90, 30 + (update.position || 0) * 10);
                        setProgress(progressPercent);

                        // Log messages
                        update.logs?.map((log) => log.message).forEach(console.log);
                    } else if (update.status === "IN_QUEUE") {
                        setProgress(20);
                    }
                },
            });

            setProgress(100);

            // Extract the generated image
            if (result.data?.images?.[0]) {
                setGeneratedImage({
                    url: result.data.images[0].url,
                    seed: result.data.seed,
                    fileName: result.data.images[0].file_name || 'generated-image.png'
                });
            } else {
                setError('No image was generated. Please try again.');
            }
        } catch (err) {
            console.error('Generation error:', err);
            setError(`Failed to generate image: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!generatedImage) return;

        try {
            const response = await fetch(generatedImage.url);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = generatedImage.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download error:', err);
            setError('Failed to download image.');
        }
    };

    return (
        <div className="flux-page">
            <div className="flux-container">
                {/* Left Panel - Inputs */}
                <div className="flux-left-panel">
                    <div className="flux-header">
                        <h1>Flux Image Editor</h1>
                        <p className="flux-subtitle">Upload images and describe your edits</p>
                    </div>

                    {/* Image Upload Section */}
                    <div className="upload-section">
                        <h2>Upload Images</h2>
                        <p className="section-description">Upload up to 8 images for editing</p>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />

                        <button
                            className="upload-button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadedImages.length >= 8}
                        >
                            <span className="upload-icon">📁</span>
                            {uploadedImages.length === 0 ? 'Choose Images' : `Add More (${uploadedImages.length}/8)`}
                        </button>

                        {/* Image Thumbnails */}
                        {uploadedImages.length > 0 && (
                            <div className="image-grid">
                                {uploadedImages.map((img) => (
                                    <div key={img.id} className="image-thumbnail">
                                        <img src={img.previewUrl} alt={img.name} />
                                        <button
                                            className="remove-button"
                                            onClick={() => removeImage(img.id)}
                                            title="Remove image"
                                        >
                                            ✕
                                        </button>
                                        <div className="image-name">{img.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Prompt Section */}
                    <div className="prompt-section">
                        <h2>Prompt</h2>
                        <p className="section-description">Describe how you want to edit the images</p>
                        <textarea
                            className="prompt-input"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., make it futuristic, add dramatic lighting, remove background..."
                            rows={4}
                        />
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        className="generate-button"
                        onClick={handleGenerate}
                        disabled={isLoading || uploadedImages.length === 0 || !prompt.trim()}
                    >
                        {isLoading ? 'Generating...' : 'Generate Image'}
                    </button>
                </div>

                {/* Right Panel - Results */}
                <div className="flux-right-panel">
                    <h2>Generated Result</h2>

                    {isLoading && (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="loading-text">Generating your image... {progress}%</p>
                        </div>
                    )}

                    {generatedImage && !isLoading && (
                        <div className="result-container">
                            <div className="result-image-wrapper">
                                <img
                                    src={generatedImage.url}
                                    alt="Generated result"
                                    className="result-image"
                                />
                            </div>
                            <div className="result-actions">
                                <button className="download-button" onClick={handleDownload}>
                                    <span className="download-icon">⬇️</span>
                                    Download Image
                                </button>
                                <p className="result-info">Seed: {generatedImage.seed}</p>
                            </div>
                        </div>
                    )}

                    {!generatedImage && !isLoading && (
                        <div className="empty-state">
                            <div className="empty-icon">🎨</div>
                            <p>Your generated image will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FluxPage;
