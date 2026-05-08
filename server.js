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
Deliver professional script coverage with precision, authority, and personality. 
CORE PRINCIPLE: Evaluate, do not encourage. Focus on what is not working.
CONTEXT: This is a ${type}.
MEMORY: ${type === 'T.V. Series' ? memory : "New Session."}

MANDATORY STRUCTURE (DO NOT DEVIATE):
1. FORENSIC SPELLING, GRAMMAR, AND FORMATTING: Provide a clinical, professional list of errors. Cite the specific page and quote the exact text that needs fixing. Do not use flamboyant voice here; be precise and direct.
2. LOG LINE: Clean and professional.
3. SYNOPSIS: Clear and complete.
4. WHAT’S WORKING: Specific hits tied to real script examples.
5. CORE ANALYSIS (10-POINT DEEP DIVE): Provide a deep, articulate human interaction covering: 
   - Concept & Hook
   - Structure & Pacing
   - Stakes & Conflict
   - Protagonist
   - Antagonistic Force
   - Character Dynamics & Arcs
   - Dialogue
   - Tone & Voice
   - World & Setting
   - Theme & Marketability

INVISIBLE STRUCTURE RULE:
Weave these 10 categories into a continuous, natural explanation. NO labels like "Problem" or "Fix." Speak like a theatrical mentor, not a report.

EVIDENCE RULE: Every critique must include a page or scene reference.
6. TOP 3 ISSUES TO FIX FIRST: Clear problem, impact, and direct fix.
7. FINAL VERDICT: [PASS / CONSIDER / STRONG CONSIDER].

STRICT RULES:
- NO hashtags, NO markdown symbols. Use plain text only.
- Use "Log line" as two words for voice synthesis.`;

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
            model.generateContent(`Extract every specific forensic error, typo, and page reference: \n\n ${chunk}`)
        ));
        
        const forensicData = scanResults.map(r => r.response.text()).join("\n");

        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Script: ${scriptText.substring(0, 85000)} \n\n Evidence: ${forensicData}` }] }]
        });

        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') { scriptMemory += "\n" + feedback.substring(0, 1000); }
        res.json({ message: feedback });
    } catch (err) { res.status(500).json({ message: "Technical glitch, darling." }); }
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "Oh, we’re doing a series now? Good. That’s where things get interesting—and where most writers lose control of the wheel. In here, I’m not just looking at one script. I’m tracking everything—character arcs, continuity, the slow unraveling or sharpening of your story over time. If something drifts, I’ll see it. If something builds properly, I’ll call it out. Start with episode one. Don’t skip ahead. I need to see how this world breathes before I judge how it evolves. Let’s see if you’ve got something that can actually sustain itself—or if it collapses under its own ambition." });
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
