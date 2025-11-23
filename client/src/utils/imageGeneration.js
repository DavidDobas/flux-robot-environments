/**
 * Utility functions for image generation
 * Extracted from useDatasetGeneration hook for better organization
 */

import { fal } from '@fal-ai/client';

/**
 * Upload an image from URL to fal storage
 */
export async function uploadImageToFal(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'image.png', { type: 'image/png' });
        const falUrl = await fal.storage.upload(file);
        return falUrl;
    } catch (err) {
        console.error('Error uploading image to fal:', err);
        throw new Error(`Failed to upload image: ${err.message}`);
    }
}

/**
 * Call Flux API to generate/edit an image
 */
export async function generateWithFlux(prompt, imageUrls, onProgress) {
    const result = await fal.subscribe("fal-ai/alpha-image-232/edit-image", {
        input: {
            prompt: prompt,
            image_urls: imageUrls,
            image_size: "auto",
            output_format: "png"
        },
        logs: true,
        onQueueUpdate: (update) => {
            if (onProgress) {
                onProgress(update);
            }
            if (update.status === "IN_PROGRESS") {
                update.logs?.map((log) => log.message).forEach(console.log);
            }
        },
    });

    if (result.data?.images?.[0]) {
        return result.data.images[0].url;
    } else {
        throw new Error('No image was generated');
    }
}

/**
 * Save generated image to backend
 */
export async function saveImageToBackend(imageUrl, sessionId, sceneType, index, generationId, prompts = null) {
    const body = {
        imageUrl,
        sessionId,
        sceneType,
        index,
        generationId
    };

    // Include prompts in metadata when saving the first image
    if (prompts && index === 0) {
        body.prompts = prompts;
    }

    const response = await fetch('http://localhost:3000/save-generated', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();
    if (data.success) {
        console.log(`Saved generated image ${index} to:`, data.path);
    } else {
        console.error('Failed to save generated image:', data.error);
    }
}

/**
 * Generate a timestamp-based generation ID
 */
export function createGenerationId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `gen-${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

