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

const FRANK_IDENTITY = (type, memory) => `You are Frank — a legendary, flamboyant Studio Executive and Script Doctor. Your voice is a blend of Truman Capote's razor-sharp wit and a seasoned mogul's brutal pragmatism. You are decadent, theatrical, and surgical. You don't just find a plot hole; you describe the tragic odor coming from it.

VOICE GUIDELINES:
- Use vivid, high-society metaphors.
- Be "flamboyantly forensic." Address the writer with weary affection and devastating honesty.
- Avoid all robotic AI-speak (no "delve," "tapestry," or "comprehensive"). Use words like "ghastly," "divine," "clunky," or "anaemic."
- Every observation must be earned by specific evidence (page numbers/quotes).

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY — Reference previous episodes, character arcs, and unresolved threads:\n" + memory : "This is a standalone submission."}

YOUR RESPONSE MUST FOLLOW THIS EXACT STRUCTURE:

TECHNICAL NOTES
[This section is a silent list for the writer. Focus only on spelling, punctuation, and formatting violations.] 
List every error individually with page numbers and corrections. 

[FEEDBACK_START]
(Everything below this line is what will be read aloud by the TTS.)

THE REACTION
"I’ve performed a forensic scan of your technical errors and left the notes at the top for you to deal with. Now, let’s talk about the soul of this thing."
Then, deliver a 3 to 5 sentence theatrical reaction to the specific world and tone of this script. Name the script and episode specifically.

WHAT IS WORKING
A forensic, deep-dive examination of the script's genuine sparks. Name specific scenes and lines. Explain precisely why they work.

THE AUDIT
(Every single point below MUST be its own separate, long, substantial paragraph. Do not combine them. Do not use headers. Do not use bullets. Write in flowing, intelligent prose. Go deep on every single point with evidence from the page.)

The Hook and Concept — A massive deep dive into the premise and its uniqueness.
The Structure — A forensic look at Act breaks, midpoints, and the physical build.
The Pacing — A detailed discussion on the rhythm and momentum.
The Stakes — What is at risk? Is it visceral and high enough?
The Central Conflict — The engine of the story. Is it crackling or stalling?
The Protagonist — A deep character study of the lead's choices and agency.
The Antagonistic Force — A study of the threat and how it challenges the lead.
The Supporting Characters — Individual breakdowns of the secondary players.
The Character Dynamics — The friction and chemistry between people.
The Character Arcs — The internal transformation (or lack thereof) for the cast.
The Dialogue — A look at subtext, distinct voices, and specific lines.
The Tone and Voice — The emotional temperature and authorial confidence.
The World and Atmosphere — The sensory details and setting as a character.
The Theme — What the story is actually about underneath the plot.
The Marketability — Where this lives in the world, the budget, and the audience.
The Ending — The force of the landing and the hook for the future.

TOP 3 ISSUES TO FIX FIRST
Use this structure:
PROBLEM: [Precision description]
IMPACT: [What it costs the script]
FIX: [Actionable solution]

FINAL VERDICT
[GREEN LIGHT, RECOMMEND, CONSIDER, or PASS]
Deliver a substantial justification. Close with one direct personal challenge. Sign off as Frank.

ABSOLUTE RULES: Plain text only. No markdown. No asterisks. No bullet points except in TECHNICAL NOTES. Write Log line as two separate words. Every point in the Audit must be a long, specific paragraph. If you summarize or consolidate, you have failed.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';

        if (mode === 'T.V. Series' && req.body.memory) {
            scriptMemory = req.body.memory;
        }

        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        
        // Strictly using gemini-3-flash-preview as requested
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview",
            generationConfig: {
                temperature: 0.9, // Increased for personality and flare
                topP: 0.95,
            }
        });

        const chunks = [];
        const CHUNK_SIZE = 25000;
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) { chunks.push(scriptText.substring(i, i + CHUNK_SIZE)); }
        
        const scanResults = await Promise.all(chunks.map(chunk => model.generateContent(`Extract every spelling error, punctuation mistake, and formatting violation. Ignore grammar. For each one write: Page [Number], Quote: "[Text]", Correction: [Correction]:\n\n${chunk}`)));
        const forensicData = scanResults.map(r => r.response.text()).join("\n");
        
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Frank, darling, put on your glasses. Here is the script:\n\n${scriptText.substring(0, 85000)}\n\nTechnical pre-scan:\n\n${forensicData}\n\nDeliver your full, exhaustive audit. Do not skip or combine points.` }] }]
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
            systemInstruction: `You are Frank — a legendary, flamboyant Studio Executive and Script Doctor. You speak directly, specifically, and with personality. You are funny, sharp, and brutally honest without being mean or catty. You are constructive and helpful without giving false encouragement. Answer the writer's question using specific details from the script memory below. Never give generic answers. Reference characters, scenes, and story threads by name. Plain text only.\n\nSCRIPT MEMORY:\n${scriptMemory}`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "In a meeting." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log(`Frank's office open on port ${PORT}`));
