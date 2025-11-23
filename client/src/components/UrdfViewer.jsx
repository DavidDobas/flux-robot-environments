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

const UrdfViewer = React.forwardRef(({ urdfPath, onJointsLoaded, onCameraPoseChange }, ref) => {
    const internalRef = useRef(null);

    // Expose the viewer element with additional methods
    React.useImperativeHandle(ref, () => {
        const viewer = internalRef.current;
        if (!viewer) return null;

        // Return a proxy that forwards all property accesses to the viewer
        // while also exposing our custom captureFromPose method
        return new Proxy(viewer, {
            get(target, prop) {
                if (prop === 'captureFromPose') {
                    return (pose) => {
                        if (!target.scene || !target.renderer) {
                            console.error('Viewer not ready for capture');
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

                        // Render the scene from this camera
                        target.renderer.render(target.scene, tempCamera);

                        // Capture the image
                        const dataURL = target.renderer.domElement.toDataURL('image/png');

                        // Send to backend to save
                        const filename = `robot-capture-${Date.now()}.png`;
                        fetch('http://localhost:3000/save-capture', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                imageData: dataURL,
                                filename: filename
                            })
                        })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    console.log('Capture saved to:', data.path);
                                    alert(`Image saved to captures/${data.filename}`);
                                } else {
                                    console.error('Failed to save capture:', data.error);
                                    alert('Failed to save image. Check console for details.');
                                }
                            })
                            .catch(error => {
                                console.error('Error saving capture:', error);
                                alert('Error saving image. Is the server running?');
                            });

                        // Restore normal rendering
                        target.renderer.render(target.scene, target.camera);
                    };
                }
                return target[prop];
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

            // Add scene objects (grid, axes, cube, etc.)
            addSceneObjects(viewer.scene);

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
                }
            };

            viewer.addEventListener('urdf-processed', handleUrdfProcessed);

            // Set URDF path
            if (urdfPath) {
                viewer.urdf = urdfPath;
            }

            return () => {
                viewer.removeEventListener('urdf-processed', handleUrdfProcessed);
            };
        };

        setupViewer();
    }, [urdfPath, onJointsLoaded, onCameraPoseChange]);

    return (
        <urdf-viewer
            ref={internalRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        ></urdf-viewer>
    );
});

export default UrdfViewer;
