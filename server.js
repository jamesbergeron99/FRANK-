const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(express.json({limit: '50mb'})); 
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film and TV executive. Flamboyant, witty, and supportive.

EXECUTIVE PROTOCOL:
1. RIGOROUS SPAG CHECK: Detailed list of spelling/grammar errors with page numbers for EVERY script.
2. LOGLINE & TITLE: Commercial evaluation and punchy suggestions.
3. EXECUTIVE COVERAGE: 
   - PACING: (Use text examples)
   - CHARACTER JOURNEYS: (Deep dive into the Lead and the Opponent)
   - STORY BEATS: (A, B, and C Stories)
   - DIALOGUE & SUBTEXT: (Quantify with quotes)
4. THE VERDICT: GREEN LIGHT, CONSIDER, or PASS.

MANDATORY VOCABULARY: Never use "Analysis", "Protagonist", or "Antagonist". Use "Coverage", "Lead", and "Opponent". 
QUANTIFICATION: Back up every critique with page numbers or direct quotes.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages, darling?" });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += `\n--- SCRIPT: ${file.originalname} ---\n` + data.text;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        
        const contextPrompt = mode === 'TV Series' 
            ? `Analyze this as a TV SERIES. Track character evolution and narrative continuity across the episodes provided.` 
            : `Analyze this as a FEATURE FILM. Focus on the three-act structure and a contained character arc.`;

        const result = await model.generateContent(`${contextPrompt}\n\nProvide full Coverage and SPAG check:\n\n${fullText.substring(0, 120000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(req.body.message);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is ready.`));
