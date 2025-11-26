import * as THREE from 'three';

/**
 * Custom PLY loader for Gaussian Splat files with spherical harmonics
 * Inspired by GaussianSplats3D's PLY parser
 */

const SH_C0 = 0.28209479177387814;

function parseHeader(headerText) {
    const lines = headerText.split('\n');
    let vertexCount = 0;
    const properties = [];
    
    for (const line of lines) {
        if (line.startsWith('element vertex')) {
            vertexCount = parseInt(line.split(' ')[2]);
        } else if (line.startsWith('property')) {
            const parts = line.split(' ');
            properties.push({
                type: parts[1],
                name: parts[2]
            });
        } else if (line === 'end_header') {
            break;
        }
    }
    
    return { vertexCount, properties, headerSize: headerText.indexOf('end_header') + 11 };
}

export class GaussianSplatPLYLoader {
    load(url, onLoad, onProgress, onError) {
        fetch(url)
            .then(response => {
                const total = parseInt(response.headers.get('content-length') || '0');
                let loaded = 0;
                
                const reader = response.body.getReader();
                const chunks = [];
                
                return reader.read().then(function processChunk({ done, value }) {
                    if (done) {
                        const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                        let offset = 0;
                        for (const chunk of chunks) {
                            buffer.set(chunk, offset);
                            offset += chunk.length;
                        }
                        return buffer.buffer;
                    }
                    
                    chunks.push(value);
                    loaded += value.length;
                    
                    if (onProgress && total) {
                        onProgress({ loaded, total, lengthComputable: true });
                    }
                    
                    return reader.read().then(processChunk);
                });
            })
            .then(buffer => {
                const geometry = this.parse(buffer);
                onLoad(geometry);
            })
            .catch(error => {
                if (onError) onError(error);
                console.error('Error loading PLY:', error);
            });
    }
    
    parse(buffer) {
        // Find header end
        const headerBytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 10000));
        const headerText = new TextDecoder().decode(headerBytes);
        const header = parseHeader(headerText);
        
        console.log('Parsed PLY header:', header);
        
        // Create property map
        const propMap = {};
        header.properties.forEach((prop, index) => {
            propMap[prop.name] = index;
        });
        
        // Read binary data
        const bytesPerVertex = header.properties.length * 4; // Assuming all floats
        const dataView = new DataView(buffer, header.headerSize);
        
        const positions = new Float32Array(header.vertexCount * 3);
        const colors = new Float32Array(header.vertexCount * 3);
        
        // Check if we have the needed properties
        const hasPosition = propMap.x !== undefined && propMap.y !== undefined && propMap.z !== undefined;
        const hasSH = propMap.f_dc_0 !== undefined && propMap.f_dc_1 !== undefined && propMap.f_dc_2 !== undefined;
        const hasRGB = propMap.red !== undefined && propMap.green !== undefined && propMap.blue !== undefined;
        
        console.log('PLY has:', { hasPosition, hasSH, hasRGB });
        
        for (let i = 0; i < header.vertexCount; i++) {
            const offset = i * bytesPerVertex;
            
            // Read position
            if (hasPosition) {
                positions[i * 3] = dataView.getFloat32(offset + propMap.x * 4, true);
                positions[i * 3 + 1] = dataView.getFloat32(offset + propMap.y * 4, true);
                positions[i * 3 + 2] = dataView.getFloat32(offset + propMap.z * 4, true);
            }
            
            // Read color (either from SH or RGB)
            if (hasSH) {
                const f_dc_0 = dataView.getFloat32(offset + propMap.f_dc_0 * 4, true);
                const f_dc_1 = dataView.getFloat32(offset + propMap.f_dc_1 * 4, true);
                const f_dc_2 = dataView.getFloat32(offset + propMap.f_dc_2 * 4, true);
                
                // Convert SH to RGB
                colors[i * 3] = Math.max(0, Math.min(1, 0.5 + SH_C0 * f_dc_0));
                colors[i * 3 + 1] = Math.max(0, Math.min(1, 0.5 + SH_C0 * f_dc_1));
                colors[i * 3 + 2] = Math.max(0, Math.min(1, 0.5 + SH_C0 * f_dc_2));
            } else if (hasRGB) {
                colors[i * 3] = dataView.getFloat32(offset + propMap.red * 4, true);
                colors[i * 3 + 1] = dataView.getFloat32(offset + propMap.green * 4, true);
                colors[i * 3 + 2] = dataView.getFloat32(offset + propMap.blue * 4, true);
            } else {
                // Default to white
                colors[i * 3] = 1;
                colors[i * 3 + 1] = 1;
                colors[i * 3 + 2] = 1;
            }
        }
        
        // Create geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        console.log('Created geometry with', header.vertexCount, 'vertices and', hasSH ? 'SH' : hasRGB ? 'RGB' : 'default', 'colors');
        
        return geometry;
    }
}


