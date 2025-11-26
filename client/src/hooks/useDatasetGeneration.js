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

        if (isFirst && prompts) {
            console.log('📝 Passing prompts to backend for index 0:', prompts);
        } else if (index === 0 && !prompts) {
            console.log('⚠️ Saving index 0 without prompts (isFirst =', isFirst, ')');
        }

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
            } else if (sceneType === 'cat') {
                // Cat: use only the capture image for first frame (creates night road scene)
                console.log('🐱 Cat scene: Creating night road scene from capture');
                console.log('📤 Uploading capture image...');
                
                const captureUrl = await uploadImageToFal(captureImageUrl);
                imageUrls = [captureUrl];
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

    // Generate remaining images using reference image as style guide
    // Cat scene: SEQUENTIAL (previous frame as reference)
    // Other scenes: PARALLEL in batches (first frame as reference)
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
            // Important: Save the reference image (index 0) to backend if not already saved
            // AND save prompts to metadata at the start of batch generation
            console.log('💾 Ensuring reference image (index 0) is saved with prompts to backend...');
            await saveGeneratedImage(referenceImage, 0, true); // Include prompts for batch generation

            // Cat scene: Sequential generation (each uses previous frame as reference)
            if (sceneType === 'cat') {
                console.log('🐱 Cat scene: Using SEQUENTIAL generation (previous frame as reference)');
                
                let previousGeneratedUrl = referenceImage;
                const results = [];
                
                for (let i = startIndex; i < captureImages.length; i++) {
                    console.log(`🎨 [Image ${i}/${captureImages.length - 1}] Using previous frame as reference...`);
                    
                    try {
                        // Upload previous generated image and current capture
                        console.log(`📤 [Image ${i}] Uploading previous frame and current capture...`);
                        const prevFrameUrl = await uploadImageToFal(previousGeneratedUrl);
                        const captureUrl = await uploadImageToFal(captureImages[i]);
                        
                        console.log(`🚀 [Image ${i}] Calling Flux API...`);
                        const generatedUrl = await generateWithFlux(batchImagePrompt, [prevFrameUrl, captureUrl]);
                        
                        console.log(`✅ [Image ${i}] Generated successfully!`);
                        
                        // Save to backend
                        console.log(`💾 [Image ${i}] Saving to backend...`);
                        await saveGeneratedImage(generatedUrl, i);
                        console.log(`✅ [Image ${i}] Saved to backend`);
                        
                        // Update state
                        setGeneratedImages(prev => ({
                            ...prev,
                            [i]: generatedUrl
                        }));
                        
                        // Update previous frame for next iteration
                        previousGeneratedUrl = generatedUrl;
                        
                        // Update progress
                        const completed = i - startIndex + 1;
                        const progressPercent = Math.round((completed / totalToGenerate) * 100);
                        console.log(`📊 Progress: ${completed}/${totalToGenerate} (${progressPercent}%)`);
                        setProgress(progressPercent);
                        setCurrentlyProcessing(completed);
                        
                        results.push({ index: i, url: generatedUrl, success: true });
                    } catch (err) {
                        console.error(`❌ [Image ${i}] Error:`, err);
                        results.push({ index: i, error: err.message, success: false });
                    }
                }
                
                const successCount = results.filter(r => r.success).length;
                const failCount = results.filter(r => !r.success).length;
                console.log(`✅ Sequential generation complete: ${successCount} succeeded, ${failCount} failed`);
                
                if (failCount > 0) {
                    setError(`${failCount} image(s) failed to generate. Check console for details.`);
                }
            } else {
                // Table/Moon scenes: Parallel batch generation
                console.log('📦 Table/Moon scene: Using PARALLEL batch generation');
                
                // Upload reference image once (will be reused for all)
                let refUrl;
                if (sceneType === 'moon') {
                    // Moon: use moon_no_objects.png for ALL images (consistent style)
                    console.log('📤 Uploading moon_no_objects.png as reference for batch...');
                    refUrl = await uploadImageToFal(window.location.origin + MOON_REFERENCE_IMAGE);
                    console.log('✅ Moon reference image uploaded');
                } else {
                    // Table: use first generated image as reference
                    console.log('📤 Uploading first generated image as reference...');
                    refUrl = await uploadImageToFal(referenceImage);
                    console.log('✅ Reference image uploaded');
                }

                // Process images in batches of 10 to avoid overwhelming the API
                const BATCH_SIZE = 10;
                const results = [];
                const totalImages = captureImages.length - startIndex;
                
                console.log(`🚀 Starting batch generation of ${totalImages} images (batches of ${BATCH_SIZE})...`);
                
                for (let batchStart = startIndex; batchStart < captureImages.length; batchStart += BATCH_SIZE) {
                    const batchEnd = Math.min(batchStart + BATCH_SIZE, captureImages.length);
                    const batchNumber = Math.floor((batchStart - startIndex) / BATCH_SIZE) + 1;
                    const totalBatches = Math.ceil(totalImages / BATCH_SIZE);
                    
                    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (images ${batchStart}-${batchEnd - 1})`);
                    
                    // Create promises for this batch
                    const batchPromises = [];
                    for (let i = batchStart; i < batchEnd; i++) {
                        batchPromises.push(
                            generateSingleImage(captureImages[i], refUrl, i, totalToGenerate)
                        );
                    }
                    
                    // Execute this batch in parallel
                    const batchResults = await Promise.all(batchPromises);
                    results.push(...batchResults);
                    
                    console.log(`✅ Batch ${batchNumber}/${totalBatches} complete`);
                }

                // Check results
                const successCount = results.filter(r => r.success).length;
                const failCount = results.filter(r => !r.success).length;

                console.log(`✅ Batch generation complete: ${successCount} succeeded, ${failCount} failed`);

                if (failCount > 0) {
                    console.error(`❌ ${failCount} images failed to generate`);
                    setError(`${failCount} image(s) failed to generate. Check console for details.`);
                }
            }

            setProgress(100);
            console.log('✅ All batch processing complete');
            setGenerationState('batch-complete');
        } catch (err) {
            console.error('Batch generation error:', err);
            setError(`Batch generation failed: ${err.message}`);
            setGenerationState('first-complete'); // Allow retry
        }
    }, [sceneType, referenceImage, generateSingleImage, saveGeneratedImage, batchImagePrompt]);

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

