const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({limit: '50mb'})); 
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film and TV executive. 

STRICT CONTINUITY PROTOCOL:
- When the 'TV SERIES' mode is active, you are analyzing a multi-episode arc. 
- Identify if the current script is a Pilot or a sequel (Part 2, 3, etc.) by checking the filename and content.
- If it is a sequel, DO NOT treat it as a fresh start. Track character growth and plot momentum from the assumed previous episode.

STRICT OUTPUT CONTRACT (MANDATORY SECTIONS):
1. HOUSEKEEPING (SPAG): Provide a rigorous, line-by-line list of spelling, punctuation, and grammar errors with page numbers. (This was missing, fix it now).
2. THE TOP SHEET: Logline and Synopsis.
3. EXECUTIVE COVERAGE (DEEP DIVE): Pacing, Character Arcs (Lead/Opponent), Story Beats (A/B/C), and Dialogue with quotes.
4. THE VERDICT: GREEN LIGHT, CONSIDER, or PASS with massive justification.

VOCABULARY: Use "Coverage", "Lead", and "Opponent". 
SOLUTIONS: Every critique MUST have a creative fix.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages?" });
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            // This line ensures Frank sees the filename so he knows if it's "Episode 2"
            fullText += `\n--- SCRIPT FILENAME: ${file.originalname} ---\n` + data.text;
        }
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        
        // This tells the AI specifically how to use that TV Tab toggle
        const contextPrompt = mode === 'TV Series' 
            ? `TV MODE ACTIVE: This is part of a series. Scan for episode markers. If this is a sequel, analyze it as a continuation of the established story engine.` 
            : `FEATURE MODE ACTIVE: Analyze as a standalone three-act film.`;

        const result = await model.generateContent(`${contextPrompt}\n\nProvide the FULL Coverage and the line-by-line SPAG check:\n\n${fullText.substring(0, 100000)}`);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Frank is indisposed." }); }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(`CONVERSATIONAL: Talk shop. No report format. Message: ${req.body.message}`);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is active.`));
