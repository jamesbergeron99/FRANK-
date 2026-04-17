const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { InworldClient } = require('@inworld/nodejs-sdk');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// This helps Frank find his desk even if Render is being difficult
const indexPath = path.join(__dirname, 'index.html');

app.get('/', (req, res) => {
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("Path error:", indexPath);
            res.status(404).send("Frank is lost. He's looking for index.html at: " + indexPath);
        }
    });
});

function cleanScript(text) {
    if (!text) return "";
    return text.split('\n')
        .filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0 && !/^\d+$/.test(trimmed) && !/^\(.*\)$/.test(trimmed);
        })
        .join('\n');
}

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No script provided." });

    try {
        const data = await pdf(req.file.buffer);
        const cleanedText = cleanScript(data.text);
        
        const frankFeedback = "I've reviewed your pages. The concept is divine, but the dialogue is a bit... dusty. Let's sharpen those wits, shall we?";

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
app.listen(PORT, () => console.log(`Frank is live.`));
