import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

/**
 * Adds a grid helper to the scene
 * @param {THREE.Scene} scene - The Three.js scene
 */
export function addGrid(scene) {
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    scene.add(gridHelper);
}

/**
 * Adds axes helper to the scene (RGB = XYZ)
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {number} size - Length of the axes (default: 2)
 */
export function addAxes(scene, size = 2) {
    const axesHelper = new THREE.AxesHelper(size);
    scene.add(axesHelper);
}

/**
 * Adds a cube to the scene
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} options - Cube options
 * @param {number[]} options.position - [x, y, z] position
 * @param {number} options.size - Side length of the cube
 * @param {number} options.color - Hex color
 */
export function addCube(scene, { position = [0, 0, 0], size = 0.05, color = 0xff6b6b } = {}) {
    const cubeGeometry = new THREE.BoxGeometry(size, size, size);
    const cubeMaterial = new THREE.MeshPhongMaterial({ color });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(position[0], position[1], position[2]);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);
    return cube;
}

/**
 * Loads and adds an FBX model to the scene
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {string} path - Path to the FBX file
 * @param {Object} options - Model options
 * @param {number[]} options.position - [x, y, z] position
 * @param {number} options.scale - Scale factor
 * @param {number[]} options.rotation - [x, y, z] rotation in radians
 * @returns {Promise<THREE.Object3D>} The loaded model
 */
export function addFBXModel(scene, path, { position = [0, 0, 0], scale = 1, rotation = [0, 0, 0] } = {}) {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(
            path,
            (object) => {
                object.position.set(position[0], position[1], position[2]);
                object.scale.setScalar(scale);
                object.rotation.set(rotation[0], rotation[1], rotation[2]);

                // Process materials to prevent color space issues
                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Convert to MeshPhongMaterial to avoid legacy material issues
                        if (child.material) {
                            const oldMaterials = Array.isArray(child.material) ? child.material : [child.material];
                            const newMaterials = oldMaterials.map(oldMat => {
                                // Create new MeshPhongMaterial with properties from old material
                                const newMat = new THREE.MeshPhongMaterial({
                                    color: oldMat.color || new THREE.Color(0xffffff),
                                    map: oldMat.map || null,
                                    emissive: oldMat.emissive || new THREE.Color(0x000000),
                                    emissiveMap: oldMat.emissiveMap || null,
                                    specular: oldMat.specular || new THREE.Color(0x111111),
                                    specularMap: oldMat.specularMap || null,
                                    shininess: oldMat.shininess || 30,
                                    normalMap: oldMat.normalMap || null,
                                    transparent: oldMat.transparent || false,
                                    opacity: oldMat.opacity !== undefined ? oldMat.opacity : 1,
                                    side: oldMat.side !== undefined ? oldMat.side : THREE.FrontSide,
                                });

                                // Set correct color space for textures
                                if (newMat.map) newMat.map.colorSpace = THREE.SRGBColorSpace;
                                if (newMat.emissiveMap) newMat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                                if (newMat.specularMap) newMat.specularMap.colorSpace = THREE.SRGBColorSpace;

                                return newMat;
                            });

                            child.material = Array.isArray(child.material) ? newMaterials : newMaterials[0];
                        }
                    }
                });

                scene.add(object);
                resolve(object);
            },
            undefined,
            (error) => {
                console.error(`Error loading FBX model from ${path}:`, error);
                reject(error);
            }
        );
    });
}

/**
 * Loads and adds an OBJ model to the scene
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {string} path - Path to the OBJ file
 * @param {Object} options - Model options
 * @param {number[]} options.position - [x, y, z] position (if placeOnGround is true, y is ignored)
 * @param {number} options.scale - Scale factor
 * @param {number[]} options.rotation - [x, y, z] rotation in radians
 * @param {number} options.color - Hex color for the material
 * @param {boolean} options.placeOnGround - If true, automatically place object on ground (y=0)
 * @returns {Promise<THREE.Object3D>} The loaded model
 */
export function addOBJModel(scene, path, { position = [0, 0, 0], scale = 1, rotation = [0, 0, 0], color = 0xcccccc, placeOnGround = false } = {}) {
    return new Promise((resolve, reject) => {
        const loader = new OBJLoader();
        loader.load(
            path,
            (object) => {
                object.scale.setScalar(scale);
                object.rotation.set(rotation[0], rotation[1], rotation[2]);

                // Apply material to all meshes
                object.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshPhongMaterial({
                            color: color,
                            shininess: 30
                        });
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Calculate bounding box to place on ground if requested
                if (placeOnGround) {
                    const box = new THREE.Box3().setFromObject(object);
                    const minY = box.min.y;
                    // Position object so its bottom is at y=0
                    object.position.set(position[0], position[1] - minY, position[2]);
                } else {
                    object.position.set(position[0], position[1], position[2]);
                }

                scene.add(object);
                resolve(object);
            },
            undefined,
            (error) => {
                console.error(`Error loading OBJ model from ${path}:`, error);
                reject(error);
            }
        );
    });
}

/**
 * Adds all scene objects (grid, axes, cube, and FBX models if available)
 * @param {THREE.Scene} scene - The Three.js scene
 */
export async function addSceneObjects(scene) {
    // Add grid and axes
    addGrid(scene);
    addAxes(scene, 2);

    // Add a small red cube near the robot base
    addCube(scene, {
        position: [0.2, 0.025, -0.1],
        size: 0.05,
        color: 0xff6b6b
    });

    // Try to load FBX models if they exist
    // Note: Add cube.fbx and mug.fbx to /public/assets/ directory
    // Uncomment the code below once you have valid FBX files

    // try {
    //     await addFBXModel(scene, '/assets/cube.fbx', {
    //         position: [0.3, 0.05, 0.1],
    //         scale: 0.0001, // Adjust scale as needed
    //     });
    // } catch (error) {
    //     console.log('cube.fbx not found or failed to load');
    // }

    // try {
    //     await addFBXModel(scene, '/assets/mug.fbx', {
    //         position: [-0.2, 0.05, 0.15],
    //         scale: 0.0001, // Adjust scale as needed
    //     });
    // } catch (error) {
    //     console.log('mug.fbx not found or failed to load');
    // }

    // Add cup from OBJ file
    console.log('Attempting to load cup.obj from /assets/cup.obj');
    try {
        await addOBJModel(scene, '/assets/cup.obj', {
            position: [0.3, 0, 0.15], // Y will be auto-calculated
            scale: 0.01,
            color: 0x8899aa, // Greyish-blue color
            placeOnGround: true // Automatically place on ground
        });
        console.log('Cup loaded successfully');
    } catch (error) {
        console.error('cup.obj loading error:', error);
    }
}
