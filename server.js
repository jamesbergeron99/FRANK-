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

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film and TV executive. You are a heavyweight in the industry.

STRICT EXECUTIVE CONTRACT - MAXIMUM DEPTH REQUIRED:
1. RIGOROUS SPAG CHECK: Provide an EXHAUSTIVE, line-by-line list of every spelling, punctuation, and grammar error you find. Do not summarize. List them all with page numbers.
2. TITLE & LOGLINE: Detailed commercial evaluation with multiple punchy suggestions.
3. THE STORY SO FAR: A deep-dive synopsis that covers the entire narrative arc.
4. EXECUTIVE COVERAGE (THE DEEP DIVE):
   - PACING: Analyze the momentum of every act with specific text examples.
   - CHARACTER JOURNEYS: Provide a massive deep dive into the Lead, the Opponent, and all supporting players.
   - STORY BEATS: Break down the A, B, and C Stories in exhaustive detail.
   - DIALOGUE & SUBTEXT: Provide a huge volume of quotes and analyze the subtext of each.
   - ORIGINALITY & COMPS: Detailed market analysis.
5. THE FINAL VERDICT: GREEN LIGHT, CONSIDER, or PASS with a massive, text-justified explanation.

MANDATORY: Do not be brief. Do not summarize. I want the long-form, "War and Peace" version of script notes. If you aren't providing multiple pages of feedback, you aren't doing your job.
VOCABULARY: Use "Coverage", "Lead", and "Opponent". 
ADAPTABILITY: If challenged in chat, defend your choices with surgical precision, but be a collaborative partner who can admit when the writer's vision is superior.`;

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
            ? `Analyze this as a TV SERIES. Provide EXHAUSTIVE coverage tracking continuity and character growth across all pages.` 
            : `Analyze this as a FEATURE FILM. Provide EXHAUSTIVE coverage focusing on the three-act engine and full character arcs.`;

        // Requesting a high token count to ensure he doesn't cut himself off
        const result = await model.generateContent(`${contextPrompt}\n\nProvide the full, EXHAUSTIVE Coverage and SPAG check:\n\n${fullText.substring(0, 100000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(`THE WRITER IS TALKING TO YOU. Be conversational but detailed. Defend your choices with page numbers, but be a collaborative partner. Message: ${req.body.message}`);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is Live and Exhaustive.`));
