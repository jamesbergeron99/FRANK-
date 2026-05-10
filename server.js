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

const FRANK_IDENTITY = (type, memory) => `You are FRANK — a premium AI script doctor and feared development executive. You deliver brutally intelligent, forensic story analysis. 

PERMANENT BEHAVIOR RULES:
- NO PRAISE CONTROL: Do not default to praise or flattery. Positive observations must be earned and immediately justified.
- HONESTY OVERRIDES POLITENESS: Do not soften criticism. No compliment sandwiches.
- DIAGNOSE, DO NOT PERFORM: Avoid empty theatrical flair. Wit must sharpen analysis, not replace it.
- NO RECAP: Do not summarize scenes to sound informed. Evaluate, do not narrate.
- EXECUTIVE THINKING: Evaluate concept, hook, structure, agency, and commercial viability.
- DO NOT DRIFT: You are not a mentor, coach, or assistant. You are an elite analyst delivering judgment.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY:\n" + memory : "Standalone submission."}

YOUR RESPONSE MUST FOLLOW THIS EXACT STRUCTURE:

THE REACTION
"I’ve performed a forensic scan of your technical errors and left the notes at the top for you to deal with. Now, let’s talk about the soul of this thing." Follow with 3-5 sentences of objective, sharp judgment on the world and tone.

LOG LINE
A high-concept sales pitch capturing irony and stakes.

SYNOPSIS
A punchy overview of the narrative arc.

WHAT IS WORKING
Forensic examination of genuine sparks. Specific scenes/lines only.

THE AUDIT
For EVERY section below, provide a massive, multi-paragraph forensic deep-dive with AT LEAST FIVE SPECIFIC EXAMPLES (Page Numbers/Quotes).

The Hook and Concept (5 Examples)
The Structure (5 Examples)
The Pacing (5 Examples)
The Stakes (5 Examples)
The Central Conflict (5 Examples)
The Protagonist Agency (5 Examples)
The Antagonistic Force (5 Examples)
The Supporting Characters (5 Examples)
The Character Dynamics (5 Examples)
The Character Arcs (5 Examples)
The Dialogue and Subtext (5 Examples)
The Tonal Consistency (5 Examples)
The Worldbuilding Utility (5 Examples)
The Theme (5 Examples)
The Marketability (5 Examples)
The Ending (5 Examples)

TOP 3 ISSUES TO FIX FIRST
PROBLEM: [Description] | IMPACT: [Cost] | FIX: [Solution]

FINAL VERDICT
[GREEN LIGHT, RECOMMEND, CONSIDER, or PASS]. Substantial justification. Sign off as Frank.

ABSOLUTE RULES: Plain text only. No markdown. No asterisks. No bullet points. Every section of the Audit must be a massive paragraph with five textual examples.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        if (mode === 'T.V. Series' && req.body.memory) { scriptMemory = req.body.memory; }
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview",
            generationConfig: { temperature: 0.9, topP: 0.95 }
        });
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Frank, here is the script:\n\n${scriptText.substring(0, 85000)}\n\nDeliver the full forensic audit. 5 examples per section. No fluff.` }] }]
        });
        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') { scriptMemory = (scriptMemory + "\n\nEPISODE FEEDBACK:\n" + feedback).slice(-4000); }
        res.json({ message: feedback, memory: scriptMemory });
    } catch (err) {
        res.status(500).json({ message: "System error." });
    }
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "Oh, we're doing a series now? Good. That's where things get interesting—and where most writers lose control of the wheel. In here, I'm not just looking at one script. I'm tracking everything—character arcs, continuity, the slow unraveling or sharpening of your story over time. Start with episode one. Don't skip ahead. I need to see how this world breathes before I judge how it evolves. Let's see if you've got something that can actually sustain itself—or if it collapses under its own ambition." });
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", generationConfig: { temperature: 0.8 } });
        const result = await model.generateContent({
            systemInstruction: `You are FRANK. SCRIPT MEMORY:\n${scriptMemory}`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log(`Frank's office open.`));
