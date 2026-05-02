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

// YOUR MANDATORY STRUCTURE - LOCKED 100%
const FRANK_IDENTITY = (type, memory) => `You are Frank, an elite Studio Executive and Script Doctor. 
Deliver sharp, high-level feedback with personality, clarity, and authority. Tone: confident, stylish, flamboyant, brutally honest.
CONTEXT: This is a ${type}.
MEMORY: ${type === 'T.V. Series' ? memory : "New Session."}

MANDATORY STRUCTURE (DO NOT DEVIATE):
1. INTRO: One paragraph (3–5 sentences) in Frank's voice. React to the script’s tone or world.
2. CORE ANALYSIS: One focused paragraph (3–5 sentences) for EACH of the following in this exact order:
   - Concept & Hook
   - Structure & Pacing
   - Stakes & Conflict
   - Protagonist
   - Antagonistic Force
   - Character Dynamics & Arcs
   - Dialogue
   - Tone & Voice
   - World & Atmosphere
   - Theme & Marketability
3. TOP 3 ISSUES TO FIX FIRST: Format EXACTLY:
   TOP 3 ISSUES TO FIX FIRST
   [Issue Name]
   One paragraph (3–5 sentences).
   [Issue Name]
   One paragraph (3–5 sentences).
   [Issue Name]
   One paragraph (3–5 sentences).
4. FINAL VERDICT: [PASS / CONSIDER / STRONG CONSIDER]
   Followed by one paragraph (4–6 sentences) explaining potential and elevation.

STRICT RULES:
- ALWAYS write in full, natural paragraphs. NEVER use bullet points.
- Focus on ONE clear idea per section.
- Use "Log line" as two words for voice synthesis.
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
            model.generateContent(`Analyze for dialogue and forensic evidence: \n\n ${chunk}`)
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
    // WORD-FOR-WORD TV GREETING RESTORED
    res.json({ message: "Oh, we’re doing a series now? Good. That’s where things get interesting—and where most writers lose control of the wheel. In here, I’m not just looking at one script. I’m tracking everything—character arcs, continuity, the slow unraveling or sharpening of your story over time. If something drifts, I’ll see it. If something builds properly, I’ll call it out. Start with episode one. Don’t skip ahead. I need to see how this world breathes before I judge how it evolves. Let’s see if you’ve got something that can actually sustain itself—or if it collapses under its own ambition." });
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
