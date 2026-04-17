const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No script provided." });

    try {
        const data = await pdf(req.file.buffer);
        
        // Frank's Analysis Output
        const frankFeedback = "Darling, I've read the pages. The concept is divine, but the dialogue is a bit... dusty. Let's sharpen those wits, shall we?";

        res.json({
            message: frankFeedback,
            // We send the API Key directly to the front-end for the simple connection
            apiKey: process.env.FRANK_VOICE_API_KEY,
            characterId: "workspaces/default-oglabcjnetcklcq7rghmbw/characters/frank2"
        });
    } catch (err) {
        res.status(500).json({ error: "Analysis Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is holding court.`));
