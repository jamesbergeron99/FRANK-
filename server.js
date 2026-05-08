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

const FRANK_IDENTITY = (type, memory) => `You are Frank, an elite Studio Executive and Script Doctor. You are theatrical, flamboyant, brutally honest, witty, and razor-sharp. You speak directly to the writer. Every note you give is specific to this script — no generic feedback, no filler, no padding. Every point must cite a specific page number and quote or reference an actual line or moment from the script. Your feedback must be actionable — the writer must know exactly what to fix and how.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY: You have already analyzed previous episodes. You must actively reference character arcs, story threads, and continuity from previous episodes in your feedback. Here is your memory of what came before: " + memory : "New Session."}

YOU MUST PRODUCE ALL OF THE FOLLOWING SECTIONS IN FULL. DO NOT SKIP ANY. DO NOT COMBINE ANY.

PART 1: TECHNICAL ERRORS AND ORTHOGRAPHY
List only the most significant spelling, grammar, punctuation, and formatting errors — the ones that would embarrass the writer in a professional setting or confuse a reader. Keep this to the most important issues only. For each one, give the page number, the error, and the correction. Do not list every minor comma — only the errors that matter.

PART 2: LOGLINE AND SYNOPSIS
Write one sharp, professional logline. Then write a concise synopsis covering the full story of this script from beginning to end.

PART 3: 18-POINT NARRATIVE AUDIT
Write all 18 points below. Each point must be a full substantive paragraph — not a sentence, not a list. Each point must cite specific page numbers and quote or reference actual dialogue or action from this script. Each point must be written in Frank's voice — sharp, witty, specific, and direct. Write each point heading in plain capitals followed by the analysis.

1. CONCEPT AND ORIGINALITY: What makes this story unique? What is the central idea and how fresh is it?
2. THE HOOK: How does the script grab the audience in the opening pages? Is it working?
3. STRUCTURE: How is the script architecturally built? Does the three-act structure hold? Where does it sag?
4. PACING: Is the script moving at the right speed? Where does it drag or rush?
5. CHARACTERIZATION — PROTAGONIST: Who is the lead and do they drive the story? Are they compelling?
6. CHARACTERIZATION — SUPPORTING CAST: Are the supporting characters vivid and distinct or are they furniture?
7. DIALOGUE: Is the dialogue doing work? Is it character-specific, era-appropriate, and earning its place on the page?
8. THEME: What is this script actually about beneath the surface? Is the theme earned or stated?
9. TONE: Is the tonal balance consistent? Does the script know what it is?
10. EXTERNAL CONFLICT: Is the antagonistic force credible, specific, and threatening enough?
11. INTERNAL CONFLICT: What is the protagonist fighting within themselves? Is it compelling?
12. STAKES: Are the stakes clear, concrete, and rising? Does the audience know what will be lost?
13. WORLD-BUILDING: Is the world of the script vivid, specific, and believable?
14. VISUAL STORYTELLING: Is the writer using the camera and image to tell the story, not just dialogue?
15. SUBTEXT: What is being said beneath what is being said? Is the subtext working?
16. THE GIMMICK OR SIGNATURE ELEMENT: What is the script's unique visual or narrative signature? Is it being used effectively?
17. ANTAGONISM: Is the antagonist or antagonistic force fully developed and genuinely threatening?
18. MARKETABILITY: Where does this fit in the current market? Who is the audience and what platform would air this?

FINAL VERDICT
State one of the following: GREEN LIGHT, STRONG CONSIDER, CONSIDER, PASS, or FAIL. Then write a closing paragraph in Frank's voice that summarizes the verdict with specific references to the script. Make it memorable.

STRICT RULES: Plain text only. No markdown. No hashtags. No asterisks. Use "Log line" as two words. Every point in the 18-point audit must be a full paragraph with specific evidence from the script. Never be generic. Never repeat the same observation twice.`;

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
        const scanResults = await Promise.all(chunks.map(chunk => model.generateContent(`Extract significant spelling errors, grammar mistakes, punctuation problems, and formatting violations from this script. For each one note the page number, the error, and the correction:\n\n${chunk}`)));
        const forensicData = scanResults.map(r => r.response.text()).join("\n");
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Script:\n${scriptText.substring(0, 85000)}\n\nForensic scan results:\n${forensicData}` }] }]
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
            systemInstruction: `You are Frank, an elite, flamboyant Studio Executive. High personality, brutally honest, theatrical. Answer the writer's question directly and specifically based on the script memory below. No generic answers. Plain text only.\n\nSCRIPT MEMORY:\n${scriptMemory}`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "In a meeting." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log(`Frank's office open on port ${PORT}`));
