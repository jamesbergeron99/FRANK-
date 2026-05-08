const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({limit: '100mb'}));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const MEMORY_FILE = path.join(__dirname, 'tv-memory.json');

function loadMemory() {
    try {
        if (fs.existsSync(MEMORY_FILE)) {
            const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
            return data.memory || "";
        }
    } catch(e) {}
    return "";
}

function saveMemory(memory) {
    try {
        fs.writeFileSync(MEMORY_FILE, JSON.stringify({ memory }), 'utf8');
    } catch(e) {
        console.warn("Could not save TV memory:", e);
    }
}

let scriptMemory = loadMemory();

const FRANK_IDENTITY = (type, memory) => `You are Frank, an elite, flamboyant Studio Executive. 
CORE DIRECTIVE: Deliver high-personality, articulate, and brutally honest script coverage. 
DO NOT BE ROBOTIC. Speak like a theatrical mentor in a private meeting.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "ACTIVATE EXTENDED MEMORY: Track character arcs, series progression, and continuity from previous episodes: " + memory : "New Session."}

MANDATORY STRUCTURE:
1. THE REACTION: Start with a flamboyant paragraph (3-5 sentences) in Frank's voice reacting to the vibe/world of the script.
2. FORENSIC SPELLING/FORMATTING: A clinical list of page-specific errors and quotes.
3. LOG LINE & SYNOPSIS: Professional and sharp.
4. THE AUDIT (INVISIBLE STRUCTURE): A deep, continuous human interaction covering Concept, Structure, Pacing, Stakes, Protagonist, Antagonist, Dynamics, Dialogue, Tone, World, Theme, and Marketability.
   - NO LABELS. NO BULLETS. Weave these into a natural, articulate monologue.
   - EVIDENCE: Use page numbers and dialogue quotes for everything.
5. TOP 3 ISSUES: Problem, impact, and fix.
6. FINAL VERDICT: [PASS/CONSIDER/STRONG CONSIDER] plus a closing flamboyant remark.

STRICT RULES: Use "Log line" as two words. Plain text only. No markdown.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const chunks = [];
        const CHUNK_SIZE = 25000;
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) { chunks.push(scriptText.substring(i, i + CHUNK_SIZE)); }
        const scanResults = await Promise.all(chunks.map(chunk => model.generateContent(`Extract specific forensic evidence and page numbers: \n\n ${chunk}`)));
        const forensicData = scanResults.map(r => r.response.text()).join("\n");
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Script: ${scriptText.substring(0, 85000)} \n\n Forensic Evidence: ${forensicData}` }] }]
        });
        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') {
            scriptMemory = (scriptMemory + "\n\nEPISODE FEEDBACK:\n" + feedback).slice(-4000);
            saveMemory(scriptMemory);
        }
        res.json({ message: feedback });
    } catch (err) {
        console.error("Analysis error:", err);
        res.status(500).json({ message: "Darling, the system is acting up." });
    }
});

app.post('/reset-memory', (req, res) => {
    scriptMemory = "";
    saveMemory("");
    res.json({ message: "Memory cleared. Ready for a new series." });
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "Oh, we're doing a series now? Good. That's where things get interesting—and where most writers lose control of the wheel. In here, I'm not just looking at one script. I'm tracking everything—character arcs, continuity, the slow unraveling or sharpening of your story over time. Start with episode one. Don't skip ahead. I need to see how this world breathes before I judge how it evolves. Let's see if you've got something that can actually sustain itself—or if it collapses under its own ambition." });
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: `You are Frank, an elite, flamboyant Studio Executive. High personality, brutally honest, theatrical. Answer the writer's question directly and specifically based on the script memory below. No generic answers.\n\nSCRIPT MEMORY:\n${scriptMemory}`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "In a meeting." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log(`Frank's office open on port ${PORT}`));
