import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { GaussianSplatPLYLoader } from '../utils/GaussianSplatPLYLoader.js';
import { addTableScene } from './tableScene.js';
import { addMoonScene } from './moonScene.js';

/**
 * Adds a grid helper to the scene
 * @param {THREE.Scene} scene - The Three.js scene
 */
export function addGrid(scene) {
    // Remove any existing grid first
    const existingGrid = scene.getObjectByName('scene-grid');
    if (existingGrid) {
        scene.remove(existingGrid);
    }
    
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    gridHelper.name = 'scene-grid';
    scene.add(gridHelper);
}

/**
 * Adds axes helper to the scene (RGB = XYZ)
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {number} size - Length of the axes (default: 2)
 */
export function addAxes(scene, size = 2) {
    // Remove any existing axes first
    const existingAxes = scene.getObjectByName('scene-axes');
    if (existingAxes) {
        scene.remove(existingAxes);
    }
    
    const axesHelper = new THREE.AxesHelper(size);
    axesHelper.name = 'scene-axes';
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
 * Loads and adds a PLY model (Gaussian splat) to the scene
 * Uses custom loader to properly parse spherical harmonics color data
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {string} path - Path to the PLY file
 * @param {Object} options - Model options
 * @param {number[]} options.position - [x, y, z] position
 * @param {number} options.scale - Scale factor
 * @param {number[]} options.rotation - [x, y, z] rotation in radians
 * @returns {Promise<THREE.Object3D>} The loaded model
 */
export function addPLYModel(scene, path, { position = [0, 0, 0], scale = 1, rotation = [0, 0, 0] } = {}) {
    return new Promise((resolve, reject) => {
        const loader = new GaussianSplatPLYLoader();
        loader.load(
            path,
            (geometry) => {
                // Geometry already has position and color attributes from custom loader
                console.log('Gaussian splat PLY loaded with', geometry.attributes.position.count, 'points');

                // Create point material for visualization
                const material = new THREE.PointsMaterial({
                    size: 0.02,  // Visible point size
                    vertexColors: true,
                    sizeAttenuation: true,
                    transparent: false,
                    depthWrite: true,
                    depthTest: true
                });

                const points = new THREE.Points(geometry, material);
                points.position.set(position[0], position[1], position[2]);
                points.scale.setScalar(scale);
                points.rotation.set(rotation[0], rotation[1], rotation[2]);
                points.name = 'gaussian-splat-points';
                
                // Enable shadows for point clouds
                points.castShadow = true;
                points.receiveShadow = true;

                scene.add(points);
                console.log('Added Gaussian splat point cloud to scene');
                resolve(points);
            },
            (progress) => {
                if (progress && progress.lengthComputable) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    console.log(`Loading ${path}: ${percent}%`);
                }
            },
            (error) => {
                console.error(`Error loading PLY model from ${path}:`, error);
                reject(error);
            }
        );
    });
}

/**
 * Main scene loader - delegates to specific scene files
 * This is the main entry point for loading scenes
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {string} sceneType - The scene type ('table' or 'moon')
 * @returns {Object} References to grippable objects
 */
export async function addSceneObjects(scene, sceneType = 'table') {
    if (sceneType === 'moon') {
        return await addMoonScene(scene);
    } else {
        return await addTableScene(scene);
    }
}
