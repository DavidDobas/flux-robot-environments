import { addGrid, addAxes } from './sceneObjects.js';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';

/**
 * Configuration for cat scene PLY files (Gaussian splats)
 * Axes: position = [x, y, z]
 *  - x: left/right on table
 *  - y: height above table (0.025)
 *  - z: front/back on table
 *  - robot faces +x direction
 */

const CAT_SCENE_SPLATS = [
    {
      path: '/assets/cat_scene/cat.ply',
      position: [0.35, 0.025, -0.3],  // Close to robot, slightly to the left
      scale: [0.1, 0.1, 0.1],
      rotation: [0, Math.SQRT1_2, Math.SQRT1_2, 0]
    },
    {
      path: '/assets/cat_scene/car.ply',
      position: [0.55,  0.18,  0.4], // Further away, to the right
      scale: [1, 1, 1],
      rotation: [0, Math.SQRT1_2, Math.SQRT1_2, 0]
    }
  ];

/**
 * Adds cat scene objects (axes, Gaussian splats for cat and car)
 * Uses GaussianSplats3D library for proper rendering
 * @param {THREE.Scene} scene - The Three.js scene
 * @returns {Object} References to grippable objects
 */
export async function addCatScene(scene) {
    // Add grid and axes
    // addGrid(scene);
    // addAxes(scene, 2);

    console.log('Loading Gaussian splat files for cat scene with GaussianSplats3D...');
    
    const grippableObjects = {};
    
    // Create separate viewers for each splat so they can be individually gripped
    for (let i = 0; i < CAT_SCENE_SPLATS.length; i++) {
        const splat = CAT_SCENE_SPLATS[i];
        try {
            // Create a DropInViewer for this splat
            const viewer = new GaussianSplats3D.DropInViewer({
                'gpuAcceleratedSort': false, // Disable for compatibility
                'halfPrecisionCovariancesOnGPU': true,
                'sharedMemoryForWorkers': false,
                'integerBasedSort': false,
                'dynamicScene': true,
                'webXRMode': GaussianSplats3D.WebXRMode.None
            });

            // Load the splat scene (position/rotation/scale here affect the internal splat data)
            await viewer.addSplatScene(splat.path, {
                'position': [0, 0, 0],  // Keep internal data centered
                'rotation': splat.rotation,
                'scale': splat.scale,
                'splatAlphaRemovalThreshold': 5
            });
            
            // Wrap viewer in a Group so we can move it without breaking internal state
            const viewerGroup = new THREE.Group();
            viewerGroup.add(viewer);
            
            // Set the group's position (for gripping detection and animation)
            viewerGroup.position.set(splat.position[0], splat.position[1], splat.position[2]);
            
            // Give it a unique name for gripping identification
            const splatName = `cat_splat_${i}`;
            viewerGroup.name = splatName;
            
            // Mark for identification and store reference to viewer for cleanup
            viewerGroup.userData.parentName = splatName;
            viewerGroup.userData.gaussianViewer = viewer; // Store for disposal
            viewerGroup.userData.initialPosition = [...splat.position];
            
            // Add group to scene
            scene.add(viewerGroup);
            
            // Add to grippable objects
            grippableObjects[splatName] = viewerGroup;
            
            console.log(`Loaded ${splat.path} successfully as ${splatName} using GaussianSplats3D`);
        } catch (error) {
            console.error(`Error loading ${splat.path}:`, error);
        }
    }

    console.log('Grippable cat scene splat objects:', Object.keys(grippableObjects));
    
    // Return grippable splat objects
    return grippableObjects;
}

