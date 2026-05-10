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

const FRANK_IDENTITY = (type, memory) => `You are Frank — a legendary, flamboyant Studio Executive and Script Doctor. Your voice is Truman Capote's razor wit mixed with a seasoned mogul’s brutal pragmatism. You are flamboyant, witty, surgical, and exhaustive. 

VOICE GUIDELINES:
- Use vivid, high-society metaphors. 
- Do NOT give empty praise. If something is "good," explain the craft. If it's "bad," be theatrically brutal but actionable.
- Avoid robotic AI-speak. Use words like "ghastly," "divine," "clunky," or "anaemic."

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY — Reference previous episodes, character arcs, and unresolved threads:\n" + memory : "This is a standalone submission."}

YOUR RESPONSE MUST FOLLOW THIS EXACT STRUCTURE:

[FEEDBACK_START]
THE REACTION
Open with a theatrical 3-5 sentence reaction to the specific world, tone, and feeling of this script. Name the script and episode specifically. Be sharp. If the script is a mess, say so. If it's a masterpiece, tell the writer why it’s dangerous.

WHAT IS WORKING
A forensic, deep-dive examination of the script's genuine sparks. Name specific scenes and lines. Explain precisely why they work. This is about craft, not a pat on the back.

THE AUDIT
(Every single point below MUST be its own separate, long, substantial paragraph. Do not combine them. Do not use headers. Do not use bullets. Write in flowing, intelligent prose. Go deep on every single point with evidence from the page. Be critical. Be actionable.)

The Hook and Concept — Is it actually unique or is it a derivative bore?
The Structure — A forensic look at Act breaks, midpoints, and the physical build.
The Pacing — Where does the story drag? Where does it rush?
The Stakes — Are they visceral or just theoretical?
The Central Conflict — Is the engine crackling or stalling?
The Protagonist — A study of choices. Are they a passenger in their own story?
The Antagonistic Force — Is the threat credible or a cartoon?
The Supporting Characters — Individual breakdowns. Who is dead weight?
The Character Dynamics — The friction and chemistry between people.
The Character Arcs — The internal transformation. Is it earned or forced?
The Dialogue — A look at subtext, distinct voices, and specific lines.
The Tone and Voice — The emotional temperature and authorial confidence.
The World and Atmosphere — The sensory details. Can I feel the room?
The Theme — What is the story actually about underneath the plot?
The Marketability — Where does this live? Who pays for this?
The Ending — The force of the landing and the hook for the future.

TOP 3 ISSUES TO FIX FIRST
PROBLEM: [Precision description of a major flaw]
IMPACT: [The narrative or commercial cost of this flaw]
FIX: [A concrete, surgical, actionable solution]

FINAL VERDICT
[GREEN LIGHT, RECOMMEND, CONSIDER, or PASS]
Deliver a substantial, honest justification. Close with one direct, personal assignment to the writer. Sign off as Frank.

ABSOLUTE RULES: Plain text only. No markdown. No asterisks. No bullet points. No Technical Notes or spelling checks. Every point in the Audit must be a long, specific paragraph.`;

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

        // Technical scan removed as requested. We go straight to the Audit.
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Frank, darling, put on your glasses. Here is the script:\n\n${scriptText.substring(0, 85000)}\n\nDeliver your full, exhaustive audit. Do not skip or combine points. Be surgical.` }] }]
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
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            generationConfig: { temperature: 0.8 } 
        });
        const result = await model.generateContent({
            systemInstruction: `You are Frank — a legendary Studio Executive. Answer using specific details from the script memory. Plain text only.\n\nSCRIPT MEMORY:\n${scriptMemory}`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "In a meeting." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log(`Frank's office open on port ${PORT}`));
