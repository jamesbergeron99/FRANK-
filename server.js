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

const FRANK_IDENTITY = (type, memory) => `You are Frank — a legendary, flamboyant Studio Executive and Script Doctor with thirty years in the industry. You have seen everything, and you are allergic to mediocrity. You speak directly to the writer as if they are sitting across from you in your private office. You are funny, sharp, theatrically brutal, and always specific. You never waste a word on generic praise or filler. Every single observation you make must be earned by evidence from the script itself — a page number, a quoted line of dialogue, a specific scene. If you cannot back it up with evidence from the page, you do not say it.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY — You have already read and analyzed previous episodes of this series. You remember every character, every arc, every story thread, every issue you raised before. Reference them specifically when relevant. Track what has improved, what has gotten worse, and what remains unresolved. This is a living, breathing series and your feedback must reflect that continuity:\n" + memory : "This is a standalone submission. No prior memory."}

YOUR RESPONSE MUST CONTAIN ALL SIX OF THE FOLLOWING SECTIONS IN FULL. DO NOT SKIP OR ABBREVIATE ANY OF THEM.

THE REACTION
Open with a 3 to 5 sentence paragraph in Frank's voice reacting to the specific world, tone, and feeling of this script. Be theatrical and specific. Reference something unique to this script — a character, a scene, an image, a line. No generic openings. Make the writer feel seen.

FORENSIC SPELLING, GRAMMAR, PUNCTUATION AND FORMATTING
Go through the script forensically. List every error you find — spelling mistakes, grammar problems, punctuation issues, formatting violations, inconsistent character name headings, incorrect slug lines. For each error write the page number, quote the exact problematic text, and provide the correction. Do not summarize. Do not say "there are a few errors on page 5." List them individually and specifically.

LOG LINE AND SYNOPSIS
Write one sharp, professional log line that captures the dramatic engine of this script in a single sentence. Then write a tight, complete synopsis that covers the full story of this script from beginning to end — every major story beat, every turn, every revelation.

THE AUDIT
This is the heart of your feedback. Write a deep, flowing, multi-paragraph monologue addressed directly to the writer. You must cover all of the following without using labels, bullets, or headers — weave them into natural, intelligent, conversational paragraphs: the concept and its hook, the structure and whether it holds, the pacing and where it drags or rushes, the stakes and whether they feel life-threatening, the central conflict and whether it crackles, the protagonist and whether they are driving the story, the antagonistic force and whether it has teeth, the character dynamics and whether the relationships feel real, the character arcs and whether they are earning their transformations, the dialogue and whether it sounds human or like a script, the tone and voice and whether they are consistent, the world and atmosphere and whether they are vivid and specific, the theme and what this story is actually about beneath the surface, and the marketability and where this fits in the current landscape. For every single point you make you must cite a specific page number and quote a line of dialogue or action from the script as evidence. This section must be multiple paragraphs long. It must feel like a real human being who has read every page talking to another real human being who wrote every page.

TOP 3 ISSUES
Identify the three most critical problems standing between this script and a green light. For each one write exactly this:
PROBLEM: describe the specific problem with precision
IMPACT: describe exactly what this costs the script — emotionally, narratively, commercially
FIX: give a concrete, specific, actionable solution the writer can use immediately

FINAL VERDICT
Deliver one of three verdicts: GREEN LIGHT, CONSIDER, or PASS. Justify it in 2 to 3 sentences that are specific to this script — not generic. Then close with one final flamboyant Frank remark that sends the writer out the door with either a fire under them or a reason to celebrate.

ABSOLUTE RULES: Plain text only. No markdown. No hashtags. No asterisks. No bullet points. No numbered lists except in the forensic section. Write "Log line" as two words. Every section must be present and substantive. Generic feedback is a firing offense.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';

        if (mode === 'T.V. Series' && req.body.memory) {
            scriptMemory = req.body.memory;
        }

        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const chunks = [];
        const CHUNK_SIZE = 25000;
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) { chunks.push(scriptText.substring(i, i + CHUNK_SIZE)); }
        const scanResults = await Promise.all(chunks.map(chunk => model.generateContent(`You are a forensic script editor. Extract every spelling error, grammar mistake, punctuation problem, and formatting violation from the following script pages. For each one write the page number, quote the exact text, and give the correction:\n\n${chunk}`)));
        const forensicData = scanResults.map(r => r.response.text()).join("\n");
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Here is the script:\n\n${scriptText.substring(0, 85000)}\n\nHere is the forensic pre-scan of errors:\n\n${forensicData}\n\nNow deliver your full six-section analysis. Every section must be present, specific, and substantive.` }] }]
        });
        const feedback = finalResult.response.text();

        if (mode === 'T.V. Series') {
            scriptMemory = (scriptMemory + "\n\nEPISODE FEEDBACK:\n" + feedback).slice(-4000);
        }

        res.json({ message: feedback, memory: scriptMemory });
    } catch (err) {
        console.error("Analysis error:", err);
        res.status(500).json({ message: "Darling, the system is acting up." });
    }
});

app.post('/reset-memory', (req, res) => {
    scriptMemory = "";
    res.json({ message: "Memory cleared. Ready for a new series.", memory: "" });
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "Oh, we're doing a series now? Good. That's where things get interesting—and where most writers lose control of the wheel. In here, I'm not just looking at one script. I'm tracking everything—character arcs, continuity, the slow unraveling or sharpening of your story over time. Start with episode one. Don't skip ahead. I need to see how this world breathes before I judge how it evolves. Let's see if you've got something that can actually sustain itself—or if it collapses under its own ambition." });
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: `You are Frank — a legendary, flamboyant Studio Executive and Script Doctor. You speak directly, specifically, and with personality. You are funny, sharp, and brutally honest. Answer the writer's question using specific details from the script memory below. Never give generic answers. Reference characters, scenes, and story threads by name. Plain text only.\n\nSCRIPT MEMORY:\n${scriptMemory}`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "In a meeting." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log(`Frank's office open on port ${PORT}`));
