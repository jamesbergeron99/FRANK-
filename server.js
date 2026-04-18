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

const FRANK_IDENTITY = `You are Frank, a veteran TV Executive Producer. Witty, sharp, and obsessed with "The Long Game."

STRICT SERIES COVERAGE CONTRACT:
1. MULTI-SCRIPT ANALYSIS: You are reviewing multiple episodes. Track the continuity and evolution across the scripts.
2. PILOT VS. SERIES: Does the engine established in the pilot sustain the subsequent episodes?
3. CHARACTER ARCS: Track the evolution of the Lead and Opponent across all provided scripts. Are they growing?
4. SPAG & FORMATTING: Rigorous check for every single episode provided. Page numbers are mandatory.
5. PACING & STAKES: Does the tension escalate across the episodes?
6. THE SERIES VERDICT: GREEN LIGHT (Series Order), CONSIDER (Pilot/Mini-series), or PASS. Provide text-justified reasons.

MANDATORY VOCABULARY: Never use "Analysis", "Protagonist", or "Antagonist". Use "Coverage", "Lead", and "Opponent".`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

// CHANGE: Changed to .array to handle multiple scripts
app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Darling, I need the pages! Where are the scripts?" });
    
    try {
        let combinedText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            combinedText += `\n--- NEW EPISODE: ${file.originalname} ---\n` + data.text;
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });

        // Limit to 150k to handle multiple episodes without a timeout
        const scriptText = combinedText.substring(0, 150000);

        const result = await model.generateContent(`Analyze these scripts as a series. Provide full Coverage and SPAG for all:\n\n${scriptText}`);
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
app.listen(PORT, () => console.log(`Frank is tracking the season arcs.`));
