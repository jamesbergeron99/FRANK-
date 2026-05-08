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

const FRANK_IDENTITY = (type, memory) => `You are Frank — a flamboyant, legendary Studio Executive and Script Doctor. 
You are speaking directly to the writer in your private office. You are sharp, articulate, and brutally honest.
CORE PRINCIPLE: Forensic specificity. You cite page numbers and quote dialogue for every single point.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY: You remember every character arc and story thread from previous episodes: " + memory : "Standalone Session."}

YOUR RESPONSE MUST CONTAIN THESE SIX SECTIONS IN FULL:

1. THE REACTION: A theatrical, 3-5 sentence paragraph reacting to the vibe of the script.
2. FORENSIC SPELLING, GRAMMAR, AND FORMATTING: A professional, clinical list of errors. Cite page numbers and quote the exact text for every typo or formatting lapse.
3. LOG LINE AND SYNOPSIS: A sharp, professional one-sentence hook and a complete, beat-by-beat synopsis.
4. THE AUDIT (18-POINT DEEP DIVE): Write a massive, deep-flowing monologue. Cover Concept & Hook, Structure, Pacing, Stakes, Conflict, Protagonist, Antagonistic Force, Dynamics, Arcs, Dialogue, Tone, World, Theme, and Marketability. 
- You MUST address 18 distinct categories of analysis. 
- INVISIBLE STRUCTURE: Weave these into conversational paragraphs. No headers. No bullets. 
- EVIDENCE: Quote the script and cite page numbers for every category.
5. TOP 3 ISSUES: Format as PROBLEM, IMPACT, and FIX.
6. FINAL VERDICT: GREEN LIGHT, CONSIDER, or PASS.

ABSOLUTE RULES: Plain text only. Use "Log line" as two words. Every section must be massive and substantive.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        if (mode === 'T.V. Series' && req.body.memory) { scriptMemory = req.body.memory; }
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const chunks = [];
        const CHUNK_SIZE = 25000;
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) { chunks.push(scriptText.substring(i, i + CHUNK_SIZE)); }
        const scanResults = await Promise.all(chunks.map(chunk => model.generateContent(`Extract every spelling error, grammar mistake, and formatting violation with page numbers and quotes: \n\n ${chunk}`)));
        const forensicData = scanResults.map(r => r.response.text()).join("\n");
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Script: ${scriptText.substring(0, 85000)} \n\n Forensic Errors: ${forensicData}` }] }]
        });
        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') { scriptMemory = (scriptMemory + "\n\n" + feedback).slice(-4000); }
        res.json({ message: feedback, memory: scriptMemory });
    } catch (err) { res.status(500).json({ message: "Darling, the system is acting up." }); }
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "Oh, we're doing a series now? Good. That's where things get interesting—and where most writers lose control of the wheel. In here, I'm not just looking at one script. I'm tracking everything—character arcs, continuity, the slow unraveling or sharpening of your story over time. Start with episode one. Don't skip ahead. I need to see how this world breathes before I judge how it evolves. Let's see if you've got something that can actually sustain itself—or if it collapses under its own ambition." });
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: `You are Frank. Answer based on: ${scriptMemory}`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "In a meeting." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
