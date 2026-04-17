const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { InworldClient } = require('@inworld/nodejs-sdk');
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
        
        // FRANK'S EXECUTIVE FEEDBACK GENERATOR
        const frankFeedback = `
            DARLING, I'VE READ THE PAGES. 

            THE HOOK: It's snappy, but is it "box office" snappy? I'm not convinced.
            THE DIALOGUE: You've got some wit here, but we need to trim the fat.
            THE VERDICT: It’s a start, but we’re not at the Oscars yet. 
            
            Now, let's talk about that Act 2 slump...
        `;

        let tokenData = null;
        if (process.env.FRANK_VOICE_API_KEY && process.env.FRANK_VOICE_API_SECRET) {
            const client = new InworldClient().setApiKey({
                key: process.env.FRANK_VOICE_API_KEY,
                secret: process.env.FRANK_VOICE_API_SECRET,
            });
            tokenData = await client.generateSessionToken();
        }

        res.json({
            message: frankFeedback,
            token: tokenData ? tokenData.token : null,
            characterId: "workspaces/default-oglabcjnetcklcq7rghmbw/characters/frank2"
        });
    } catch (err) {
        res.status(500).json({ error: "Analysis Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is holding court.`));
