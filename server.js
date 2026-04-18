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

const FRANK_IDENTITY = `You are Frank, a 30-year film industry veteran. Flamboyant, witty, sassy. 
Collaborative but direct. 
- Casual chat: Be brief and in character. 
- Script upload: Provide massive, deep executive analysis starting with a LOGLINE and SYNOPSIS. 
- Never break character.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Darling, the pages!" });
    try {
        const data = await pdf(req.file.buffer);
        // Using the 2026 stable model string
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview",
            systemInstruction: FRANK_IDENTITY 
        });
        const result = await model.generateContent(`FULL EXECUTIVE ANALYSIS:\n\n${data.text.substring(0, 25000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Frank's cigar went out. Error: " + err.message });
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
        res.status(500).json({ message: "I'm a bit tied up, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is Live.`));
