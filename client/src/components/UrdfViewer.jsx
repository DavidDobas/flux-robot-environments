import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { addSceneObjects } from '../config/sceneObjects.js';

// We need to import the urdf-manipulator element definition to register it
let registrationPromise = null;

const registerUrdfManipulator = async () => {
    if (typeof window === 'undefined') return;
    if (customElements.get('urdf-viewer')) return;

    if (!registrationPromise) {
        registrationPromise = (async () => {
            try {
                const urdfModule = await import('urdf-loader/src/urdf-manipulator-element.js');
                const UrdfManipulatorElement = urdfModule.default;

                if (!customElements.get('urdf-viewer')) {
                    customElements.define('urdf-viewer', UrdfManipulatorElement);
                }
            } catch (e) {
                registrationPromise = null;
                throw e;
            }
        })();
    }

    return registrationPromise;
};

const UrdfViewer = React.forwardRef(({ urdfPath, onJointsLoaded, onCameraPoseChange, sceneType = 'table' }, ref) => {
    const internalRef = useRef(null);
    const grippableObjectsRef = useRef({ cube: null, cup: null });
    const grippedObjectRef = useRef(null);
    const gripperJointRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastGripperValueRef = useRef({ value: 0, closed: false });

    // Expose the viewer element with additional methods
    React.useImperativeHandle(ref, () => {
        const viewer = internalRef.current;
        if (!viewer) return null;

        // Return a proxy that forwards all property accesses to the viewer
        // while also exposing our custom captureFromPose method
        return new Proxy(viewer, {
            get(target, prop) {
                if (prop === 'captureFromPose') {
                    return (pose, sceneType = 'table', sessionId = null) => {
                        if (!target.scene || !target.renderer) {
                            console.error('Viewer not ready for capture');
                            return;
                        }

                        if (!sessionId) {
                            console.error('Session ID is required for capture');
                            return;
                        }

                        // Create a temporary camera with the specified pose
                        const tempCamera = new THREE.PerspectiveCamera(
                            target.camera.fov,
                            target.renderer.domElement.width / target.renderer.domElement.height,
                            target.camera.near,
                            target.camera.far
                        );

                        // Set position and rotation
                        tempCamera.position.set(pose.position.x, pose.position.y, pose.position.z);
                        tempCamera.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
                        tempCamera.updateMatrixWorld();

                        // Set white background for capture
                        const originalClearColor = new THREE.Color();
                        target.renderer.getClearColor(originalClearColor);
                        const originalClearAlpha = target.renderer.getClearAlpha();

                        target.renderer.setClearColor(0xffffff, 1);

                        // Render the scene from this camera
                        target.renderer.render(target.scene, tempCamera);

                        // Capture the image
                        const dataURL = target.renderer.domElement.toDataURL('image/png');

                        // Restore original background
                        target.renderer.setClearColor(originalClearColor, originalClearAlpha);

                        // Send to backend to save
                        const filename = `capture-${Date.now()}.png`;
                        fetch('http://localhost:3000/save-capture', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                imageData: dataURL,
                                filename: filename,
                                sceneType: sceneType,
                                sessionId: sessionId
                            })
                        })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    console.log('Capture saved to:', data.path);
                                } else {
                                    console.error('Failed to save capture:', data.error);
                                }
                            })
                            .catch(error => {
                                console.error('Error saving capture:', error);
                            });

                        // Restore normal rendering
                        target.renderer.render(target.scene, target.camera);
                    };
                }

                const value = target[prop];
                if (typeof value === 'function') {
                    return value.bind(target);
                }
                return value;
            }
        });
    }, []);

    useEffect(() => {
        const setupViewer = async () => {
            await registerUrdfManipulator();

            const viewer = internalRef.current;
            if (!viewer) return;

            // Wait for the scene to be ready
            const waitForScene = () => {
                return new Promise((resolve) => {
                    const checkScene = () => {
                        if (viewer.scene) {
                            resolve();
                        } else {
                            setTimeout(checkScene, 50);
                        }
                    };
                    checkScene();
                });
            };

            await waitForScene();

            // Setup viewer configuration
            viewer.up = '+Z';
            viewer.displayShadow = true;
            viewer.ambientColor = '#aaaaaa';

            // Setup light
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
            directionalLight.position.set(10, 10, 10);
            directionalLight.castShadow = false;
            viewer.scene.add(directionalLight);

            // Clear any existing scene objects (for scene switching or React StrictMode)
            const toRemove = [];
            viewer.scene.traverse((child) => {
                // Check if it's a Gaussian splat viewer (includes moon 'splat_*' and cat 'cat_splat_*')
                const isSplatViewer = child.name?.includes('splat_') && 
                                     (child.dispose !== undefined || child.userData?.gaussianViewer !== undefined);
                
                // Remove grippable objects (cube, cup, splats)
                if (child.name === 'cube' || 
                    child.name === 'cup' || 
                    child.name?.startsWith('splat_') ||
                    child.name?.startsWith('cat_splat_')) {
                    toRemove.push({ 
                        object: child, 
                        parent: child.parent,
                        isGaussianSplatViewer: isSplatViewer
                    });
                }
                // Remove grid and axes helpers
                if (child.name === 'scene-grid' || child.name === 'scene-axes') {
                    toRemove.push({ object: child, parent: child.parent });
                }
                // Remove PLY point clouds (basic rendering)
                if (child.type === 'Points' || child.name === 'gaussian-splat-points') {
                    toRemove.push({ object: child, parent: child.parent });
                }
            });
            if (toRemove.length > 0) {
                console.log(`Cleaning up ${toRemove.length} existing objects before loading new scene...`);
                toRemove.forEach(({ object, parent, isGaussianSplatViewer }) => {
                    if (parent) {
                        parent.remove(object);
                        
                        // Properly dispose GaussianSplats3D viewer (might be wrapped in Group)
                        if (isGaussianSplatViewer) {
                            console.log(`Disposing GaussianSplats3D viewer: ${object.name}`);
                            try {
                                // Check if viewer is in userData (wrapped in Group)
                                const viewer = object.userData?.gaussianViewer || object;
                                if (viewer.dispose) {
                                    viewer.dispose();
                                }
                            } catch (error) {
                                console.warn('Error disposing viewer:', error);
                            }
                        } else {
                            // Dispose geometry and material for regular objects
                            if (object.geometry) object.geometry.dispose();
                            if (object.material) {
                                if (Array.isArray(object.material)) {
                                    object.material.forEach(mat => mat.dispose());
                                } else {
                                    object.material.dispose();
                                }
                            }
                        }
                        console.log(`Removed existing ${object.name || object.type} (${object.uuid}) from scene`);
                    }
                });
            }
            
            // Add scene objects (grid, axes, cube, etc.) and store references
            const objects = await addSceneObjects(viewer.scene, sceneType);
            grippableObjectsRef.current = objects;
            console.log('Grippable objects loaded:', Object.keys(objects).filter(k => objects[k]));
            console.log('Grippable object details:', Object.entries(objects).map(([key, obj]) => ({
                key,
                name: obj?.name,
                type: obj?.type,
                hasPosition: !!obj?.position,
                hasGetWorldPosition: typeof obj?.getWorldPosition === 'function'
            })));
            
            // Debug: Check scene for duplicate objects
            const sceneObjects = [];
            viewer.scene.traverse((child) => {
                if (child.name === 'cube' || child.name === 'cup') {
                    sceneObjects.push({ name: child.name, uuid: child.uuid, parent: child.parent?.type });
                }
            });
            console.log('Objects in scene after loading:', sceneObjects);

            // Ensure renderer uses correct output color space
            if (viewer.renderer) {
                viewer.renderer.outputColorSpace = THREE.SRGBColorSpace;
            }

            // Track camera pose changes
            const updateCameraPose = () => {
                if (onCameraPoseChange && viewer.camera) {
                    const pos = viewer.camera.position;
                    const rot = viewer.camera.rotation;
                    onCameraPoseChange({
                        position: { x: pos.x, y: pos.y, z: pos.z },
                        rotation: { x: rot.x, y: rot.y, z: rot.z }
                    });
                }
            };

            // Listen to control changes
            if (viewer.controls) {
                viewer.controls.addEventListener('change', updateCameraPose);
            }

            // Load mesh function
            viewer.loadMeshFunc = (path, manager, done) => {
                const ext = path.split('.').pop().toLowerCase();
                const loader = ext === 'stl' ? new STLLoader(manager) : new GLTFLoader(manager);

                loader.load(
                    path,
                    (geometry) => {
                        if (ext === 'stl') {
                            const material = new THREE.MeshPhongMaterial();
                            const mesh = new THREE.Mesh(geometry, material);
                            done(mesh);
                        } else {
                            done(geometry.scene);
                        }
                    },
                    undefined,
                    (err) => {
                        console.error('Error loading mesh:', path, err);
                        done(null, err);
                    }
                );
            };

            // Helper function to find gripper link in the robot
            const findGripperLink = (robot) => {
                let gripperLink = null;
                robot.traverse((child) => {
                    // Look for gripper-related links (adjust name pattern based on your URDF)
                    if (child.name && (child.name.includes('gripper') || child.name.includes('jaw'))) {
                        gripperLink = child;
                    }
                });
                return gripperLink;
            };

            // Helper function to check if gripper is touching an object
            const isGripperTouchingObject = (gripperLink, object) => {
                if (!gripperLink || !object) return false;

                // Get world positions
                const gripperPos = new THREE.Vector3();
                gripperLink.getWorldPosition(gripperPos);

                const objectPos = new THREE.Vector3();
                
                // Ensure world matrix is up to date (important for DropInViewer objects)
                if (object.updateMatrixWorld) {
                    object.updateMatrixWorld(true);
                }
                
                // Try to get world position
                try {
                    object.getWorldPosition(objectPos);
                } catch {
                    // Fallback to object position if getWorldPosition fails
                    objectPos.copy(object.position);
                }

                // Simple distance-based collision detection
                const distance = gripperPos.distanceTo(objectPos);
                const threshold = 0.15; // Adjust this threshold based on your robot's size

                // Return distance for debugging, or false if not touching
                return distance < threshold ? distance : false;
            };

            // Helper function to attach object to gripper
            const attachObjectToGripper = (gripperLink, object) => {
                if (!gripperLink || !object) return;

                console.log(`Attaching ${object.name} to gripper. Current parent:`, object.parent?.type);

                // Store original parent BEFORE any changes
                object.userData.originalParent = object.parent;
                
                // Get world position and quaternion BEFORE removing from parent
                const worldPosition = new THREE.Vector3();
                const worldQuaternion = new THREE.Quaternion();
                const worldScale = new THREE.Vector3();
                
                object.updateMatrixWorld(true);
                object.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

                // IMPORTANT: Remove from current parent (scene)
                const oldParent = object.parent;
                if (oldParent) {
                    // Verify object is actually a child of the parent
                    const index = oldParent.children.indexOf(object);
                    console.log(`Removing ${object.name} from parent ${oldParent.type}, child index: ${index}`);
                    
                    if (index !== -1) {
                        oldParent.remove(object);
                        console.log(`Successfully removed ${object.name}, parent now has ${oldParent.children.length} children`);
                    } else {
                        console.error(`Object ${object.name} is not a child of its parent!`);
                    }
                }
                
                // Update gripper world matrix
                gripperLink.updateMatrixWorld(true);
                
                // Get gripper's world transform
                const gripperWorldPosition = new THREE.Vector3();
                const gripperWorldQuaternion = new THREE.Quaternion();
                const gripperWorldScale = new THREE.Vector3();
                gripperLink.matrixWorld.decompose(gripperWorldPosition, gripperWorldQuaternion, gripperWorldScale);

                // Calculate local transform relative to gripper
                const gripperWorldQuaternionInverse = gripperWorldQuaternion.clone().invert();
                
                // Local position = inverse(gripperRotation) * (worldPosition - gripperPosition)
                const localPosition = worldPosition.sub(gripperWorldPosition).applyQuaternion(gripperWorldQuaternionInverse);
                
                // Local rotation = inverse(gripperRotation) * worldRotation
                const localQuaternion = gripperWorldQuaternionInverse.multiply(worldQuaternion);

                // Apply local transform
                object.position.copy(localPosition);
                object.quaternion.copy(localQuaternion);
                object.scale.copy(worldScale);

                // Add to gripper
                gripperLink.add(object);
                
                // Force matrix updates throughout the hierarchy
                object.matrixWorldNeedsUpdate = true;
                object.updateMatrixWorld(true);
                
                // Force updates on all children (important for Group objects from OBJ loader)
                object.traverse((child) => {
                    child.matrixWorldNeedsUpdate = true;
                });

                console.log(`Attached ${object.name} to gripper. New parent:`, object.parent?.type, 'Children count:', gripperLink.children.length);
            };

            // Helper function to detach object from gripper
            const detachObjectFromGripper = (object) => {
                if (!object || !object.userData.originalParent) {
                    console.log(`Cannot detach ${object?.name}: no original parent`);
                    return;
                }

                console.log(`Detaching ${object.name} from gripper. Current parent:`, object.parent?.type);

                // Get world transform before detaching
                object.updateMatrixWorld(true);
                const worldMatrix = object.matrixWorld.clone();

                // Remove from gripper
                const oldParent = object.parent;
                if (oldParent) {
                    oldParent.remove(object);
                    console.log(`Removed ${object.name} from gripper`);
                }

                // Make sure object is detached
                object.parent = null;

                // Re-attach to original parent (scene)
                const originalParent = object.userData.originalParent;
                originalParent.updateMatrixWorld(true);

                // Calculate transform relative to original parent
                const parentInverse = new THREE.Matrix4().copy(originalParent.matrixWorld).invert();
                const localMatrix = new THREE.Matrix4().multiplyMatrices(parentInverse, worldMatrix);

                // Extract and apply local transform
                const localPosition = new THREE.Vector3();
                const localQuaternion = new THREE.Quaternion();
                const localScale = new THREE.Vector3();
                localMatrix.decompose(localPosition, localQuaternion, localScale);

                object.position.copy(localPosition);
                object.quaternion.copy(localQuaternion);
                object.scale.copy(localScale);
                object.updateMatrix();

                // Add back to original parent
                originalParent.add(object);
                
                // Force matrix updates throughout the hierarchy
                object.matrixWorldNeedsUpdate = true;
                object.updateMatrixWorld(true);
                
                // Force updates on all children (important for Group objects from OBJ loader)
                object.traverse((child) => {
                    child.matrixWorldNeedsUpdate = true;
                });

                // Clean up user data
                delete object.userData.originalParent;

                console.log(`Detached ${object.name} from gripper. New parent:`, object.parent?.type);
            };

            // Animation loop to check gripping conditions
            const checkGrippingConditions = () => {
                const robot = viewer.robot;
                if (!robot || !robot.joints) {
                    animationFrameRef.current = requestAnimationFrame(checkGrippingConditions);
                    return;
                }

                // Find gripper joint (adjust name based on your URDF)
                if (!gripperJointRef.current) {
                    for (const [name, joint] of Object.entries(robot.joints)) {
                        // Look for "gripper" but exclude fixed joints like "gripper_frame_joint"
                        // The actual gripper joint should be revolute, not fixed
                        if ((name.includes('gripper') || name.includes('jaw')) && 
                            joint._jointType !== 'fixed' &&
                            !name.includes('frame')) {
                            gripperJointRef.current = { name, joint };
                            console.log(`Found gripper joint: ${name}, type: ${joint._jointType}, limits: [${joint.limit.lower}, ${joint.limit.upper}]`);
                            break;
                        }
                    }
                    // Debug: if not found, list all joints
                    if (!gripperJointRef.current) {
                        console.log('Available joints:', Object.keys(robot.joints));
                    }
                }

                if (gripperJointRef.current) {
                    const gripperJoint = gripperJointRef.current.joint;
                    const gripperValue = gripperJoint.jointValue?.[0] || 0;

                    // Gripper range: -0.174533 (closed) to 1.74533 (open)
                    // Consider gripper closed when near the lower limit
                    const gripperClosedThreshold = -0.1; // Adjust this value as needed
                    const isGripperClosed = gripperValue < gripperClosedThreshold;
                    
                    // Only log when gripper state changes
                    if (Math.abs(gripperValue - lastGripperValueRef.current.value) > 0.01 || 
                        isGripperClosed !== lastGripperValueRef.current.closed) {
                        console.log(`Gripper value: ${gripperValue.toFixed(4)}, Closed: ${isGripperClosed}`);
                        lastGripperValueRef.current.value = gripperValue;
                        lastGripperValueRef.current.closed = isGripperClosed;
                    }

                    // Find gripper link in the scene
                    const gripperLink = findGripperLink(robot);

                    if (isGripperClosed && gripperLink) {
                        // Check if we're already gripping something
                        if (!grippedObjectRef.current) {
                            // Check each grippable object
                            let debugDistances = [];
                            for (const [key, object] of Object.entries(grippableObjectsRef.current)) {
                                if (object) {
                                    const result = isGripperTouchingObject(gripperLink, object);
                                    if (result !== false) {
                                        console.log(`Distance to ${object.name} (${key}): ${result.toFixed(4)} - GRIPPING!`);
                                        
                                        // Debug: Count objects before gripping and check structure
                                        const beforeCount = { cube: 0, cup: 0, cubeUUIDs: [], cupUUIDs: [] };
                                        const sceneStructure = [];
                                        viewer.scene.traverse((child) => {
                                            if (child.name === 'cube') {
                                                beforeCount.cube++;
                                                beforeCount.cubeUUIDs.push(child.uuid);
                                                sceneStructure.push({
                                                    name: 'cube',
                                                    uuid: child.uuid,
                                                    type: child.type,
                                                    parent: child.parent?.type,
                                                    hasGeometry: child.geometry !== undefined,
                                                    childCount: child.children?.length || 0
                                                });
                                            }
                                            if (child.name === 'cup') {
                                                beforeCount.cup++;
                                                beforeCount.cupUUIDs.push(child.uuid);
                                                sceneStructure.push({
                                                    name: 'cup',
                                                    uuid: child.uuid,
                                                    type: child.type,
                                                    parent: child.parent?.type,
                                                    hasGeometry: child.geometry !== undefined,
                                                    childCount: child.children?.length || 0
                                                });
                                            }
                                        });
                                        console.log('Objects in scene BEFORE grip:', beforeCount);
                                        console.log('Scene structure BEFORE grip:', sceneStructure);
                                        console.log('Object to grip:', {
                                            name: object.name,
                                            uuid: object.uuid,
                                            type: object.type,
                                            parent: object.parent?.type,
                                            childCount: object.children?.length || 0
                                        });
                                        
                                        attachObjectToGripper(gripperLink, object);
                                        grippedObjectRef.current = object;
                                        
                                        // Debug: Count objects after gripping
                                        const afterCount = { cube: 0, cup: 0, cubeUUIDs: [], cupUUIDs: [] };
                                        const afterStructure = [];
                                        viewer.scene.traverse((child) => {
                                            if (child.name === 'cube') {
                                                afterCount.cube++;
                                                afterCount.cubeUUIDs.push(child.uuid);
                                                afterStructure.push({
                                                    name: 'cube',
                                                    uuid: child.uuid,
                                                    type: child.type,
                                                    parent: child.parent?.type,
                                                    hasGeometry: child.geometry !== undefined
                                                });
                                            }
                                            if (child.name === 'cup') {
                                                afterCount.cup++;
                                                afterCount.cupUUIDs.push(child.uuid);
                                                afterStructure.push({
                                                    name: 'cup',
                                                    uuid: child.uuid,
                                                    type: child.type,
                                                    parent: child.parent?.type,
                                                    hasGeometry: child.geometry !== undefined
                                                });
                                            }
                                        });
                                        console.log('Objects in scene AFTER grip:', afterCount);
                                        console.log('Scene structure AFTER grip:', afterStructure);
                                        console.log('Gripped object:', {
                                            name: object.name,
                                            uuid: object.uuid,
                                            type: object.type,
                                            parent: object.parent?.type
                                        });
                                        
                                        break; // Only grip one object at a time
                                    } else {
                                        // Get actual distance for debugging
                                        const gripperPos = new THREE.Vector3();
                                        gripperLink.getWorldPosition(gripperPos);
                                        const objectPos = new THREE.Vector3();
                                        
                                        // Update world matrix and get position safely
                                        if (object.updateMatrixWorld) {
                                            object.updateMatrixWorld(true);
                                        }
                                        try {
                                            object.getWorldPosition(objectPos);
                                        } catch {
                                            objectPos.copy(object.position);
                                        }
                                        
                                        const actualDist = gripperPos.distanceTo(objectPos);
                                        debugDistances.push(`${key}(${object.name}): ${actualDist.toFixed(4)}`);
                                    }
                                }
                            }
                            if (debugDistances.length > 0 && Math.random() < 0.05) { // Log occasionally to avoid spam
                                console.log('Gripper closed but not touching. Distances:', debugDistances.join(', '));
                            }
                        }
                    } else {
                        // Gripper is open, release any gripped object
                        if (grippedObjectRef.current) {
                            detachObjectFromGripper(grippedObjectRef.current);
                            grippedObjectRef.current = null;
                        }
                    }
                }

                animationFrameRef.current = requestAnimationFrame(checkGrippingConditions);
            };

            // Event listener for when URDF is loaded
            const handleUrdfProcessed = () => {
                const r = viewer.robot;
                if (r) {
                    // Center robot
                    const box = new THREE.Box3().setFromObject(r);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);

                    const isoDirection = new THREE.Vector3(1, 1, 1).normalize();
                    const distance = maxDim * 2.0 || 2.0;
                    const position = center.clone().add(isoDirection.multiplyScalar(distance));

                    viewer.camera.position.copy(position);
                    viewer.camera.lookAt(center);
                    if (viewer.controls) {
                        viewer.controls.target.copy(center);
                        viewer.controls.update();
                    }

                    // Get joints - urdf-manipulator exposes joints directly on viewer
                    if (onJointsLoaded && viewer.robot && viewer.robot.joints) {
                        onJointsLoaded(viewer.robot.joints);
                    }

                    // Start gripping logic animation loop
                    checkGrippingConditions();
                }
            };

            viewer.addEventListener('urdf-processed', handleUrdfProcessed);

            // Set URDF path
            if (urdfPath) {
                viewer.urdf = urdfPath;
            }

            return () => {
                viewer.removeEventListener('urdf-processed', handleUrdfProcessed);
                if (viewer.controls) {
                    viewer.controls.removeEventListener('change', updateCameraPose);
                }
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                
                // Clean up gripped object reference
                if (grippedObjectRef.current) {
                    grippedObjectRef.current = null;
                }
            };
        };

        setupViewer();
    }, [urdfPath, onJointsLoaded, onCameraPoseChange, sceneType]);

    return (
        <urdf-viewer
            ref={internalRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        ></urdf-viewer>
    );
});

export default UrdfViewer;
