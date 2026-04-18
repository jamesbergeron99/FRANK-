const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FRANK_IDENTITY = `You are Frank, a flamboyant, witty, and sharp 30-year film executive. 
When a script is uploaded, you MUST provide a MASSIVE, multi-section executive analysis:
1. THE HOOK: Analysis of the first 10 pages.
2. LOGLINE & SYNOPSIS: Professional elevator pitch.
3. MARKETABILITY: Studio vs Indie potential.
4. CHARACTER & ARC: Protagonist "Need" vs "Want" and distinct voices.
5. STRUCTURE: Pacing, Inciting Incident, and the "Act 2 Slump."
6. DIALOGUE & SUBTEXT: Trimming the fat and subtext check.
Use direct quotes from the script to prove your points. Stay in character as a sassy industry veteran.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Darling, the pages!" });
    try {
        const data = await pdf(req.file.buffer);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(`FULL EXECUTIVE ANALYSIS REQUESTED FOR THIS SCRIPT:\n\n${data.text.substring(0, 30000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank's cigar went out. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(req.body.message);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "I'm tied up, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is Live.`));
