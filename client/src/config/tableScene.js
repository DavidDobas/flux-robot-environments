import { addGrid, addAxes, addCube, addOBJModel } from './sceneObjects.js';

/**
 * Adds table scene objects (grid, axes, cube, cup)
 * @param {THREE.Scene} scene - The Three.js scene
 * @returns {Object} References to grippable objects
 */
export async function addTableScene(scene) {
    // Add grid and axes
    // addGrid(scene);
    // addAxes(scene, 2);

    // Add a small red cube near the robot base
    const cube = addCube(scene, {
        position: [0.2, 0.025, -0.1],
        size: 0.05,
        color: 0xff6b6b
    });
    cube.name = 'cube'; // Name for identification

    // Add cup from OBJ file
    console.log('Attempting to load cup.obj from /assets/cup.obj');
    let cup = null;
    try {
        cup = await addOBJModel(scene, '/assets/cup.obj', {
            position: [0.3, 0, 0.15], // Y will be auto-calculated
            scale: 0.01,
            color: 0x8899aa, // Greyish-blue color
            placeOnGround: true // Automatically place on ground
        });
        cup.name = 'cup'; // Name for identification
        
        // Ensure all children also have the name set for proper identification
        cup.traverse((child) => {
            if (child.isMesh) {
                child.userData.parentName = 'cup';
            }
        });
        
        console.log('Cup loaded successfully. Structure:', cup.type, 'Children:', cup.children.length);
    } catch (error) {
        console.error('cup.obj loading error:', error);
    }

    // Return references to grippable objects
    return {
        cube,
        cup
    };
}

