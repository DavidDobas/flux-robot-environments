import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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

const UrdfViewer = React.forwardRef(({ urdfPath, onJointsLoaded }, ref) => {
    const localRef = useRef(null);
    const viewerRef = ref || localRef;

    useEffect(() => {
        const setupViewer = async () => {
            await registerUrdfManipulator();

            const viewer = viewerRef.current;
            if (!viewer) return;

            // Setup viewer configuration
            viewer.up = '+Z';
            viewer.displayShadow = true;
            viewer.ambientColor = '#aaaaaa';

            // Setup light
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
            directionalLight.position.set(10, 10, 10);
            directionalLight.castShadow = true;
            viewer.scene.add(directionalLight);

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
    }, [urdfPath, onJointsLoaded]);

    return (
        <urdf-viewer
            ref={viewerRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        ></urdf-viewer>
    );
});

export default UrdfViewer;
