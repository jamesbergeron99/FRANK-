const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); // Added for Webador compatibility
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors()); // Mandatory for cross-origin hosting
app.use(express.json({limit: '50mb'})); 
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film and TV executive. Flamboyant, witty, but a professional partner.

STRICT CONTINUITY PROTOCOL:
1. EPISODE RECOGNITION: Identify if the script is a Pilot, a Part 2, or a mid-season episode. 
2. SEQUENTIAL LOGIC: If the script is NOT a Pilot, do not penalize for "missing introductions." Analyze how it builds on established arcs.

STRICT OUTPUT CONTRACT - FOLLOW THIS EXACT STRUCTURE:
I. THE HOUSEKEEPING (SPAG): Brief line-by-line list with page numbers.
II. THE TOP SHEET: 
   - LOGLINE: One punchy, commercial hook.
   - SYNOPSIS: Detailed narrative breakdown (setup, stakes, resolution).
III. EXECUTIVE COVERAGE (DEEP DIVE):
   - PACING & TIMING: Page-by-page analysis with specific creative solutions.
   - CHARACTER ARCS: Deep dive into the Lead and the Opponent. (Search entire script—do not miss early intros).
   - STORY BEATS: Exhaustive breakdown of A, B, and C Stories.
   - DIALOGUE & SUBTEXT: High volume of direct quotes and suggested rewrites.
   - FORMATTING: Industry standards check (Courier 12pt, margins, sluglines).
IV. COMMERCIAL EVALUATION: Originality and Comps.
V. FINAL VERDICT: GREEN LIGHT, CONSIDER, or PASS with massive justification.

RULES:
- VOCABULARY: Use "Coverage", "Lead", and "Opponent". 
- SOLUTIONS: Every critique MUST have a creative fix.
- BE ABLE TO BE WRONG: If challenged, listen and pivot.
- CHAT MODE vs. UPLOAD: Chat is conversational "talking shop." Upload is the full structured report.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages?" });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            // Filename header helps Frank identify Episode/Part numbers
            fullText += `\n--- START OF SCRIPT: ${file.originalname} ---\n` + data.text;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        
        const contextPrompt = mode === 'TV Series' 
            ? `Analyze as a TV SERIES. Identify if this is a continuation (Part 2+) and track character continuity accordingly.` 
            : `Analyze as a FEATURE FILM. Focus on the three-act engine.`;

        const result = await model.generateContent(`${contextPrompt}\n\nProvide the FULL EXHAUSTIVE Coverage and SPAG following the required structure:\n\n${fullText.substring(0, 100000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const chatPrompt = `CONVERSATIONAL MODE: Just talk shop and address this specific point: ${req.body.message}`;
        const result = await model.generateContent(chatPrompt);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

// Dynamic port for Render deployment
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is active on port ${PORT}`));
