import { addGrid, addAxes } from './sceneObjects.js';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';

/**
 * Configuration for moon scene PLY files
 * Axes: position = [x, y, z]
 *  - x: left/right on table
 *  - y: height above table (fixed 0.025)
 *  - z: front/back on table
 */
/**
 * Final moon scene layout
 * position = [x, y, z]
 * - y = 0.025 (table height)
 * - robot faces +x, objects in front
 * - cluster centered around z ≈ 0
 */

// FRONT ROW: hand tools
const MOON_SCENE_SPLATS = [
    {
        path: '/assets/moon_scene/tool_left_1.ply',
        position: [0.32, 0.025, -0.23],
        scale: [0.1, 0.1, 0.1],
        rotation: [0.6903, -0.1530,  0.1530,  0.6903]  // q_left
      },
      {
        path: '/assets/moon_scene/tool_left_2.ply',
        position: [0.32, 0.025, -0.16],
        scale: [0.1, 0.1, 0.1],
        rotation: [0.6903, -0.1530,  0.1530,  0.6903]  // q_left
      },
      {
        path: '/assets/moon_scene/tool_right_smallest.ply',
        position: [0.32, 0.025, 0.12],
        scale: [0.1, 0.1, 0.1],
        rotation: [0.6903,  0.1530, -0.1530,  0.6903]  // q_right
      },
      {
        path: '/assets/moon_scene/tool_right_middle.ply',
        position: [0.32, 0.025, 0.19],
        scale: [0.1, 0.1, 0.1],
        rotation: [0.6903,  0.1530, -0.1530,  0.6903]  // q_right
      },
      {
        path: '/assets/moon_scene/tool_right_largest.ply',
        position: [0.32, 0.025, 0.26],
        scale: [0.1, 0.1, 0.1],
        rotation: [0.6903,  0.1530, -0.1530,  0.6903]  // q_right
      },
  
    // MIDDLE ROW: rocks (dark + white)
    {
      path: '/assets/moon_scene/stone_grey.ply',   // dark rock, left/center
      position: [0.40, 0.025, -0.12],
      scale: [0.1, 0.1, 0.1],
      rotation: [Math.sin(Math.PI/4), 0, 0, Math.cos(Math.PI/4)]
    },
    {
      path: '/assets/moon_scene/stone_grey_2.ply', // dark rock, center
      position: [0.42, 0.025, -0.02],
      scale: [0.1, 0.1, 0.1],
      rotation: [Math.sin(Math.PI/4), 0, 0, Math.cos(Math.PI/4)]
    },
    {
      path: '/assets/moon_scene/stone_grey_3.ply', // dark rock, slight right
      position: [0.40, 0.025, 0.08],
      scale: [0.1, 0.1, 0.1],
      rotation: [Math.sin(Math.PI/4), 0, 0, Math.cos(Math.PI/4)]
    },
    {
      path: '/assets/moon_scene/white_stone_bigger.ply', // big white rock, right of center
      position: [0.44, 0.025, 0.10],
      scale: [0.1, 0.1, 0.1],
      rotation: [Math.sin(Math.PI/4), 0, 0, Math.cos(Math.PI/4)]
    },
    {
      path: '/assets/moon_scene/stone_white_smaller.ply', // small white, far right
      position: [0.44, 0.025, 0.18],
      scale: [0.1, 0.1, 0.1],
      rotation: [Math.sin(Math.PI/4), 0, 0, Math.cos(Math.PI/4)]
    },
  
    // BACK ROW: cylinders + small cans + radio
    {
      path: '/assets/moon_scene/rounded_box_1.ply',   // big discs - left
      position: [0.52, 0.025, -0.25],
      scale: [0.1, 0.1, 0.1],
      rotation: [Math.sin(Math.PI/4), 0, 0, Math.cos(Math.PI/4)]
    },
    {
      path: '/assets/moon_scene/rounded_box_2.ply',   // big discs - mid-left
      position: [0.54, 0.025, -0.10],
      scale: [0.1, 0.1, 0.1],
      rotation: [Math.sin(Math.PI/4), 0, 0, Math.cos(Math.PI/4)]
    },
    {
      path: '/assets/moon_scene/rounded_box_3.ply',   // big discs - mid-right
      position: [0.56, 0.025, 0.05],
      scale: [0.1, 0.1, 0.1],
      rotation: [Math.sin(Math.PI/4), 0, 0, Math.cos(Math.PI/4)]
    },
    {
      path: '/assets/moon_scene/rounded_boxes_small.ply', // cluster of small cans
      position: [0.52, 0.025, 0.15],
      scale: [0.1, 0.1, 0.1],
      rotation: [Math.sin(Math.PI/4), 0, 0, Math.cos(Math.PI/4)]
    },
    {
      path: '/assets/moon_scene/radio.ply',           // radio at far right-back
      position: [0.56, 0.025, 0.27],
      scale: [0.1, 0.1, 0.1],
      rotation: [Math.sin(Math.PI/4), 0, 0, Math.cos(Math.PI/4)]
    }
  ];
  


/**
 * Adds moon scene objects (axes, Gaussian splats)
 * Uses GaussianSplats3D library for proper rendering
 * @param {THREE.Scene} scene - The Three.js scene
 * @returns {Object} References to grippable objects and viewer
 */
export async function addMoonScene(scene) {
    // Add grid and axes
    addGrid(scene);
    addAxes(scene, 2);

    console.log('Loading Gaussian splat files for moon scene with GaussianSplats3D...');
    
    const grippableObjects = {};
    
    // Create separate viewers for each splat so they can be individually gripped
    for (let i = 0; i < MOON_SCENE_SPLATS.length; i++) {
        const splat = MOON_SCENE_SPLATS[i];
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
            
            // Set the group's position (for gripping detection)
            viewerGroup.position.set(splat.position[0], splat.position[1], splat.position[2]);
            
            // Give it a unique name for gripping identification
            const splatName = `splat_${i}`;
            viewerGroup.name = splatName;
            
            // Mark for identification and store reference to viewer for cleanup
            viewerGroup.userData.parentName = splatName;
            viewerGroup.userData.gaussianViewer = viewer; // Store for disposal
            
            // Add group to scene
            scene.add(viewerGroup);
            
            // Add to grippable objects
            grippableObjects[splatName] = viewerGroup;
            
            console.log(`Loaded ${splat.path} successfully as ${splatName} using GaussianSplats3D`);
        } catch (error) {
            console.error(`Error loading ${splat.path}:`, error);
        }
    }

    console.log('Grippable splat objects:', Object.keys(grippableObjects));
    
    // Return grippable splat objects
    return grippableObjects;
}
