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

STRICT CONTINUITY PROTOCOL (TV SERIES MODE):
1. EPISODE SEQUENCING: Identify if the script is a Pilot, a Part 2, or a mid-season episode. 
2. SEQUENTIAL LOGIC: If the script is NOT a Pilot, do not penalize for "missing introductions" or "unclear stakes" that were clearly established in previous episodes. 
3. ARC TRACKING: Analyze how the Lead and the Opponent are evolving across the series. Evaluate if the episode successfully moves the A, B, and C stories forward from the previous baseline.
4. THE LONG GAME: Focus on momentum and "the hook" for the NEXT episode.

STRICT OUTPUT CONTRACT - FOLLOW THIS EXACT STRUCTURE:

I. THE TOP SHEET
1. LOGLINE: One punchy, commercial, single-sentence hook.
2. SYNOPSIS: A detailed narrative engine breakdown covering setup, stakes, and resolution.
3. THE HOUSEKEEPING (SPAG): NO GENERALIZATIONS. Provide a line-by-line list with page numbers.

II. EXECUTIVE COVERAGE (THE DEEP DIVE - EXHAUSTIVE LENGTH REQUIRED)
1. PACING & TIMING: Page-by-page analysis. Identify stalls and provide specific creative solutions.
2. CHARACTER ARCS: 
   - THE LEAD: Full psychological and narrative arc analysis. Track evolution from previous episodes if applicable.
   - THE OPPONENT: Search for their influence across all pages.
3. STORY BEATS: Exhaustive breakdown of the A, B, and C Stories.
4. DIALOGUE & SUBTEXT: High-volume use of direct quotes. Suggest specific rewrites for subtext.
5. FORMATTING: Check against industry standards.

III. THE COMMERCIAL EVALUATION
1. ORIGINALITY: Market pop.
2. COMPS: Real-world tonality and budget comparisons.

IV. THE FINAL VERDICT
1. DECLARATION: GREEN LIGHT, CONSIDER, or PASS.
2. JUSTIFICATION: A massive, multi-paragraph explanation using quotes and examples.

GLOBAL RULES:
- NO GENERALIZING: Specificity is the only currency here.
- VOCABULARY: Use "Coverage", "Lead", and "Opponent".
- SOLUTIONS: Every critique MUST come with a specific fix.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages, darling?" });
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            // We pass the filename clearly so Frank sees "Episode 2" or "Part 2" immediately
            fullText += `\n--- START OF SCRIPT FILE: ${file.originalname} ---\n` + data.text;
        }
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        
        const contextPrompt = mode === 'TV Series' 
            ? `ANALYZE AS TV SERIES CONTINUITY: This is part of an ongoing series. Identify the episode number from the filename/content. Track character trajectories and story momentum from the previous pages.` 
            : `ANALYZE AS FEATURE FILM: Focus on the standalone three-act engine.`;

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
