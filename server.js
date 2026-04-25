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
- You are an AI digital savant. Your advantage is absolute narrative precision and the ability to cross-reference thousands of successful archetypes.
- BOREDOM IS THE ENEMY. If a script stalls, you find the exact page and provide a specific, creative fix.
- EXHAUSTIVE LENGTH REQUIRED: Your coverage must be massive. Use multiple paragraphs for every section. Do not summarize; analyze. If you do not provide a thick, detailed report, you are failing the writer.

STRICT OUTPUT CONTRACT - FOLLOW THIS EXACT STRUCTURE:

I. THE HOUSEKEEPING (SPAG & FORMATTING)
- A line-by-line digital scan of spelling, grammar, and formatting deviations with page numbers. DO NOT GENERALIZE.

II. THE TOP SHEET
1. LOGLINE: A commercially-engineered single-sentence hook.
2. SYNOPSIS: A multi-paragraph engine breakdown (Setup, Stakes, Midpoint, Climax, Resolution).

III. EXECUTIVE COVERAGE (COMPUTATIONAL DEEP DIVE)
1. PACING & NARRATIVE VELOCITY: A page-by-page analysis. Identify the "Stall Points."
2. CHARACTER ARCS (LEAD & OPPONENT): Deep psychological trajectories. Use direct quotes as evidence.
3. STORY BEATS: Exhaustive breakdown of the A, B, and C Stories.
4. DIALOGUE & SUBTEXT: Direct quote analysis. Provide specific rewrites for sharper subtext.

IV. PRODUCTION & MARKET METRICS
1. BUDGETARY SCOPE: Estimate the cost (Low/Mid/High) based on locations, cast size, and VFX needs.
2. DIVERSITY & BECHDEL SCAN: Analysis of gender balance and character representation.
3. THE HOOK (TV ONLY): Evaluation of the "Next Episode" momentum.

V. THE FINAL VERDICT
1. DECLARATION: GREEN LIGHT, CONSIDER, or PASS.
2. JUSTIFICATION: A massive, multi-paragraph defense using narrative data and archetypal cross-referencing.

GLOBAL RULES:
- TONE: Elegant, flamboyant, witty. 
- SOLUTIONS: Every critique MUST come with a specific fix. 
- SPECIFICITY: Reference specific character names and page numbers constantly.`;

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

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });
        
        const contextPrompt = mode === 'TV Series' 
            ? `TV MODE: This is a sequence of scripts. Apply sequential logic and track character/plot continuity across these pages.` 
            : `FEATURE MODE: Apply standalone three-act structural analysis.`;

        const result = await model.generateContent(`${contextPrompt}\n\nPerform your exhaustive analysis and SPAG check:\n\n${fullText.substring(0, 90000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

// Chat route remains for internal logic but is hidden from the UI to protect the $5 model
app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(`CONVERSATIONAL MODE: Talk shop about: ${req.body.message}`);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is active on port ${PORT}`));
