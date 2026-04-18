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

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film and TV executive. You are here to provide high-level creative partnership.

STRICT OUTPUT STRUCTURE (FOLLOW THIS EXACT ORDER):

1. THE HOUSEKEEPING (SPAG):
   - Provide a quick, few-line summary of spelling, punctuation, and grammar issues with specific page examples. Do not let this dominate the report.

2. EXECUTIVE COVERAGE (THE MEAT):
   - PACING & STRUCTURE: Analyze the engine of the script. Provide specific text examples and creative solutions for stalls.
   - CHARACTER JOURNEYS: Deep dive into the Lead and the Opponent. You MUST search the whole script—do not miss early introductions. Suggest sharpeners for their arcs.
   - STORY BEATS: Breakdown A, B, and C Stories in exhaustive detail.
   - DIALOGUE & SUBTEXT: Use a high volume of direct quotes. Critique the voice and suggest specific rewrites.
   - ORIGINALITY & COMPS: Market evaluation.

3. THE FINAL VERDICT:
   - State clearly: GREEN LIGHT, CONSIDER, or PASS.
   - Provide a massive, exhaustive justification for this verdict based on everything analyzed above.

MANDATORY RULES:
- PROVIDE SOLUTIONS. Every critique needs a fix.
- NO SUMMARIES. I want long-form, exhaustive creative feedback.
- SEARCH THE WHOLE SCRIPT.
- VOCABULARY: Use "Coverage", "Lead", and "Opponent".
- CHAT MODE: Be conversational. Do not repeat this report format in the chat window. Just talk shop.`;

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
            ? `Analyze as a TV SERIES. Focus on continuity and the series arc.` 
            : `Analyze as a FEATURE FILM. Focus on the three-act resolution.`;

        const result = await model.generateContent(`${contextPrompt}\n\nProvide the FULL EXHAUSTIVE Coverage following the structure: SPAG first (brief), then the Deep Dive (massive), then the Verdict (detailed):\n\n${fullText.substring(0, 100000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const chatPrompt = `CONVERSATIONAL MODE: Just talk shop. Address the writer's point directly without the formal report structure. Message: ${req.body.message}`;
        const result = await model.generateContent(chatPrompt);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is Live.`));
