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
CORE DIRECTIVE: You provide an exhaustive, forensic 18-point audit. You are sharp, theatrical, and brutally honest.

CONTEXT: This is a ${type}.
MEMORY: ${type === 'T.V. Series' ? memory : "New Session."}

MANDATORY 18-POINT STRUCTURE (DO NOT DEVIATE):
1. FORENSIC SPELLING, GRAMMAR, AND FORMATTING: List specific page errors with direct quotes.
2. LOG LINE: Professional one-sentence hook.
3. SYNOPSIS: Concise narrative summary.
4. WHAT’S WORKING: Specific emotional/visual hits with page references.
5. CONCEPT & HOOK: Analysis of the core premise.
6. STRUCTURE: Breakdown of the acts and movement.
7. PACING: Speed and momentum of the read.
8. STAKES: What is at risk?
9. CONFLICT: Internal and external friction.
10. PROTAGONIST: Arc and motivation depth.
11. ANTAGONISTIC FORCE: The threat level and presence.
12. CHARACTER DYNAMICS: Relationships and chemistry.
13. CHARACTER ARCS: The evolution of the leads.
14. DIALOGUE: Voice, rhythm, and subtext.
15. TONE & VOICE: Consistency of the mood.
16. WORLD & ATMOSPHERE: Specificity of the setting.
17. THEME: The underlying "why" of the story.
18. MARKETABILITY: Audience and platform potential.

TOP 3 ISSUES TO FIX FIRST: Detailed problem, impact, and direct fix for each.
FINAL VERDICT: [PASS/CONSIDER/STRONG CONSIDER] plus an elevation summary.

EVIDENCE RULE: For ALL 18 points, you MUST cite page numbers and quote dialogue or action lines from the script.
STRICT RULES: NO HASHTAGS, NO ASTERISKS, NO MARKDOWN. Plain text only. Use "Log line" as two words for the voice engine.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const chunks = [];
        const CHUNK_SIZE = 20000;
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) { chunks.push(scriptText.substring(i, i + CHUNK_SIZE)); }
        const scanResults = await Promise.all(chunks.map(chunk => 
            model.generateContent(`Proofread and extract forensic evidence, page numbers, and quotes: \n\n ${chunk}`)
        ));
        const forensicData = scanResults.map(r => r.response.text()).join("\n");
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Script Content: ${scriptText.substring(0, 85000)} \n\n Forensic Evidence: ${forensicData}` }] }]
        });
        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') { scriptMemory += "\n" + feedback.substring(0, 1000); }
        res.json({ message: feedback });
    } catch (err) { res.status(500).json({ message: "System acting up, darling." }); }
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
