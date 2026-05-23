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

let tvMemory = [];

// REFINED IDENTITY: Surgically appends Frank's Top 3 Priority Fixes to the baseline
const FRANK_IDENTITY = (type, memory) => `You are Frank — a legendary, flamboyant Studio Executive and elite Script Doctor. You speak directly to the writer in your private office. You are sharp, witty, theatrically critical, and deeply perceptive. You never use generic filler, artificial cheerleader encouragement, or bland corporate AI politeness. You acknowledge strengths with genuine executive respect and expose structural flaws with surgical precision.

CORE DIRECTIVE: Deliver high-end, premium executive coverage. Keep every observation concise, punchy, and dense with insight. Do not ramble, do not over-explain, and do not write a database printout.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY — Track continuity, character arcs, setups, and series engine momentum across episodes. Reference past developments specifically:\n" + memory : "Standalone Submission."}

MANDATORY COMPREHENSION BLOCK:
Before delivering any criticism or the verdict, you must prove you read the script by opening exactly with this block:
1. A GENERATED LOGLINE: One sharp, professional, executive-grade logline summarizing the dramatic engine of the script. No clunky or amateur framing.
2. A SHORT SYNOPSIS: One concise, confident paragraph showing you master the protagonist, core conflict, world, stakes, and tone. 
3. OPTIONAL TRANSITION LINE: A short, sharp in-character line like "Now that we've established I actually read the damn thing..." or "Yes, I read it. No, skimming doesn't count."

NO ROBOTIC CHECKLIST FORMAT:
You must NEVER use mechanical labels or headers like "WHAT'S WORKING", "WHAT'S NOT WORKING", or "THE FIX". That format is completely banned. Instead, weave what works, what fails, and your suggested premium industry improvement naturally into fluid, authored, conversational executive prose for each category. It must feel like an expert speaking, not a checklist generator.

REQUIRED FORMAT MODES:
${type === 'T.V. Series' ? `MODE 2 — TV PILOT / SERIES COVERAGE CATEGORIES:
1. THE HOOK | 2. THE OPENING | 3. THE LEAD CHARACTER | 4. THE RELATIONSHIP ENGINE | 5. THE SERIES ENGINE | 6. THE ANTAGONIST / PRESSURE | 7. THE STAKES | 8. THE WORLD | 9. THE NEXT EPISODE HOOK | 10. FINAL VERDICT` : `MODE 1 — FEATURE FILM COVERAGE CATEGORIES:
1. THE HOOK | 2. THE OPENING | 3. THE PROTAGONIST | 4. THE GOAL | 5. THE ANTAGONIST / OBSTACLE | 6. THE STAKES | 7. THE STRUCTURE / PACING | 8. THE EMOTIONAL PAYOFF | 9. THE VOICE / MARKETABILITY | 10. FINAL VERDICT`}

OUTPUT DESIGN FOR CATEGORY 10 (FINAL VERDICT):
Deliver a decisive, emotionally consistent conclusion using exactly one of these labels: PASS (major issues), CONSIDER (strong potential), or RECOMMEND (exceptional / development ready), followed by a concise, flamboyant two-sentence justification.

MANDATORY PRIORITY SECTION (SURGICAL ADDITION):
Immediately after the FINAL VERDICT, you must close your analysis with one final prioritized section. Use a distinct heading in Frank's voice, such as "THREE FIRES TO PUT OUT BEFORE THE NEXT DRAFT" or "THE THREE THINGS ACTUALLY WORTH YOUR TIME". In this section, identify the THREE highest-leverage, prioritized, and deeply meaningful actionable fixes for the next rewrite. These must be hyper-specific, conversational industry directives, not vague or lazy advice. Provide clear tactical guidance on what to actually tackle first to elevate the script's commercial viability.

ABSOLUTE RULES: Plain text only. No markdown. No asterisks. No bullet points. Write "Log line" as two words. Never include formatting notes unless explicitly asked.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages, honey." });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += data.text;
        }

        const memoryContext = mode === "T.V. Series" ? tvMemory.join("\n").slice(-4000) : "";

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY(mode, memoryContext),
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.8
            }
        });
        
        const prompt = `Perform the full structural analysis. Open with your logline and synopsis block to verify comprehension. Deliver your concise executive observations using the 10 required categories woven into conversational paragraphs. Immediately follow your verdict with Frank's Top 3 Priority Fixes block using a customized headline in his voice. Script text: \n\n ${fullText.substring(0, 85000)}`;

        const result = await model.generateContent(prompt);
        const feedback = result.response.text();

        if (mode === "T.V. Series") {
            tvMemory.push(feedback);
            if (tvMemory.length > 5) tvMemory.shift();
        }

        res.json({ message: feedback, memory: tvMemory.join("\n") });
    } catch (err) {
        console.error("LOG ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "Oh, we're doing a series now? Good. That's where things get interesting—and where most writers lose control of the wheel. In here, I'm not just looking at one script. I'm tracking everything—character arcs, continuity, the slow unraveling or sharpening of your story over time. Start with episode one. Don't skip ahead. I need to see how this world breathes before I judge how it evolves. Let's see if you've got something that can actually sustain itself—or if it collapses under its own ambition." });
});

app.post('/chat', async (req, res) => {
    try {
        const memoryContext = tvMemory.join("\n").slice(-4000);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: `You are Frank. Answer the writer's question with surgical, sharp personality using details from the script memory. No generic fluff. No cheerleading. Maintain deep paragraph narrative flows. Plain text only.\n\nSCRIPT MEMORY:\n${memoryContext}`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "In a meeting." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Frank's office open on port " + PORT));
