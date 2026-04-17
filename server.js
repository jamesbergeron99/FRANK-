const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { InworldClient } = require('@inworld/nodejs-sdk');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// --- THE FIX IS HERE ---
// This tells Express to look for index.html in the SAME folder as server.js
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'), (err) => {
        if (err) {
            console.error("Could not find index.html:", err);
            res.status(404).send("Frank can't find his desk (index.html is missing from the root folder).");
        }
    });
});

// Logic to clean the script (No page numbers/parentheticals)
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
    if (!req.file) return res.status(400).json({ error: "No script provided." });

    try {
        const data = await pdf(req.file.buffer);
        const cleanedText = cleanScript(data.text);
        
        const frankFeedback = "Darling, I've seen some scripts in my time, but this... it needs work. Let's make it sparkle.";

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
        res.status(500).json({ error: "Analysis Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is on port ${PORT}`));
