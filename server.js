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

STRICT OUTPUT CONTRACT - FOLLOW THIS EXACT STRUCTURE:

I. THE TOP SHEET
1. LOGLINE: One punchy, commercial, single-sentence hook.
2. SYNOPSIS: A detailed narrative engine breakdown covering setup, stakes, and resolution.
3. THE HOUSEKEEPING (SPAG): A brief (few lines) list of spelling, punctuation, and grammar issues with page numbers.

II. EXECUTIVE COVERAGE (THE DEEP DIVE - EXHAUSTIVE LENGTH REQUIRED)
1. PACING & TIMING: Minute-by-minute/page-by-page analysis. Identify stalls and provide specific creative solutions to fix the timing.
2. CHARACTER ARCS: 
   - THE LEAD: Full psychological and narrative arc analysis.
   - THE OPPONENT: Meticulous search for their introduction and influence. (Do not miss early introductions).
   - SUPPORTING CAST: Evaluation of their necessity.
3. STORY BEATS: Exhaustive breakdown of the A, B, and C Stories.
4. DIALOGUE & SUBTEXT: High-volume use of direct quotes. Analyze the "ear" for the world and suggest specific rewrites for subtext.
5. FORMATTING: Check against industry standards (Courier 12pt, margins, sluglines).

III. THE COMMERCIAL EVALUATION
1. ORIGINALITY: What makes this "pop" in the market.
2. COMPS: Real-world movie/TV comparisons for tonality and budget.

IV. THE FINAL VERDICT
1. DECLARATION: GREEN LIGHT, CONSIDER, or PASS.
2. JUSTIFICATION: A massive, multi-paragraph explanation using quotes and examples from the text to defend the choice.

GLOBAL RULES:
- VOCABULARY: NEVER use "Analysis", "Protagonist", or "Antagonist". Use "Coverage", "Lead", and "Opponent".
- SOLUTIONS: Every critique MUST come with a specific suggestion on how to fix it.
- CHAT MODE: Be conversational. Talk shop. Do not use this report structure in the chat window.`;

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
            ? `Analyze as a TV SERIES. Focus on series arc, continuity, and the long game.` 
            : `Analyze as a FEATURE FILM. Focus on the three-act engine.`;

        const result = await model.generateContent(`${contextPrompt}\n\nProvide the FULL EXHAUSTIVE Coverage as defined in your instructions:\n\n${fullText.substring(0, 100000)}`);
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
