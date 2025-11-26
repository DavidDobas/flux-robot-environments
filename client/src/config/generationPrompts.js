/**
 * Default prompts for dataset generation
 * Different prompts for different scene types (table vs moon)
 */

export const GENERATION_PROMPTS = {
    table: {
        firstImage: "Make the scene look realistic, on a wooden table. Change the lighting so that the shadow is on the right. Keep the pose and positions of all objects exactly. 8K realistic",
        
        batchImages: `Use image 2 as the exact pose and layout reference. Recreate the same scene with the same object positions, shadows, and camera angle as in image 2, keeping the poses of objects exactly the same. Apply exactly the same visual style, lighting, materials, and realism of image 1. 
Use exactly the same wooden table color and texture, the table should be indistinguishable. ALso the same shading direction, and the same photorealistic rendering quality as in image 1. It should be indistinguishable. Keep the robot arm, and all objects in the exact same positions and orientations as they appear in image 2.`
    },
    
    moon: {
        // For moon, first image uses moon_no_objects.png as reference
        firstImage: `Recreate the same scene with the same object positions, shadows, and camera angle as in image 2, without changing any poses. On the table, only put objects from image 2. Be extremely precise about the sizes and positions of the objects from image 2.

Apply the full visual style, lighting, materials, and realism of image 1. Use the same table texture, the same shading direction, and the same photorealistic rendering quality as in image 1. Keep the robot arm, and all objects in the exact same positions and orientations as they appear in image 2.`,
        
        // Batch images use the same prompt (first generated image as style reference)
        batchImages: `Recreate the same scene with the same object positions, shadows, and camera angle as in image 2, without changing any poses. On the table, only put objects from image 2. Be extremely precise about the sizes and positions of the objects from image 2.

Apply the full visual style, lighting, materials, and realism of image 1. Use the same table texture, the same shading direction, and the same photorealistic rendering quality as in image 1. The room should be indistinguishable from the one in image 1. But, IMPORTANT: keep the robot arm, and all objects in the exact same positions and orientations as they appear in image 2. Do not use image 1 for robot position.`
    },
    
    cat: {
        // For cat scene: first image creates the night road scene from capture
        firstImage: `Recreate the same scene with the same object positions, shadows, and camera angle as in the image, put the cat and the car to the same positions as on the image and add the robot arm, in exactly the same pose as the image. Add road, during night, light from car lights.`,
        
        // Batch images: use previous frame as reference (sequential generation)
        // Image 1 (previous frame) = style/context, Image 2 (current capture) = pose/positions
        batchImages: `Recreate the same scene with the same object positions, shadows, and camera angle as in image 2. Put the cat, the car, and the robot arm in exactly the same positions and poses as they appear in image 2. Use the road, night setting, and lighting style from image 1. Keep the visual consistency with image 1 while matching the exact poses from image 2.`
    }
};

// Path to reference image for moon scene (no objects)
export const MOON_REFERENCE_IMAGE = '/assets/moon_no_objects.png';

