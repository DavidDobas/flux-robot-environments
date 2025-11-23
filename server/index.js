const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Create captures directory if it doesn't exist
const capturesDir = path.join(__dirname, '..', 'captures');
if (!fs.existsSync(capturesDir)) {
    fs.mkdirSync(capturesDir, { recursive: true });
}

app.get('/', (req, res) => {
    res.send('Hello from Node.js server!');
});

// Endpoint to save camera captures
app.post('/save-capture', (req, res) => {
    try {
        const { imageData, filename } = req.body;

        if (!imageData) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        // Remove the data:image/png;base64, prefix
        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');

        // Generate filename with timestamp if not provided
        const finalFilename = filename || `robot-capture-${Date.now()}.png`;
        const filePath = path.join(capturesDir, finalFilename);

        // Write the file
        fs.writeFileSync(filePath, base64Data, 'base64');

        console.log(`Saved capture to: ${filePath}`);
        res.json({ success: true, filename: finalFilename, path: filePath });
    } catch (error) {
        console.error('Error saving capture:', error);
        res.status(500).json({ error: 'Failed to save image', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
