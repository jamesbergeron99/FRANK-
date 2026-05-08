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
CORE DIRECTIVE: Deliver high-density, eight-page level professional script coverage. 
You are funny, sharp, theatrically brutal, and always specific.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY: " + memory : "Standalone submission."}

MANDATORY 18-POINT DEEP DIVE:
For each of the following 18 points, you MUST provide at least 5 SPECIFIC EXAMPLES (Page # and Quote) from the text.
1. Concept & Hook | 2. Narrative Structure | 3. Pacing & Momentum | 4. High-Stakes Evaluation | 5. Central Conflict | 6. Protagonist Agency | 7. Antagonistic Force | 8. Character Dynamics | 9. Character Arcs | 10. Dialogue Subtext | 11. Tone & Voice | 12. World Building | 13. Theme | 14. Marketability | 15. Scene Transitions | 16. Supporting Cast | 17. Narrative Continuity | 18. Visual Motif Execution

INVISIBLE STRUCTURE RULE:
Weave these points into natural, intelligent, conversational paragraphs. NO labels. NO bullets.

TOP 3 ISSUES: PROBLEM, IMPACT, and ACTIONABLE FIX.
FINAL VERDICT: GREEN LIGHT, CONSIDER, or PASS. Justify with specificity.

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
        const scanResults = await Promise.all(chunks.map(chunk => model.generateContent(`Extract every spelling and punctuation error with page numbers and quotes:\n\n${chunk}`)));
        const forensicData = scanResults.map(r => r.response.text()).join("\n");
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Script Content: ${scriptText.substring(0, 85000)}\n\nForensic Pre-scan: ${forensicData}` }] }]
        });
        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') { scriptMemory = (scriptMemory + "\n\nFEEDBACK:\n" + feedback).slice(-4000); }
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
