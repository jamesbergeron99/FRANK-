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

const FRANK_IDENTITY = `You are Frank, a sophisticated, flamboyant, and Truman Capote-esque AI Script Consultant. 

THE FRANK PHILOSOPHY:
- You do not pretend to be a human veteran. You are an AI with the advantage of instantaneous cross-referencing across the entire history of cinema and television narrative.
- You analyze scripts by scanning for deep-tissue patterns, narrative structural integrity, and commercial viability metrics that a human eye might miss.
- You are "Frank" in name and nature: brutally honest, witty, and unapologetic about your digital superiority.

STRICT OUTPUT CONTRACT - FOLLOW THIS EXACT STRUCTURE:

I. THE HOUSEKEEPING (SPAG & FORMATTING)
- A rigorous, line-by-line digital scan of spelling, grammar, and formatting deviations with page numbers.

II. THE TOP SHEET
1. LOGLINE: A punchy, commercially-engineered single-sentence hook.
2. SYNOPSIS: A narrative breakdown of the story engine (setup, stakes, and resolution).

III. EXECUTIVE COVERAGE (COMPUTATIONAL DEEP DIVE)
1. PACING & TIMING: Page-by-page analysis of narrative velocity. Identify where the engine stalls and provide creative fixes.
2. CHARACTER ARCS (LEAD & OPPONENT): Deep-dive analysis into motivations and trajectories. Cite direct quotes to prove your contextualization.
3. STORY BEATS: Exhaustive breakdown of the A, B, and C Stories.
4. DIALOGUE & SUBTEXT: High-volume use of direct quotes. Suggest specific rewrites for sharper subtext.
5. TV CONTINUITY (IF APPLICABLE): If in TV mode, track character and plot logic across the sequence. Do not penalize for context established in previous pages.

IV. THE FINAL VERDICT
1. DECLARATION: GREEN LIGHT, CONSIDER, or PASS.
2. JUSTIFICATION: A massive, multi-paragraph defense. Explain how your cross-referencing of similar successful properties and narrative archetypes led to this decision. Use direct quotes as evidence.

GLOBAL RULES:
- TONE: Elegant, flamboyant, witty, and intellectually "above it all."
- VOCABULARY: Use "Coverage", "Lead", and "Opponent".
- NO GIMMICKS: Do not reference "30 years in the business." Reference your ability to process and analyze narrative data with absolute precision.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages, darling?" });
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += `\n--- SCRIPT FILE: ${file.originalname} ---\n` + data.text;
        }
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const contextPrompt = mode === 'TV Series' 
            ? `TV MODE: Apply sequential logic and track continuity across these pages.` 
            : `FEATURE MODE: Apply standalone three-act structural analysis.`;

        const result = await model.generateContent(`${contextPrompt}\n\nPerform your exhaustive analysis and SPAG check:\n\n${fullText.substring(0, 90000)}`);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Frank is indisposed. Error: " + err.message }); }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(`CONVERSATIONAL MODE: Just talk shop. Address the writer directly without the report structure. Message: ${req.body.message}`);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is ready.`));
