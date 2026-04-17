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

app.post('/analyze', upload.single('script'), async (req, res) => {
    // Analysis logic...
    res.json({
        message: "I've reviewed the pages. Snappy dialogue, but the protagonist is a bore. Change my mind.",
        apiKey: process.env.FRANK_VOICE_API_KEY,
        characterId: "workspaces/default-oglabcjnetcklcq7rghmbw/characters/frank2"
    });
});

// NEW CHAT ENDPOINT
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;
    
    // This is where the real Frank-brain will live. 
    // For now, he responds with his characteristic sass.
    const frankResponse = "Oh, darling, you're defending that scene? It's derivative, but I admire your passion. Tell me more.";

    res.json({ message: frankResponse });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank's office is open.`));
