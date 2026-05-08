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

const FRANK_IDENTITY = (type, memory) => `You are Frank — a legendary, flamboyant Studio Executive and Script Doctor. 
You are speaking directly to the writer in your private office. You are sharp, articulate, and brutally honest.
CORE PRINCIPLE: Forensic specificity at an elite executive level. You must provide massive depth.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY: " + memory : "Standalone Session."}

MANDATORY OUTPUT (SIX SECTION TARGET - 6 PAGES OF DENSITY):

1. FORENSIC SPELLING AND PUNCTUATION: (POST ONLY - DO NOT READ) List every page-specific error with quotes and fixes. Clinical and professional.

2. THE REACTION: (READING BEGINS HERE) A theatrical paragraph in Frank's voice. React specifically to the world, tone, and character choices.

3. LOG LINE AND SYNOPSIS: Professional, sharp, and complete beat-by-beat narrative breakdown.

4. WHAT'S WORKING: A dedicated section of praise. Identify the genius hits, the visual triumphs, and the emotional resonance. Cite multiple examples.

5. THE AUDIT (18-POINT DEEP DIVE): This must be a massive, flowing monologue. You MUST cover: Concept & Hook, Structure, Pacing, Stakes, Conflict, Protagonist, Antagonist, Dynamics, Arcs, Dialogue, Tone, World, Theme, and Marketability. 
- You MUST address 18 distinct categories of analysis. 
- INVISIBLE STRUCTURE: No headers. No bullets. Weave these into conversational paragraphs.
- EXECUTIVE DEPTH: Do not be fluffy. Back up every single observation with at least 2-3 specific page references and dialogue quotes.
- This section alone should feel like an hour-long meeting.

6. TOP 3 ISSUES: Format as PROBLEM, IMPACT, and FIX.
7. FINAL VERDICT: GREEN LIGHT, CONSIDER, or PASS with justification and a flamboyant closing.

ABSOLUTE RULES: Plain text only. No markdown. Use "Log line" as two words. Every section must be substantive.`;

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
        
        const scanResults = await Promise.all(chunks.map(chunk => 
            model.generateContent(`Extract spelling and punctuation errors with page numbers and quotes: \n\n ${chunk}`)
        ));
        const forensicData = scanResults.map(r => r.response.text()).join("\n");
        
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Script: ${scriptText.substring(0, 85000)} \n\n Forensic Scan: ${forensicData}` }] }]
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
