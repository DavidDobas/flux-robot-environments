const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Metadata update locks to prevent race conditions during parallel saves
const metadataLocks = new Map();

async function withMetadataLock(lockKey, operation) {
    // Get or create a promise chain for this lock key
    const existingLock = metadataLocks.get(lockKey) || Promise.resolve();
    
    // Create new promise that waits for existing operations
    const newLock = existingLock
        .then(() => operation())
        .catch((err) => {
            console.error('Error in locked operation:', err);
            throw err;
        });
    
    // Store the new promise in the lock map
    metadataLocks.set(lockKey, newLock);
    
    // Clean up after operation completes
    newLock.finally(() => {
        if (metadataLocks.get(lockKey) === newLock) {
            metadataLocks.delete(lockKey);
        }
    });
    
    return newLock;
}

// Create captures directory and subdirectories if they don't exist
const capturesDir = path.join(__dirname, '..', 'captures');
const tableCapturesDir = path.join(capturesDir, 'table');
const moonCapturesDir = path.join(capturesDir, 'moon');

if (!fs.existsSync(capturesDir)) {
    fs.mkdirSync(capturesDir, { recursive: true });
}
if (!fs.existsSync(tableCapturesDir)) {
    fs.mkdirSync(tableCapturesDir, { recursive: true });
}
if (!fs.existsSync(moonCapturesDir)) {
    fs.mkdirSync(moonCapturesDir, { recursive: true });
}

// Serve static files from captures directory
app.use('/captures', express.static(capturesDir));

app.get('/', (req, res) => {
    res.send('Hello from Node.js server!');
});

