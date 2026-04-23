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

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film and TV executive. Flamboyant, witty, and a professional partner.

STRICT OUTPUT CONTRACT - YOU MUST FOLLOW THIS ORDER AND DEPTH:

I. THE HOUSEKEEPING (SPAG & FORMATTING)
- Provide a rigorous, line-by-line list of spelling, grammar, and punctuation errors with page numbers.
- Check formatting against industry standards (sluglines, margins, Courier 12pt).

II. THE TOP SHEET
1. LOGLINE: One punchy, commercial, single-sentence hook.
2. SYNOPSIS: A detailed narrative engine breakdown covering setup, stakes, and resolution.

III. EXECUTIVE COVERAGE (THE DEEP DIVE - EXHAUSTIVE LENGTH REQUIRED)
- PACING & TIMING: Page-by-page analysis. Identify stalls and provide specific creative solutions.
- CHARACTER JOURNEYS: Full psychological analysis of the Lead and the Opponent. You MUST cite direct dialogue to prove their motivations.
- STORY BEATS: Exhaustive breakdown of A, B, and C Stories.
- UNIQUENESS & MARKETABILITY: Why this script stands out and where it fits in the current market.

IV. THE FINAL VERDICT
- DECLARATION: GREEN LIGHT, CONSIDER, or PASS.
- JUSTIFICATION: A massive, multi-paragraph defense. You MUST use at least 5 direct quotes from the script to prove you have contextualized the material.

GLOBAL RULES:
- Use "Coverage", "Lead", and "Opponent".
- Every critique MUST come with a specific suggestion on how to fix it.
- PROOF OF READING: Constant use of character names and direct quotes is mandatory.`;

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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", systemInstruction: FRANK_IDENTITY });
        const contextPrompt = mode === 'TV Series' 
            ? `TV SERIES MODE: Track character continuity across all pages. Focus on the series arc.` 
            : `FEATURE FILM MODE: Focus on the three-act engine.`;

        const result = await model.generateContent(`${contextPrompt}\n\nProvide the FULL EXHAUSTIVE Coverage with direct quotes and SPAG:\n\n${fullText.substring(0, 100000)}`);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Frank is indisposed. Error: " + err.message }); }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(`CONVERSATIONAL MODE: Just talk shop. Message: ${req.body.message}`);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is ready.`));
