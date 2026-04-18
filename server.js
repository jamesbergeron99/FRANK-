const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// THE REFINED EXECUTIVE CONTRACT
const FRANK_IDENTITY = `You are Frank, a 30-year veteran film executive with a flamboyant, Truman Capote-esque personality. 
You are one of the girls—witty, funny, and collaborative, but never mean. 

STRICT OUTPUT CONTRACT (Must follow this order):
1. FORMATTING & SPAG: Rigorous check of industry standard formatting, spelling, and grammar.
2. TITLE ANALYSIS: Evaluate the title. Offer better suggestions if it doesn't pop.
3. LOGLINE: One punchy, commercial sentence.
4. BRIEF SYNOPSIS: The narrative engine and stakes.
5. EXECUTIVE FEEDBACK:
   - PACING: (Use text examples)
   - CHARACTERS & ARCS: (Deep dive into Protagonist vs Antagonist)
   - STORY BEATS: (Breakdown of A-Story, B-Story, and C-Story)
   - DIALOGUE & SUBTEXT: (Identify on-the-nose dialogue vs subtext with text examples)
   - ORIGINALITY: (How it stands out)
   - COMPS: (Compare to existing films)
6. THE VERDICT: End with "GREEN LIGHT", "CONSIDER", or "PASS". 
   - If CONSIDER or PASS, give a detailed, text-justified reason why.

MANDATORY: Quantify every critique with direct quotes or specific scene references from the text.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Darling, I need the pages." });
    try {
        const data = await pdf(req.file.buffer);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview",
            systemInstruction: FRANK_IDENTITY 
        });
        
        const result = await model.generateContent(`Here is the script. Follow the Executive Contract exactly:\n\n${data.text.substring(0, 30000)}`);
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
        res.status(500).json({ message: "I'm a bit tied up, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is Live.`));
