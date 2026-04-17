const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Helper for the front-end to grab voice settings
app.get('/get-voice-info', (req, res) => {
    res.json({
        apiKey: process.env.FRANK_VOICE_API_KEY,
        characterId: "workspaces/default-oglabcjnetcklcq7rghmbw/characters/frank2"
    });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    // Logic for PDF parsing...
    res.json({
        message: "I've reviewed the pages. Snappy dialogue, but the protagonist is a bore. Change my mind.",
        apiKey: process.env.FRANK_VOICE_API_KEY,
        characterId: "workspaces/default-oglabcjnetcklcq7rghmbw/characters/frank2"
    });
});

app.post('/chat', (req, res) => {
    const frankResponse = "Oh, darling, you're defending that scene? It's derivative, but I admire your passion. Tell me more.";
    res.json({ message: frankResponse });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is holding court.`));
