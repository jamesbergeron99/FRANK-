const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); // Required for Webador to talk to Render
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express(); // <--- THIS WAS MISSING OR BELOW LINE 15
app.use(cors());
app.use(express.json({limit: '50mb'})); 
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film and TV executive. 

STRICT CONTINUITY PROTOCOL:
1. EPISODE RECOGNITION: Identify if the script is a Pilot, a Part 2, or a mid-season episode. 
2. SEQUENTIAL LOGIC: If the script is NOT a Pilot, do not penalize for "missing introductions." Analyze how it builds on established arcs.
3. THE "LONG GAME": Evaluate if the episode moves the A, B, and C stories forward.

STRICT OUTPUT CONTRACT:
I. THE HOUSEKEEPING (SPAG): Brief line-by-line list with page numbers.
II. THE TOP SHEET: Logline and Detailed Synopsis.
III. EXECUTIVE COVERAGE (DEEP DIVE):
   - PACING & TIMING: Page-by-page analysis with solutions.
   - CHARACTER ARCS: Deep dive into Lead and Opponent. (Search entire script).
   - STORY BEATS: A, B, and C Stories.
   - DIALOGUE & SUBTEXT: High volume of quotes and suggested rewrites.
   - FORMATTING: Industry standards check.
IV. COMMERCIAL EVALUATION: Originality and Comps.
V. FINAL VERDICT: GREEN LIGHT, CONSIDER, or PASS with massive justification.

VOCABULARY: Use "Coverage", "Lead", and "Opponent". 
SOLUTIONS: Every critique MUST have a creative fix.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages, darling?" });
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += `\n--- START OF SCRIPT FILE: ${file.originalname} ---\n` + data.text;
        }
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const contextPrompt = mode === 'TV Series' 
            ? `Analyze as a TV SERIES. Identify if this is a continuation (Part 2+) and track continuity.` 
            : `Analyze as a FEATURE FILM. Focus on the three-act engine.`;

        const result = await model.generateContent(`${contextPrompt}\n\nProvide the FULL EXHAUSTIVE Coverage:\n\n${fullText.substring(0, 100000)}`);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Frank is indisposed." }); }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(`CONVERSATIONAL MODE: Just talk shop. Address the writer directly. Message: ${req.body.message}`);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

// Render dynamic port binding
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frank is Live on port ${PORT}`);
});
