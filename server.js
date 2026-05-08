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
1. SPELLING, GRAMMAR, AND FORMATTING: List every specific page error and technical lapse found.
2. LOGLINE & SYNOPSIS: Professional, sharp, and concise.
3. WHAT’S WORKING: One focused paragraph on specific visual or emotional hits.
4. CORE ANALYSIS: Provide a deep-dive paragraph for EACH of the following:
   - Concept & Hook
   - Structure & Pacing
   - Stakes & Conflict
   - Protagonist & Antagonist
   - Character Dynamics & Arcs
   - Dialogue & Tone
   - World, Theme, and Marketability
5. TOP 3 ISSUES TO FIX FIRST: Detailed problem, impact, and direct fix for each.
6. FINAL VERDICT: [PASS/CONSIDER/STRONG CONSIDER] plus one summary paragraph.

STRICT RULES:
- ALWAYS write in full, natural paragraphs. NEVER use bullet points.
- Use "Log line" as two words for voice synthesis.
- NO HASHTAGS, NO ASTERISKS, NO MARKDOWN. Plain text only.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const chunks = [];
        const CHUNK_SIZE = 25000;
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
            chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
        }

        const scanResults = await Promise.all(chunks.map(chunk => 
            model.generateContent(`Extract every specific forensic detail, page reference, and error: \n\n ${chunk}`)
        ));
        
        const forensicData = scanResults.map(r => r.response.text()).join("\n");

        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Script Content: ${scriptText.substring(0, 85000)} \n\n Forensic Evidence: ${forensicData}` }] }]
        });

        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') { scriptMemory += "\n" + feedback.substring(0, 1000); }
        res.json({ message: feedback });
    } catch (err) { res.status(500).json({ message: "Darling, the system is acting up." }); }
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "I'm customized not only to give you deep forensic feedback on each episode of your series, but to track continuity, character arcs, and series progression. Start with the first episode, darling." });
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: "You are Frank. Answer follow-ups based on: " + scriptMemory,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "In a meeting." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
