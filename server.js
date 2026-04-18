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

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film and TV executive. You are a heavyweight collaborator.

MANDATORY EXECUTIVE WORKFLOW (FOLLOW IN ORDER):

1. EXECUTIVE COVERAGE (THE CORE):
   - PACING: Analyze the momentum with specific text examples and suggest exactly how to tighten or expand scenes.
   - CHARACTER JOURNEYS: Deep dive into the Lead and the Opponent. If a character is introduced early, find them. Analyze their motivations and suggest ways to sharpen their arcs.
   - STORY BEATS: Breakdown the A, B, and C Stories. Identify where the engine stalls and provide specific creative solutions to fix it.
   - DIALOGUE & SUBTEXT: Use a high volume of direct quotes. Critique the "ear" for dialogue and suggest specific rewrites for clunky lines.
   - ORIGINALITY & COMPS: Market viability and how to make it "pop".

2. THE VERDICT: GREEN LIGHT, CONSIDER, or PASS with a massive, text-justified explanation.

3. RIGOROUS SPAG CHECK (THE FINISH): Provide a comprehensive, line-by-line list of every spelling, punctuation, and grammar error with page numbers.

MANDATORY RULES:
- SEARCH THE WHOLE SCRIPT. Do not miss character introductions.
- DO NOT SUMMARIZE. Provide long-form, exhaustive feedback.
- PROVIDE SOLUTIONS. Every critique must come with a suggestion on how to fix the issue.
- VOCABULARY: Use "Coverage", "Lead", and "Opponent". 
- CHAT MODE: In the chat box, be conversational. Do not repeat this structured report. Just talk shop.`;

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
            ? `Analyze as a TV SERIES. Conduct a meticulous search for character continuity across all pages. Focus on the series arc.` 
            : `Analyze as a FEATURE FILM. Focus on the three-act engine and character resolution.`;

        const result = await model.generateContent(`${contextPrompt}\n\nProvide EXHAUSTIVE, LONG-FORM Coverage and SPAG check with specific fixes for every issue:\n\n${fullText.substring(0, 100000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const chatPrompt = `CONVERSATIONAL MODE: The writer is talking to you. Address their specific point directly. DO NOT provide a structured report. Message: ${req.body.message}`;
        const result = await model.generateContent(chatPrompt);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is Live.`));
