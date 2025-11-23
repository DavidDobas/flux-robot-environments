# Gaussian Splats Rendering Upgrade

## Summary

Upgraded the moon scene to use **@mkkellogg/gaussian-splats-3d** library for proper Gaussian splat rendering instead of basic point cloud visualization.

## What Changed

### 1. **Installed GaussianSplats3D Library**
```bash
npm install @mkkellogg/gaussian-splats-3d
```

### 2. **Updated `moonScene.js`**
- Now uses `GaussianSplats3D.DropInViewer` for proper rendering
- Gaussian splats are rendered with optimized shaders and sorting
- Rotation parameter changed from Euler angles to quaternions
- Scale parameter changed from single value to array `[x, y, z]`

**Before (Basic Point Cloud):**
```javascript
await addPLYModel(scene, path, {
    position: [0, 0, 0],
    scale: 1,
    rotation: [0, 0, 0]  // Euler angles
});
```

**After (Proper Gaussian Splats):**
```javascript
const viewer = new GaussianSplats3D.DropInViewer({ ... });
await viewer.addSplatScenes([{
    path: '/assets/moon_scene/sam3d-splat (10).ply',
    position: [0, 0, 0],
    scale: [0.1, 0.1, 0.1],
    rotation: [0, 0, 0, 1]  // Quaternion
}]);
scene.add(viewer);
```

### 3. **Updated `UrdfViewer.jsx`**
- Added proper cleanup for GaussianSplats3D viewer instances
- Calls `viewer.dispose()` when switching scenes to prevent memory leaks

### 4. **Updated Documentation**
- `README.md` now includes GaussianSplats3D usage instructions
- Added notes about CORS configuration for SharedArrayBuffer (optional)
- Documented viewer parameters

## Benefits

✅ **Much Better Visual Quality** - Proper Gaussian splat rendering with custom shaders  
✅ **Optimized Performance** - WebAssembly-based sorting and GPU acceleration  
✅ **Proper Rendering** - Not just point clouds, but actual Gaussian splatting technique  
✅ **Spherical Harmonics** - Support for view-dependent effects (if in PLY files)  
✅ **Professional Library** - Battle-tested Three.js-based implementation  

## Configuration

### Basic Configuration

Edit `MOON_SCENE_SPLATS` in `moonScene.js`:

```javascript
const MOON_SCENE_SPLATS = [
    {
        path: '/assets/moon_scene/sam3d-splat (10).ply',
        position: [0, 0, 0],           // [x, y, z]
        scale: [0.1, 0.1, 0.1],        // [x, y, z]
        rotation: [0, 0, 0, 1]         // Quaternion [x, y, z, w]
    },
    // Add more splats...
];
```

### Advanced Viewer Options

Modify viewer creation in `addMoonScene()`:

```javascript
const viewer = new GaussianSplats3D.DropInViewer({
    'gpuAcceleratedSort': true,              // GPU acceleration
    'halfPrecisionCovariancesOnGPU': true,   // 16-bit precision
    'sharedMemoryForWorkers': false,         // Use SharedArrayBuffer (requires CORS)
    'integerBasedSort': false,               // Float-based for larger scenes
    'dynamicScene': true,                    // Allow dynamic updates
    'sphericalHarmonicsDegree': 0,           // 0, 1, or 2
    'splatAlphaRemovalThreshold': 5          // Per-scene alpha threshold
});
```

## Testing

1. Navigate to http://localhost:5173/
2. Go to the robot page
3. Click "Moon Scene" button
4. You should see properly rendered Gaussian splats instead of point clouds

## Performance Notes

- Default configuration uses `sharedMemoryForWorkers: false` to avoid CORS setup
- For production or better performance, enable SharedArrayBuffer with proper CORS headers
- See `client/src/config/README.md` for CORS configuration instructions

## Resources

- GaussianSplats3D GitHub: https://github.com/mkkellogg/GaussianSplats3D
- Original Paper: https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/
- Demo: https://projects.markkellogg.org/threejs/demo_gaussian_splats_3d.php

