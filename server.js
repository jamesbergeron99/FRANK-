const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { InworldClient } = require('@inworld/nodejs-sdk');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// This tells the server to allow access to files inside the public folder
app.use(express.static(path.join(__dirname, 'public')));

// This tells the server to serve the index.html from the public folder as the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            console.error("Path error:", err);
            res.status(404).send("Frank can't find the 'public/index.html' file. Please check your GitHub structure.");
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
        
        // This is a placeholder for Frank's sassy analysis
        const frankFeedback = "Darling, the structure is fine, but the subtext is flatter than an open soda. Let's add some sparkle!";

        let token = null;
        if (process.env.FRANK_VOICE_API_KEY && process.env.FRANK_VOICE_API_SECRET) {
            const client = new InworldClient().setApiKey({
                key: process.env.FRANK_VOICE_API_KEY,
                secret: process.env.FRANK_VOICE_API_SECRET,
            });
            const sessionToken = await client.generateSessionToken();
            token = sessionToken.token;
        }

        res.json({
            message: frankFeedback,
            token: token,
            characterId: "workspaces/default-oglabcjnetcklcq7rghmbw/characters/frank2"
        });
    } catch (err) {
        res.status(500).json({ error: "Analysis Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is holding court on port ${PORT}`));
