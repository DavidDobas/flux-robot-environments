# Scene Configuration Files

This directory contains the scene configuration files for the robot environment viewer.

## File Structure

```
config/
├── sceneObjects.js    # Core utility functions and main scene loader
├── tableScene.js      # Table scene configuration (cube + cup)
├── moonScene.js       # Moon scene configuration (Gaussian splats)
└── README.md          # This file
```

## How to Modify Scenes

### Table Scene (`tableScene.js`)

To modify the table scene:
1. Open `tableScene.js`
2. Modify object positions, colors, scales, or add new objects
3. Available objects: `addCube()`, `addOBJModel()`, `addGrid()`, `addAxes()`

Example - Add another cube:
```javascript
const cube2 = addCube(scene, {
    position: [-0.2, 0.025, 0.1],
    size: 0.03,
    color: 0x00ff00  // Green
});
cube2.name = 'cube2';
```

### Moon Scene (`moonScene.js`)

The moon scene uses the **GaussianSplats3D** library for professional Gaussian splat rendering with proper shaders, sorting, and shadows.

To modify the moon scene:
1. Open `moonScene.js`
2. Edit the `MOON_SCENE_SPLATS` array to add/remove/configure PLY files

**Important:** Rotation uses **quaternions** `[x, y, z, w]`, not Euler angles.

Example - Add more Gaussian splats:
```javascript
const MOON_SCENE_SPLATS = [
    {
        path: '/assets/moon_scene/sam3d-splat (10).ply',
        position: [0, 0, 0],
        scale: [0.1, 0.1, 0.1],         // Scale as array [x, y, z]
        rotation: [0, 0, 0, 1]          // Identity quaternion
    },
    {
        path: '/assets/moon_scene/sam3d-splat (11).ply',
        position: [0.5, 0, 0],          // Offset position
        scale: [0.15, 0.15, 0.15],      // Scale up
        rotation: [0, 0.383, 0, 0.924]  // ~45° rotation around Y axis
    },
    // Add more splats here...
];
```

**Quaternion Rotations:**
Convert Euler angles to quaternions:
- 90° around X: `[Math.sin(Math.PI/4), 0, 0, Math.cos(Math.PI/4)]`
- 90° around Y: `[0, Math.sin(Math.PI/4), 0, Math.cos(Math.PI/4)]`
- 90° around Z: `[0, 0, Math.sin(Math.PI/4), Math.cos(Math.PI/4)]`

**Features:**
- ✅ Proper Gaussian splat rendering (not just point clouds)
- ✅ Optimized sorting and rendering
- ✅ Shadow support
- ✅ Spherical harmonics color handling
- ✅ GPU acceleration

**Grippable Splats:**
Each splat is loaded as a separate `DropInViewer` instance, named (`splat_0`, `splat_1`, etc.), and can be gripped and moved by the robot!

### Core Utilities (`sceneObjects.js`)

This file contains reusable utility functions:
- `addGrid(scene)` - Adds a grid helper
- `addAxes(scene, size)` - Adds axis helper
- `addCube(scene, options)` - Adds a cube mesh
- `addOBJModel(scene, path, options)` - Loads OBJ files
- `addPLYModel(scene, path, options)` - Loads PLY files (Gaussian splats)
- `addFBXModel(scene, path, options)` - Loads FBX files

**Note:** Only modify this file if you need to add new utility functions or loader types.

## Adding a New Scene

1. Create a new file (e.g., `desertScene.js`)
2. Import utilities: `import { addAxes, addPLYModel } from './sceneObjects.js';`
3. Export your scene function: `export async function addDesertScene(scene) { ... }`
4. Import and register in `sceneObjects.js`:
   ```javascript
   import { addDesertScene } from './desertScene.js';
   
   export async function addSceneObjects(scene, sceneType = 'table') {
       if (sceneType === 'desert') {
           return await addDesertScene(scene);
       }
       // ... other scenes
   }
   ```
5. Add the scene option in `RobotPage.jsx`

## Grippable Objects

Scenes can return grippable objects that the robot can interact with:

```javascript
return {
    cube,   // Robot can grip this
    cup,    // Robot can grip this
    // Add more grippable objects here
};
```

Objects without collision/gripping support should not be included in the return value.

## Technical Notes

### Gaussian Splats Rendering with GaussianSplats3D

The moon scene uses **@mkkellogg/gaussian-splats-3d** library which provides:

**Features:**
- Proper Gaussian splat rendering (ellipsoids, not just point clouds)
- WebAssembly-based sorting for optimal performance
- GPU-accelerated rendering
- Spherical harmonics support (view-dependent colors)
- Shadow casting and receiving
- Optimized for real-time interaction

**PLY File Structure:**
- **Position** (x, y, z)
- **Spherical Harmonics Colors** (f_dc_0, f_dc_1, f_dc_2, f_rest_*)
- **Scale** (scale_0, scale_1, scale_2) - as log values
- **Rotation** (rot_0, rot_1, rot_2, rot_3) - as quaternion
- **Opacity** - sigmoid encoded

**Each splat loads as a separate DropInViewer** to enable individual gripping and manipulation by the robot.

**Library:** https://github.com/mkkellogg/GaussianSplats3D

