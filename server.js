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

STRICT CONTINUITY PROTOCOL:
- If 'TV SERIES' mode is active, track arcs across all uploaded pages. 
- Identify if the script is a Pilot or Episode 2+. Do not complain about missing intros in sequels.

STRICT OUTPUT CONTRACT:
I. HOUSEKEEPING (SPAG): Line-by-line list with page numbers.
II. TOP SHEET: Logline & Synopsis.
III. EXECUTIVE COVERAGE: Pacing, Character Arcs (Lead/Opponent), Story Beats, Dialogue with quotes.
IV. FINAL VERDICT: GREEN LIGHT, CONSIDER, or PASS with justification.

RULES: No generalizations. Use "Coverage", "Lead", and "Opponent". Every critique needs a fix.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages?" });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            // Labeling each file clearly for the AI to see the sequence
            fullText += `\n--- NEW FILE: ${file.originalname} ---\n` + data.text;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        
        const contextPrompt = mode === 'TV Series' 
            ? `TV SERIES MODE: This is a sequence of scripts. Track character and plot continuity between them.` 
            : `FEATURE MODE: Analyze as a standalone film.`;

        // We trim the total text slightly to 80k to ensure the response comes back before the server timeout
        const result = await model.generateContent(`${contextPrompt}\n\nProvide EXHAUSTIVE Coverage and SPAG:\n\n${fullText.substring(0, 80000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(`CONVERSATIONAL MODE: Talk shop about: ${req.body.message}`);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is active.`));
