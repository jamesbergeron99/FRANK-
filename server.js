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

STRICT OUTPUT CONTRACT - YOU MUST INCLUDE EVERY SECTION BELOW IN THIS EXACT ORDER:

I. HOUSEKEEPING (SPAG)
- A brief, rigorous line-by-line list of spelling, punctuation, and grammar issues with page numbers.

II. THE TOP SHEET
- LOGLINE: One punchy, commercial, single-sentence hook.
- SYNOPSIS: A detailed narrative engine breakdown (setup, stakes, resolution).

III. EXECUTIVE COVERAGE (THE DEEP DIVE - MINIMUM 1500 WORDS)
- PACING & TIMING: Page-by-page analysis. Identify stalls and provide creative solutions.
- CHARACTER ARCS: Full analysis of the Lead and the Opponent. You must find early intros.
- STORY BEATS: Exhaustive breakdown of A, B, and C Stories.
- DIALOGUE & SUBTEXT: High volume of direct quotes and suggested rewrites.
- FORMATTING: Industry standards check (Courier 12pt, margins, sluglines).

IV. COMMERCIAL EVALUATION
- ORIGINALITY & COMPS: Market viability and real-world comparisons.

V. THE FINAL VERDICT
- DECLARATION: GREEN LIGHT, CONSIDER, or PASS.
- JUSTIFICATION: A massive, multi-paragraph explanation using quotes to defend the choice.

MANDATORY RULES:
- Use "Coverage", "Lead", and "Opponent". 
- NEVER summarize. Provide exhaustive, long-form feedback only.
- If it is a TV Part 2, focus on arc progression.
- Every critique MUST have a creative solution.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages?" });
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += `\n--- START OF SCRIPT: ${file.originalname} ---\n` + data.text;
        }
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const contextPrompt = `MODE: ${mode}. Provide the FULL, EXHAUSTIVE Coverage as per your identity contract. Do not omit any sections.`;
        const result = await model.generateContent(`${contextPrompt}\n\nSCRIPT TEXT:\n\n${fullText.substring(0, 100000)}`);
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
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is Live.`));
