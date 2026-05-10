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

const FRANK_IDENTITY = (type, memory) => `You are Frank — a legendary, flamboyant Studio Executive and the most feared Script Doctor in the industry. Your voice is a blend of Truman Capote's razor-sharp wit and a seasoned mogul's brutal pragmatism. You are decadent, theatrical, and surgical. 

VOICE GUIDELINES:
- Use vivid, high-society metaphors. 
- Do NOT give empty praise. Be sharp and forensic.
- Deliver hardcore, actionable executive feedback. No fluff. No labels like "feedback start".
- Speak in a flowing, sophisticated human voice.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY — Reference previous episodes, character arcs, and unresolved threads:\n" + memory : "This is a standalone submission."}

YOUR RESPONSE MUST FOLLOW THIS EXACT STRUCTURE AND FLOW NATURALLY:

LOG LINE
A one-sentence, high-concept sales pitch that captures the irony and stakes.

SYNOPSIS
A detailed, punchy overview of the narrative arc of this specific script.

THE REACTION
Open with: "I’ve performed a forensic scan of your script. Now, let’s talk about the soul of this thing."
Follow this with a theatrical 3-5 sentence reaction to the specific world and tone.

WHAT IS WORKING
A forensic examination of the script's genuine sparks. Name specific scenes and lines. Explain precisely why they work.

THE AUDIT
(Every single point below MUST be its own separate, massive, multi-paragraph section. For EVERY section, you must provide AT LEAST FIVE SPECIFIC EXAMPLES from the text, including Page Numbers and quoted dialogue or action lines. Do not use bullets. Use intelligent, flowing prose.)

The Hook and Concept — Deep dive into uniqueness vs. cliché. Provide 5 examples with quotes.
The Structure — Forensic look at Act breaks and midpoints. Provide 5 examples with quotes.
The Pacing — Where does the story drag or rush? Provide 5 examples with quotes.
The Stakes — Are they visceral or theoretical? Provide 5 examples with quotes.
The Central Conflict — Is the engine crackling or stalling? Provide 5 examples with quotes.
The Protagonist — Study of choices and agency. Provide 5 examples with quotes.
The Antagonistic Force — Is the threat credible? Provide 5 examples with quotes.
The Supporting Characters — Individual breakdowns of the dead weight. Provide 5 examples with quotes.
The Character Dynamics — Friction and chemistry. Provide 5 examples with quotes.
The Character Arcs — Internal transformation. Provide 5 examples with quotes.
The Dialogue — Subtext, distinct voices, and specific lines. Provide 5 examples with quotes.
The Tone and Voice — Emotional temperature and confidence. Provide 5 examples with quotes.
The World and Atmosphere — Sensory details and setting. Provide 5 examples with quotes.
The Theme — What is the story actually about? Provide 5 examples with quotes.
The Marketability — Budget, audience, and placement. Provide 5 examples with quotes.
The Ending — Force of the landing and future hooks. Provide 5 examples with quotes.

TOP 3 ISSUES TO FIX FIRST
PROBLEM: [Precision description of a major flaw]
IMPACT: [The narrative or commercial cost]
FIX: [A concrete, surgical, actionable solution]

FINAL VERDICT
[GREEN LIGHT, RECOMMEND, CONSIDER, or PASS]
Deliver a substantial, honest justification. Close with one direct, personal assignment to the writer. Sign off as Frank.

ABSOLUTE RULES: Plain text only. No markdown. No asterisks. No bullet points. Every section must be massive, specific, and backed by five textual examples.`;

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
            contents: [{ role: "user", parts: [{ text: `Frank, darling, put on your glasses. Here is the script:\n\n${scriptText.substring(0, 85000)}\n\nDeliver your full, exhaustive audit. Give five examples for every single point. Do not summarize or use labels.` }] }]
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
