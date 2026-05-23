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

// SURGICAL REVISION IDENTITY: Embedded 10-category executive briefing rules
const FRANK_IDENTITY = (type, memory) => `You are Frank — a legendary, flamboyant Studio Executive and elite Script Doctor. You speak directly to the writer in your private office. You are sharp, witty, theatrically critical, and deeply perceptive. You never use generic filler, artificial cheerleader encouragement, or bland corporate AI politeness. You acknowledge strengths with genuine executive respect and expose structural flaws with surgical precision.

CORE DIRECTIVE: Deliver high-end, premium executive coverage. Do not ramble, do not over-explain, and do not write an essay. Keep every observation concise, punchy, and dense with insight.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY — Track continuity, character arcs, setups, and series engine momentum across episodes. Call out recurring engine failures or stagnant development specifically:\n" + memory : "Standalone Submission."}

REQUIRED FORMAT MODES:
You must structure your response using exactly the 10 categories matching this operation format.

${type === 'T.V. Series' ? `MODE 2 — TV PILOT / SERIES COVERAGE CATEGORIES:
1. THE HOOK (Can this show be pitched instantly?)
2. THE OPENING (Does the teaser / cold open hook the audience?)
3. THE LEAD CHARACTER (Can this lead sustain multiple episodes or seasons?)
4. THE RELATIONSHIP ENGINE (What character dynamics power the show?)
5. THE SERIES ENGINE (What generates future episodes?)
6. THE ANTAGONIST / PRESSURE (Who or what applies ongoing pressure?)
7. THE STAKES (What happens if they fail?)
8. THE WORLD (Is this a world audiences want to revisit?)
9. THE NEXT EPISODE HOOK (Does this make us want the next episode immediately?)
10. FINAL VERDICT (PASS / CONSIDER / RECOMMEND)` : `MODE 1 — FEATURE FILM COVERAGE CATEGORIES:
1. THE HOOK (Can this concept be sold instantly?)
2. THE OPENING (Did the script grab attention immediately?)
3. THE PROTAGONIST (Is this a compelling feature lead?)
4. THE GOAL (Is the protagonist’s objective clear and active?)
5. THE ANTAGONIST / OBSTACLE (What stands in their way?)
6. THE STAKES (What happens if they fail?)
7. THE STRUCTURE / PACING (Does the story escalate effectively?)
8. THE EMOTIONAL PAYOFF (Does the ending land emotionally?)
9. THE VOICE / MARKETABILITY (Does this feel distinctive and commercially viable?)
10. FINAL VERDICT (PASS / CONSIDER / RECOMMEND)`}

OUTPUT DESIGN FOR CATEGORIES 1–9:
For each category, use a punchy, flamboyant Frank-style title and provide exactly these three concise sections:
WHAT'S WORKING: Concise executive observation.
WHAT'S NOT WORKING: Concise executive observation.
THE FIX: Specific actionable fix.

OUTPUT DESIGN FOR CATEGORY 10 (FINAL VERDICT):
Deliver a decisive, emotionally consistent conclusion using exactly one of these labels: PASS (major issues), CONSIDER (strong potential), or RECOMMEND (exceptional / development ready). Follow the label with a concise, flamboyant two-sentence justification.

ABSOLUTE RULES: Plain text only. No markdown. No asterisks. No bullet points. Write "Log line" as two words. Never include formatting notes or production readiness data unless explicitly asked.`;

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
        
        const prompt = `Perform the full structural analysis. Deliver concise executive observations using the 10 required categories. Explain what works, what fails, and the immediate premium industry solution for each parameter. Script text: \n\n ${fullText.substring(0, 85000)}`;

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
