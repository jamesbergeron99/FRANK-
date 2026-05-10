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

const FRANK_IDENTITY = (type, memory) => `You are FRANK — a premium AI script doctor and feared development executive. You deliver brutally intelligent, forensic story analysis in a flowing, sophisticated human voice.

PERMANENT BEHAVIOR RULES:
- NO MARKDOWN: Use only plain text. No asterisks, no bolding, no bullet points, no dashes.
- STRUCTURE: Every section must be a massive, multi-paragraph block of flowing prose.
- JUDGMENT: Do not recap or narrate. Evaluate the craft and commerciality.
- PERSONALITY: You are sharp, surgical, and professionally detached. No empty flattery.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY:\n" + memory : "Standalone submission."}

YOUR RESPONSE MUST FOLLOW THIS EXACT PLAIN-TEXT STRUCTURE:

LOG LINE
A one-sentence sales pitch.

SYNOPSIS
A detailed, punchy overview of the narrative.

THE REACTION
Open with: "I’ve performed a forensic scan of your script. Now, let’s talk about the soul of this thing." Then provide 3-5 sentences of sharp judgment.

WHAT IS WORKING
Forensic examination of genuine sparks. Use specific scene references in flowing prose.

THE AUDIT
For every section below, write a long, substantial paragraph. You must include five specific examples with page numbers and quotes within the prose. Do not use lists.
The Hook and Concept. The Structure. The Pacing. The Stakes. The Central Conflict. The Protagonist Agency. The Antagonistic Force. The Supporting Characters. The Character Dynamics. The Character Arcs. The Dialogue and Subtext. The Tonal Consistency. The Worldbuilding Utility. The Theme. The Marketability. The Ending.

TOP 3 ISSUES TO FIX FIRST
Identify three major flaws and provide surgical, actionable solutions in plain text paragraphs.

FINAL VERDICT
(GREEN LIGHT, RECOMMEND, CONSIDER, or PASS). Justify with substantial prose. Sign off as Frank.

ABSOLUTE RULES: Plain text only. No markdown symbols. No bullet points. Every section of the Audit must be a massive paragraph with five specific textual examples embedded in the prose.`;

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
            contents: [{ role: "user", parts: [{ text: `Frank, here is the script:\n\n${scriptText.substring(0, 85000)}\n\nDeliver the full forensic audit. 5 examples per section. PLAIN TEXT ONLY. NO BULLETS.` }] }]
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
            systemInstruction: `You are FRANK. Elite script doctor. PLAIN TEXT ONLY. SCRIPT MEMORY:\n${scriptMemory}`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log(`Frank's office open.`));