// Endpoint to save camera captures
app.post('/save-capture', (req, res) => {
    try {
        const { imageData, filename, sceneType = 'table', sessionId } = req.body;

        if (!imageData) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        // Validate scene type
        if (!['table', 'moon'].includes(sceneType)) {
            return res.status(400).json({ error: 'Invalid scene type. Must be "table" or "moon"' });
        }

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        // Remove the data:image/png;base64, prefix
        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');

        // Determine the base directory based on scene type
        const baseDir = sceneType === 'moon' ? moonCapturesDir : tableCapturesDir;
        
        // Create session directory if it doesn't exist
        const sessionDir = path.join(baseDir, sessionId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        // Generate filename with timestamp if not provided
        const finalFilename = filename || `capture-${Date.now()}.png`;
        const filePath = path.join(sessionDir, finalFilename);

        // Write the file
        fs.writeFileSync(filePath, base64Data, 'base64');

        console.log(`Saved ${sceneType} capture to session ${sessionId}: ${filePath}`);
        res.json({ success: true, filename: finalFilename, path: filePath, sceneType, sessionId });
    } catch (error) {
        console.error('Error saving capture:', error);
        res.status(500).json({ error: 'Failed to save image', details: error.message });
    }
});

// Endpoint to list sessions for a specific scene type
app.get('/sessions/:sceneType', (req, res) => {
    try {
        const { sceneType } = req.params;

        // Validate scene type
        if (!['table', 'moon'].includes(sceneType)) {
            return res.status(400).json({ error: 'Invalid scene type. Must be "table" or "moon"' });
        }

        const targetDir = sceneType === 'moon' ? moonCapturesDir : tableCapturesDir;

        // Read directory
        if (!fs.existsSync(targetDir)) {
            return res.json({ sessions: [] });
        }

        const entries = fs.readdirSync(targetDir);
        const sessions = [];

        entries.forEach(entry => {
            const entryPath = path.join(targetDir, entry);
            const stats = fs.statSync(entryPath);
            
            if (stats.isDirectory()) {
                // Count PNG files in the session directory
                const files = fs.readdirSync(entryPath).filter(f => f.endsWith('.png'));
                
                sessions.push({
                    sessionId: entry,
                    sceneType: sceneType,
                    captureCount: files.length,
                    created: stats.birthtime || stats.mtime,
                    modified: stats.mtime
                });
            }
        });

        // Sort by newest first
        sessions.sort((a, b) => b.created - a.created);

        res.json({ sessions });
    } catch (error) {
        console.error('Error listing sessions:', error);
        res.status(500).json({ error: 'Failed to list sessions', details: error.message });
    }
});

// Endpoint to list captures for a specific session
app.get('/sessions/:sceneType/:sessionId', (req, res) => {
    try {
        const { sceneType, sessionId } = req.params;

        // Validate scene type
        if (!['table', 'moon'].includes(sceneType)) {
            return res.status(400).json({ error: 'Invalid scene type. Must be "table" or "moon"' });
        }

        const baseDir = sceneType === 'moon' ? moonCapturesDir : tableCapturesDir;
        const sessionDir = path.join(baseDir, sessionId);

        // Check if session exists
        if (!fs.existsSync(sessionDir)) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const files = fs.readdirSync(sessionDir)
            .filter(file => file.endsWith('.png'))
            .map(file => ({
                filename: file,
                path: `${sceneType}/${sessionId}/${file}`,
                timestamp: fs.statSync(path.join(sessionDir, file)).mtime
            }))
            .sort((a, b) => a.timestamp - b.timestamp); // Sort by capture order

        res.json({ captures: files, sessionId, sceneType });
    } catch (error) {
        console.error('Error listing session captures:', error);
        res.status(500).json({ error: 'Failed to list captures', details: error.message });
    }
});

// Endpoint to list all generations for a session
app.get('/sessions/:sceneType/:sessionId/generations', (req, res) => {
    try {
        const { sceneType, sessionId } = req.params;

        // Validate scene type
        if (!['table', 'moon'].includes(sceneType)) {
            return res.status(400).json({ error: 'Invalid scene type. Must be "table" or "moon"' });
        }

        const baseDir = sceneType === 'moon' ? moonCapturesDir : tableCapturesDir;
        const generationsDir = path.join(baseDir, sessionId, 'generations');

        // Check if generations directory exists
        if (!fs.existsSync(generationsDir)) {
            return res.json({ generations: [] });
        }

        const generationDirs = fs.readdirSync(generationsDir)
            .filter(item => fs.statSync(path.join(generationsDir, item)).isDirectory());

        const generations = generationDirs.map(genId => {
            const genDir = path.join(generationsDir, genId);
            const files = fs.readdirSync(genDir).filter(f => f.endsWith('.png'));
            const stats = fs.statSync(genDir);
            
            // Read metadata if available
            const metadataPath = path.join(genDir, 'metadata.json');
            let metadata = null;
            if (fs.existsSync(metadataPath)) {
                try {
                    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                } catch (err) {
                    console.error('Error reading metadata:', err);
                }
            }
            
            return {
                generationId: genId,
                imageCount: files.length,
                created: stats.birthtime || stats.mtime,
                modified: stats.mtime,
                state: metadata?.state || (files.length === 1 ? 'first-complete' : 'batch-complete')
            };
        }).sort((a, b) => b.created - a.created); // Sort by newest first

        res.json({ generations, sessionId, sceneType });
    } catch (error) {
        console.error('Error listing generations:', error);
        res.status(500).json({ error: 'Failed to list generations', details: error.message });
    }
});

// Endpoint to list generated images for a specific generation
app.get('/sessions/:sceneType/:sessionId/generations/:generationId', (req, res) => {
    try {
        const { sceneType, sessionId, generationId } = req.params;

        // Validate scene type
        if (!['table', 'moon'].includes(sceneType)) {
            return res.status(400).json({ error: 'Invalid scene type. Must be "table" or "moon"' });
        }

        const baseDir = sceneType === 'moon' ? moonCapturesDir : tableCapturesDir;
        const generationDir = path.join(baseDir, sessionId, 'generations', generationId);

        // Check if generation directory exists
        if (!fs.existsSync(generationDir)) {
            return res.json({ generatedImages: {} });
        }

        const files = fs.readdirSync(generationDir)
            .filter(file => file.endsWith('.png'));

        // Parse filenames to get indices (generated-0.png -> 0)
        const generatedImages = {};
        files.forEach(file => {
            const match = file.match(/generated-(\d+)\.png/);
            if (match) {
                const index = parseInt(match[1]);
                generatedImages[index] = `${sceneType}/${sessionId}/generations/${generationId}/${file}`;
            }
        });

        // Read metadata if available
        const metadataPath = path.join(generationDir, 'metadata.json');
        let metadata = null;
        if (fs.existsSync(metadataPath)) {
            try {
                metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            } catch (err) {
                console.error('Error reading metadata:', err);
            }
        }

        // Determine state if no metadata
        const state = metadata?.state || (Object.keys(generatedImages).length === 1 ? 'first-complete' : 'batch-complete');
        
        // Include prompts in response if available
        const prompts = metadata?.prompts || null;

        res.json({ generatedImages, sessionId, sceneType, generationId, state, prompts });
    } catch (error) {
        console.error('Error listing generated images:', error);
        res.status(500).json({ error: 'Failed to list generated images', details: error.message });
    }
});

// Endpoint to save generated images
app.post('/save-generated', async (req, res) => {
    try {
        const { imageUrl, sessionId, sceneType, index, generationId, prompts } = req.body;

        if (!imageUrl || !sessionId || !sceneType || index === undefined || !generationId) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Validate scene type
        if (!['table', 'moon'].includes(sceneType)) {
            return res.status(400).json({ error: 'Invalid scene type' });
        }

        const baseDir = sceneType === 'moon' ? moonCapturesDir : tableCapturesDir;
        const sessionDir = path.join(baseDir, sessionId);
        const generationsDir = path.join(sessionDir, 'generations');
        const generationDir = path.join(generationsDir, generationId);

        // Create generation directory if it doesn't exist
        if (!fs.existsSync(generationDir)) {
            fs.mkdirSync(generationDir, { recursive: true });
        }

        const metadataPath = path.join(generationDir, 'metadata.json');
        const filename = `generated-${index}.png`;
        const filePath = path.join(generationDir, filename);

        // Fetch the image from the URL
        const https = require('https');
        const http = require('http');
        const protocol = imageUrl.startsWith('https') ? https : http;

        protocol.get(imageUrl, (response) => {
            if (response.statusCode !== 200) {
                return res.status(500).json({ error: 'Failed to fetch image from URL' });
            }

            const fileStream = fs.createWriteStream(filePath);
            response.pipe(fileStream);

            fileStream.on('finish', async () => {
                fileStream.close();
                console.log(`Saved generated image to: ${filePath}`);
                
                // Update metadata with lock to prevent race conditions
                try {
                    const lockKey = `metadata-${generationId}`;
                    const metadata = await withMetadataLock(lockKey, () => {
                        // Read current metadata
                        let metadata = { generationId, created: new Date().toISOString(), images: {} };
                        if (fs.existsSync(metadataPath)) {
                            try {
                                const content = fs.readFileSync(metadataPath, 'utf8');
                                metadata = JSON.parse(content);
                            } catch (err) {
                                console.error('Error reading metadata:', err);
                            }
                        }
                        
                        // Update metadata
                        metadata.images[index] = { saved: new Date().toISOString() };
                        metadata.totalImages = Object.keys(metadata.images).length;
                        metadata.lastUpdated = new Date().toISOString();
                        
                        // Store prompts (only on first image save)
                        if (prompts && index === 0) {
                            metadata.prompts = prompts;
                            console.log('Saved prompts to metadata:', prompts);
                        }
                        
                        // Determine state based on images
                        if (metadata.totalImages === 1 && metadata.images['0']) {
                            metadata.state = 'first-complete';
                        } else if (metadata.totalImages > 1) {
                            metadata.state = 'batch-complete';
                        }
                        
                        // Write metadata atomically
                        const tempPath = metadataPath + '.tmp';
                        fs.writeFileSync(tempPath, JSON.stringify(metadata, null, 2));
                        fs.renameSync(tempPath, metadataPath);
                        
                        return metadata;
                    });
                    
                    console.log(`Updated metadata for image ${index}, total: ${metadata.totalImages}`);
                    res.json({ 
                        success: true, 
                        filename: filename, 
                        path: `${sceneType}/${sessionId}/generations/${generationId}/${filename}`,
                        generationId,
                        metadata
                    });
                } catch (metadataErr) {
                    console.error('Error updating metadata:', metadataErr);
                    res.json({ 
                        success: true, 
                        filename: filename, 
                        path: `${sceneType}/${sessionId}/generations/${generationId}/${filename}`,
                        generationId,
                        warning: 'Image saved but metadata update failed'
                    });
                }
            });

            fileStream.on('error', (err) => {
                console.error('Error writing file:', err);
                res.status(500).json({ error: 'Failed to save image', details: err.message });
            });
        }).on('error', (err) => {
            console.error('Error fetching image:', err);
            res.status(500).json({ error: 'Failed to fetch image', details: err.message });
        });
    } catch (error) {
        console.error('Error saving generated image:', error);
        res.status(500).json({ error: 'Failed to save image', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
