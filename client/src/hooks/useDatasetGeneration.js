import { useState, useCallback, useEffect } from 'react';
import { fal } from '@fal-ai/client';
import { GENERATION_PROMPTS, MOON_REFERENCE_IMAGE } from '../config/generationPrompts';
import { 
    uploadImageToFal, 
    generateWithFlux, 
    saveImageToBackend, 
    createGenerationId as generateId 
} from '../utils/imageGeneration';

/**
 * Hook for managing dataset generation from capture images
 * @param {string} sessionId - Current session ID
 * @param {string} sceneType - Current scene type (table or moon)
 * @returns {Object} Generation state and control functions
 */
export const useDatasetGeneration = (sessionId, sceneType) => {
    const [generationState, setGenerationState] = useState('idle'); // idle, generating-first, generating-batch
    const [generatedImages, setGeneratedImages] = useState({}); // Map of index -> generated image URL
    const [referenceImage, setReferenceImage] = useState(null); // First generated image used as style reference
    const [progress, setProgress] = useState(0);
    const [currentlyProcessing, setCurrentlyProcessing] = useState(0);
    const [totalToProcess, setTotalToProcess] = useState(0);
    const [error, setError] = useState(null);
    const [currentGenerationId, setCurrentGenerationId] = useState(null); // Current generation ID
    const [availableGenerations, setAvailableGenerations] = useState([]); // List of all generations
    
    // Prompt customization - defaults based on scene type
    const [firstImagePrompt, setFirstImagePrompt] = useState(
        GENERATION_PROMPTS[sceneType]?.firstImage || GENERATION_PROMPTS.table.firstImage
    );
    const [batchImagePrompt, setBatchImagePrompt] = useState(
        GENERATION_PROMPTS[sceneType]?.batchImages || GENERATION_PROMPTS.table.batchImages
    );
    const [currentPrompts, setCurrentPrompts] = useState(null); // Prompts used for current generation

    // Configure fal.ai client
    fal.config({
        credentials: import.meta.env.VITE_FAL_KEY
    });
    
    // Update prompts when scene type changes
    useEffect(() => {
        setFirstImagePrompt(GENERATION_PROMPTS[sceneType]?.firstImage || GENERATION_PROMPTS.table.firstImage);
        setBatchImagePrompt(GENERATION_PROMPTS[sceneType]?.batchImages || GENERATION_PROMPTS.table.batchImages);
    }, [sceneType]);

    // Save generated image to backend (wrapper with context)
    const saveGeneratedImage = useCallback(async (imageUrl, index, isFirst = false) => {
        if (!sessionId || !sceneType || !currentGenerationId) {
            console.warn('Session ID, scene type, or generation ID not available for saving');
            return;
        }

        const prompts = isFirst ? {
            firstImage: firstImagePrompt,
            batchImages: batchImagePrompt
        } : null;

        await saveImageToBackend(imageUrl, sessionId, sceneType, index, currentGenerationId, prompts);
    }, [sessionId, sceneType, currentGenerationId, firstImagePrompt, batchImagePrompt]);

    // Generate first image - different logic for moon vs table
    const generateFirstImage = useCallback(async (captureImageUrl) => {
        const newGenerationId = generateId();
        console.log(`🎨 Starting first image generation for ${sceneType} scene with ID: ${newGenerationId}`);
        setCurrentGenerationId(newGenerationId);
        
        setGenerationState('generating-first');
        setError(null);
        setProgress(0);

        try {
            let imageUrls;
            
            if (sceneType === 'moon') {
                // Moon: use moon_no_objects.png as image 1, capture as image 2
                console.log('🌙 Moon scene: Using moon_no_objects.png as style reference');
                console.log('📤 Uploading moon reference and capture image...');
                
                // Upload both images
                const moonRefUrl = await uploadImageToFal(window.location.origin + MOON_REFERENCE_IMAGE);
                const captureUrl = await uploadImageToFal(captureImageUrl);
                
                imageUrls = [moonRefUrl, captureUrl];
            } else {
                // Table: use only the capture image
                console.log('🪑 Table scene: Using capture image for style generation');
                console.log('📤 Uploading capture image...');
                const captureUrl = await uploadImageToFal(captureImageUrl);
                imageUrls = [captureUrl];
            }

            console.log('🚀 Calling Flux API for first image generation...');
            console.log('📝 Using prompt:', firstImagePrompt);
            
            const generatedUrl = await generateWithFlux(
                firstImagePrompt,
                imageUrls,
                (update) => {
                    if (update.status === "IN_PROGRESS") {
                        const progressPercent = Math.min(90, 30 + (update.position || 0) * 10);
                        setProgress(progressPercent);
                    } else if (update.status === "IN_QUEUE") {
                        setProgress(20);
                    }
                }
            );

            setProgress(100);
            console.log('✅ First image generated successfully!');
            console.log('💾 Saving to backend with prompts...');
            
            // Save the generated image to backend (with prompts in metadata)
            await saveGeneratedImage(generatedUrl, 0, true);
            
            // Store the reference image
            setReferenceImage(generatedUrl);
            
            // Store in generated images map
            setGeneratedImages({ 0: generatedUrl });
            
            console.log('✅ First image complete and saved');
            setGenerationState('first-complete');
            return generatedUrl;
        } catch (err) {
            console.error('First generation error:', err);
            setError(`Failed to generate first image: ${err.message}`);
            setGenerationState('idle');
            return null;
        }
    }, [sceneType, saveGeneratedImage, firstImagePrompt]);

    // Generate a single image (helper for parallel processing)
    const generateSingleImage = useCallback(async (captureImageUrl, refUrl, index, totalCount) => {
        console.log(`🎨 [Image ${index}] Starting generation...`);
        try {
            // Upload current capture to fal storage
            console.log(`📤 [Image ${index}] Uploading to fal storage...`);
            const captureUrl = await uploadImageToFal(captureImageUrl);

            console.log(`🚀 [Image ${index}] Calling Flux API with batch prompt...`);
            const generatedUrl = await generateWithFlux(batchImagePrompt, [refUrl, captureUrl]);

            console.log(`✅ [Image ${index}] Generated successfully!`);
            
            // Save the generated image to backend
            console.log(`💾 [Image ${index}] Saving to backend...`);
            await saveGeneratedImage(generatedUrl, index);
            console.log(`✅ [Image ${index}] Saved to backend`);
            
            // Update the generated images state
            setGeneratedImages(prev => ({
                ...prev,
                [index]: generatedUrl
            }));

            // Update progress based on completed count
            setCurrentlyProcessing(prev => {
                const newCount = prev + 1;
                const progressPercent = Math.round((newCount / totalCount) * 100);
                console.log(`📊 Progress: ${newCount}/${totalCount} (${progressPercent}%)`);
                setProgress(progressPercent);
                return newCount;
            });

            return { index, url: generatedUrl, success: true };
        } catch (err) {
            console.error(`❌ [Image ${index}] Error generating:`, err);
            return { index, error: err.message, success: false };
        }
    }, [saveGeneratedImage, batchImagePrompt]);

    // Generate remaining images using reference image as style guide (PARALLEL)
    const generateBatchImages = useCallback(async (captureImages, startIndex = 1) => {
        if (!referenceImage) {
            console.error('❌ Reference image not available');
            setError('Reference image not available');
            return;
        }

        console.log(`🎨 Starting batch generation for ${captureImages.length - startIndex} images`);
        console.log(`📌 Preserving image 0 (reference image) in generated images`);
        setGenerationState('generating-batch');
        setError(null);
        const totalToGenerate = captureImages.length - startIndex;
        setTotalToProcess(totalToGenerate);
        setCurrentlyProcessing(0);
        setProgress(0);

        try {
            // Upload reference image once (will be reused for all)
            console.log('📤 Uploading reference image to fal storage...');
            const refUrl = await uploadImageToFal(referenceImage);
            console.log('✅ Reference image uploaded');
            
            // Important: Save the reference image (index 0) to backend if not already saved
            // This ensures it's included in the final metadata
            console.log('💾 Ensuring reference image (index 0) is saved to backend...');
            await saveGeneratedImage(referenceImage, 0, false); // Don't include prompts again

            // Create array of promises for parallel processing
            const generatePromises = [];
            for (let i = startIndex; i < captureImages.length; i++) {
                generatePromises.push(
                    generateSingleImage(captureImages[i], refUrl, i, totalToGenerate)
                );
            }

            // Execute all generations in parallel
            console.log(`🚀 Starting parallel generation of ${totalToGenerate} images...`);
            const results = await Promise.all(generatePromises);

            // Check results
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            console.log(`✅ Batch generation complete: ${successCount} succeeded, ${failCount} failed`);

            if (failCount > 0) {
                console.error(`❌ ${failCount} images failed to generate`);
                setError(`${failCount} image(s) failed to generate. Check console for details.`);
            }

            setProgress(100);
            console.log('✅ All batch processing complete');
            setGenerationState('batch-complete');
        } catch (err) {
            console.error('Batch generation error:', err);
            setError(`Batch generation failed: ${err.message}`);
            setGenerationState('first-complete'); // Allow retry
        }
    }, [referenceImage, generateSingleImage, saveGeneratedImage]);

    // Load a specific generation by ID
    const loadGenerationById = useCallback(async (generationId) => {
        if (!sessionId || !sceneType || !generationId) {
            console.warn('⚠️ Missing sessionId, sceneType, or generationId for loading');
            return;
        }

        console.log(`📂 Loading generation: ${generationId}`);
        try {
            const response = await fetch(`http://localhost:3000/sessions/${sceneType}/${sessionId}/generations/${generationId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch generation');
            }
            const data = await response.json();
            console.log(`📦 Received generation data:`, data);
            
            if (data.generatedImages && Object.keys(data.generatedImages).length > 0) {
                // Convert paths to full URLs
                const imagesWithUrls = {};
                Object.entries(data.generatedImages).forEach(([index, path]) => {
                    imagesWithUrls[index] = `http://localhost:3000/captures/${path}`;
                });
                
                console.log(`✅ Loaded ${Object.keys(imagesWithUrls).length} images`);
                setGeneratedImages(imagesWithUrls);
                setCurrentGenerationId(generationId);
                
                // Set reference image if we have the first one
                if (imagesWithUrls[0]) {
                    console.log('✅ Reference image set from loaded generation');
                    setReferenceImage(imagesWithUrls[0]);
                }
                
                // Load prompts from metadata if available
                if (data.prompts) {
                    console.log('📝 Loaded prompts from generation metadata');
                    setCurrentPrompts(data.prompts);
                } else {
                    setCurrentPrompts(null);
                }
                
                // Set state based on metadata from server
                if (data.state) {
                    console.log(`📊 Setting generation state to: ${data.state}`);
                    setGenerationState(data.state);
                } else {
                    // Fallback logic if no state in metadata
                    if (Object.keys(imagesWithUrls).length === 1 && imagesWithUrls[0]) {
                        console.log('📊 Setting generation state to: first-complete (fallback)');
                        setGenerationState('first-complete');
                    } else if (Object.keys(imagesWithUrls).length > 1) {
                        console.log('📊 Setting generation state to: batch-complete (fallback)');
                        setGenerationState('batch-complete');
                    } else {
                        console.log('📊 Setting generation state to: idle (fallback)');
                        setGenerationState('idle');
                    }
                }
            } else {
                // Empty generation
                console.log('ℹ️ No generated images found, setting state to idle');
                setGeneratedImages({});
                setReferenceImage(null);
                setGenerationState('idle');
            }
        } catch (err) {
            console.error('❌ Error loading generation:', err);
        }
    }, [sessionId, sceneType]);

    // List all available generations for current session
    const listGenerations = useCallback(async (forceAutoSelect = false) => {
        if (!sessionId || !sceneType) {
            return;
        }

        try {
            console.log(`📋 Listing generations for ${sceneType}/${sessionId} (forceAutoSelect: ${forceAutoSelect})`);
            const response = await fetch(`http://localhost:3000/sessions/${sceneType}/${sessionId}/generations`);
            if (!response.ok) {
                throw new Error('Failed to fetch generations');
            }
            const data = await response.json();
            
            console.log(`Found ${data.generations?.length || 0} generations`);
            setAvailableGenerations(data.generations || []);
            
            // Auto-select most recent generation ONLY if forceAutoSelect is true
            // This prevents re-selecting after we've clicked "Start New Generation"
            if (forceAutoSelect && data.generations && data.generations.length > 0) {
                const mostRecent = data.generations[0];
                console.log(`✅ Force auto-selecting most recent generation: ${mostRecent.generationId}`);
                setCurrentGenerationId(mostRecent.generationId);
                await loadGenerationById(mostRecent.generationId);
            } else {
                console.log(`⏭️ Not auto-selecting (forceAutoSelect: ${forceAutoSelect})`);
            }
        } catch (err) {
            console.error('Error listing generations:', err);
        }
    }, [sessionId, sceneType, loadGenerationById]);

    // Start a new generation (clears current state)
    const startNewGeneration = useCallback(() => {
        console.log('🔄 Starting new generation - clearing all state');
        setGenerationState('idle');
        setGeneratedImages({});
        setReferenceImage(null);
        setProgress(0);
        setCurrentlyProcessing(0);
        setTotalToProcess(0);
        setError(null);
        setCurrentGenerationId(null);
        setCurrentPrompts(null);
        // Reset prompts to scene-specific defaults
        setFirstImagePrompt(GENERATION_PROMPTS[sceneType]?.firstImage || GENERATION_PROMPTS.table.firstImage);
        setBatchImagePrompt(GENERATION_PROMPTS[sceneType]?.batchImages || GENERATION_PROMPTS.table.batchImages);
        console.log('✅ New generation state ready');
    }, [sceneType]);

    // Reset generation state (keeps generation ID for reloading)
    const reset = useCallback(() => {
        setGenerationState('idle');
        setGeneratedImages({});
        setReferenceImage(null);
        setProgress(0);
        setCurrentlyProcessing(0);
        setTotalToProcess(0);
        setError(null);
    }, []);

    return {
        generationState,
        generatedImages,
        referenceImage,
        progress,
        currentlyProcessing,
        totalToProcess,
        error,
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
    };
};

