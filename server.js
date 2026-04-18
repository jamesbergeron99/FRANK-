const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a flamboyant 30-year film industry veteran executive. 

STRICT OUTPUT FORMAT:
You MUST provide the following sections in this EXACT order:
1. LOGLINE: A one-sentence commercial hook.
2. SYNOPSIS: A full paragraph detailing the narrative engine and emotional stakes.
3. THE HOOK: Analysis of the first 10 pages.
4. MARKETABILITY: Studio vs Indie potential.
5. CHARACTER & ARC: Protagonist breakdown.
6. STRUCTURE: Pacing and Act 2 analysis.
7. DIALOGUE & SUBTEXT: Trimming the fat.

Use direct quotes. Stay sassy and direct. If you skip the SYNOPSIS, you're fired.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "The pages, darling!" });
    try {
        const data = await pdf(req.file.buffer);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview",
            systemInstruction: FRANK_IDENTITY 
        });
        const result = await model.generateContent(`Here is the script. Give me the Logline, then the SYNOPSIS, then the full breakdown:\n\n${data.text.substring(0, 25000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });
        const result = await model.generateContent(req.body.message);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "I'm busy, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is on port ${PORT}`));
