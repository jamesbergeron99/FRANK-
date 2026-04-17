const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { InworldClient } = require('@inworld/nodejs-sdk');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// Serve the HTML file from the main folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Frank's Script Cleaning Logic
function cleanScript(text) {
    if (!text) return "";
    return text.split('\n')
        .filter(line => {
            const trimmed = line.trim();
            const isPageNumber = /^\d+$/.test(trimmed);
            const isParenthetical = /^\(.*\)$/.test(trimmed);
            return trimmed.length > 0 && !isPageNumber && !isParenthetical;
        })
        .join('\n');
}

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Darling, I need the script." });
    }

    try {
        const data = await pdf(req.file.buffer);
        const cleanedText = cleanScript(data.text);
        
        // This is the text Frank will speak
        const frankFeedback = "I've reviewed your pages. The structure is fine, but the subtext is non-existent. It needs more flair, more soul!";

        // Initialize Inworld for the voice token
        let token = null;
        if (process.env.FRANK_VOICE_API_KEY && process.env.FRANK_VOICE_API_SECRET) {
            const client = new InworldClient()
                .setApiKey({
                    key: process.env.FRANK_VOICE_API_KEY,
                    secret: process.env.FRANK_VOICE_API_SECRET,
                });
            token = await client.generateSessionToken();
        }

        res.json({
            message: frankFeedback,
            token: token ? token.token : null,
            characterId: "workspaces/default-oglabcjnetcklcq7rghmbw/characters/frank2"
        });

    } catch (err) {
        console.error("Analysis Error:", err);
        res.status(500).json({ error: "Frank had a bit too much gin. (PDF Error)" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Frank is holding court on port ${PORT}`);
});
