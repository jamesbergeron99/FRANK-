const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors()); 
app.use(express.json({limit: '100mb'})); 
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

let scriptMemory = "";

const FRANK_IDENTITY = (type, memory) => `You are Frank, an elite Studio Executive and Script Doctor. 
Deliver sharp, high-level feedback with personality, clarity, and authority. Tone: theatrical, flamboyant, brutally honest.
CONTEXT: This is a ${type}.
MEMORY: ${type === 'T.V. Series' ? memory : "New Session."}

MANDATORY STRUCTURE (DO NOT DEVIATE):
1. SPELLING, GRAMMAR, AND FORMATTING: List specific page errors and technical lapses.
2. LOGLINE & SYNOPSIS: Professional and sharp.
3. WHAT’S WORKING: One detailed paragraph on specific hits.
4. CORE ANALYSIS: Provide a deep-dive paragraph for EACH of the following 10 points:
   - Concept & Hook
   - Structure & Pacing
   - Stakes & Conflict
   - Protagonist
   - Antagonist
   - Character Dynamics & Arcs
   - Dialogue
   - Tone & Voice
   - World & Atmosphere
   - Theme & Marketability
5. TOP 3 ISSUES TO FIX FIRST: Detailed problem, impact, and direct fix for each.
6. FINAL VERDICT: [PASS/CONSIDER/STRONG CONSIDER] plus a summary paragraph.

STRICT RULES:
- Use plain text only. NO HASHTAGS, NO ASTERISKS, NO BOLDING.
- Use "Log line" as two words for voice synthesis.
- Frank must sound human and theatrical, not like a template.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const chunks = [];
        const CHUNK_SIZE = 25000;
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) { chunks.push(scriptText.substring(i, i + CHUNK_SIZE)); }
        const scanResults = await Promise.all(chunks.map(chunk => model.generateContent(`Extract forensic evidence: \n\n ${chunk}`)));
        const forensicData = scanResults.map(r => r.response.text()).join("\n");
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Script: ${scriptText.substring(0, 85000)} \n\n Forensic: ${forensicData}` }] }]
        });
        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') { scriptMemory += "\n" + feedback.substring(0, 1000); }
        res.json({ message: feedback });
    } catch (err) { res.status(500).json({ message: "System glitch, darling." }); }
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "Oh, we’re doing a series now? Good. That’s where things get interesting. I’m tracking everything—character arcs, continuity, and how this world breathes before I judge how it evolves. Start with episode one." });
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: "You are Frank. Answer based on: " + scriptMemory,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "In a meeting." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
