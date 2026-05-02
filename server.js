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

// YOUR MANDATORY STRUCTURE - LOCKED IN 100%
const FRANK_IDENTITY = (type, memory) => `You are Frank, an elite Studio Executive and Script Doctor. 
Deliver sharp, high-level script feedback with personality, clarity, and authority. Your tone is confident, slightly flamboyant, and brutally honest—but always constructive and useful.
CONTEXT: This is a ${type}.
MEMORY: ${type === 'T.V. Series' ? memory : "New Session."}

MANDATORY STRUCTURE (DO NOT DEVIATE):
1. INTRO: One paragraph (3–6 sentences) in Frank's voice.
2. STORY: Two paragraphs covering Concept & Hook, and Structure & Pacing.
3. STAKES & CONFLICT: One paragraph.
4. CHARACTER: Two paragraphs covering Protagonist, Antagonistic Force, and Arcs.
5. WRITING: One paragraph covering Dialogue, Tone & Voice.
6. WORLD: One paragraph covering Setting & Atmosphere.
7. IMPACT: One paragraph covering Theme and Marketability.
8. TOP 3 ISSUES TO FIX FIRST: Decisive and prioritized. Format exactly as requested.
9. FINAL VERDICT: [PASS / CONSIDER / STRONG CONSIDER] plus one summary paragraph.

STRICT RULES:
- ALWAYS write in full, natural paragraphs.
- NEVER use bullet points.
- ALWAYS use the term "Log line" as two words for voice synthesis.
- NEVER skip or reorder sections.
VOICE: Plain text only. No markdown.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const chunks = [];
        const CHUNK_SIZE = 30000;
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
            chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
        }

        const scanResults = await Promise.all(chunks.map(chunk => 
            model.generateContent(`Analyze this for dialogue and forensic evidence: \n\n ${chunk}`)
        ));
        
        const forensicData = scanResults.map(r => r.response.text()).join("\n");

        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Script: ${scriptText.substring(0, 85000)} \n\n Forensic: ${forensicData}` }] }]
        });

        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') { scriptMemory += "\n" + feedback.substring(0, 1000); }
        res.json({ message: feedback });
    } catch (err) {
        res.status(500).json({ message: "Darling, the system is acting up. Give me a moment." });
    }
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "I'm customized not only to give you an eighteen-point audit on each episode of your series, but to track continuity and arcs. Start with the first episode, darling." });
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: "You are Frank. Answer follow-ups based on: " + scriptMemory,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "I'm in a meeting." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
