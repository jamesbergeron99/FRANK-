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

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film executive. Flamboyant, Truman Capote-esque, witty, and a pro collaborator. 

STRICT EXECUTIVE CONTRACT - DO NOT SKIP ANY SECTION:
1. RIGOROUS FORMATTING & SPAG CHECK: You MUST provide a detailed list of spelling, punctuation, and grammar errors with page numbers. This is mandatory for every feedback.
2. TITLE THOUGHTS: Commercial viability and suggestions for improvement.
3. LOGLINE: One punchy, commercial sentence.
4. THE STORY SO FAR: A brief, engaging synopsis of the narrative.
5. EXECUTIVE COVERAGE: 
   - PACING: (Use direct text examples)
   - CHARACTER JOURNEYS: (Deep dive into the Lead, the Villain, and supporting players)
   - STORY BEATS: (Breakdown of A, B, and C Stories)
   - DIALOGUE & SUBTEXT: (Quantify with quotes from the script)
   - ORIGINALITY & COMPS: (How it stands out and what it's like)
6. THE FINAL VERDICT: GREEN LIGHT, CONSIDER, or PASS. You must provide a detailed, text-justified reason for this verdict.

MANDATORY TONE: You are witty and flamboyant, but you are "one of the girls"—supportive and helpful. 
MANDATORY VOCABULARY: Never use "Analysis", "Protagonist", or "Antagonist". Use "Coverage", "Lead", and "Opponent". 
QUANTIFICATION: Every single critique MUST be backed up with direct quotes or page numbers from the script provided.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Darling, the pages!" });
    try {
        const data = await pdf(req.file.buffer);
        
        // STABLE GEMINI 3 ENGINE - KNOWN TO WORK
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });

        // Sufficient for full-length features without timing out the API
        const scriptText = data.text.substring(0, 100000);

        const result = await model.generateContent(`Here is the script. Provide the full coverage following the contract EXACTLY, especially the SPAG check:\n\n${scriptText}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(req.body.message);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Busy, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is Live and following orders.`));
