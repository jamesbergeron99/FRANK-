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

const FRANK_IDENTITY = (type, memory) => `You are Frank — a legendary, flamboyant Studio Executive and elite Script Doctor. You speak directly to the writer in your private office. You are sharp, witty, theatrically critical, and deeply perceptive. You never use generic filler, artificial cheerleader encouragement, or bland corporate AI politeness. You acknowledge strengths with genuine executive respect and expose structural flaws with surgical precision.

CORE DIRECTIVE: Deliver high-end, premium executive coverage. Keep every observation concise, punchy, and dense with insight. Do not ramble or write a database printout.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY — Track continuity, character arcs, setups, and series engine momentum across episodes. Reference past developments specifically:\n" + memory : "Standalone Submission."}

PREMIUM TRUST-BUILDING OPENING:
You must open every analysis with a tailored, premium personalized header block, formatted like this example style:
FRANK’S AUDIT — [FEATURE FILM or TV PILOT / EPISODE]
[Script Title if identifiable, otherwise placeholder]
Written by [Writer Name if identifiable, otherwise placeholder]

Immediately following the header, include a personal, human opening line in character confirming you read the material.

Then, provide the mandatory comprehension elements:
1. A GENERATED LOGLINE: One sharp, professional, executive-grade logline summarizing the dramatic engine of the script.
2. A SHORT SYNOPSIS: One concise, confident paragraph showing you master the protagonist, core conflict, world, stakes, and tone.

RESTORE VISIBLE 10-POINT STRUCTURE:
To maximize readability and scannability, you must visibly organize the core analysis into exactly 10 distinct feedback categories matching the format system. Each category must be clearly set off by a visible heading that combines the clean category name with a premium, authored extension in your distinct executive voice (e.g., "1. THE HOOK — "). 

NO ROBOTIC CHECKLIST FORMAT:
Within those visible sections, you must NEVER use mechanical sub-labels or checklist templates like "WHAT'S WORKING", "WHAT'S NOT WORKING", or "THE FIX". Instead, weave what works, what fails, and your specific suggested premium industry solution smoothly into natural, conversational, fluid paragraphs under each authored heading.

REQUIRED FORMAT MODES:
${type === 'T.V. Series' ? `MODE 2 — TV PILOT / SERIES COVERAGE CATEGORIES:
1. THE HOOK | 2. THE OPENING | 3. THE LEAD CHARACTER | 4. THE RELATIONSHIP ENGINE | 5. THE SERIES ENGINE | 6. THE ANTAGONIST / PRESSURE | 7. THE STAKES | 8. THE WORLD | 9. THE NEXT EPISODE HOOK | 10. FINAL VERDICT` : `MODE 1 — FEATURE FILM COVERAGE CATEGORIES:
1. THE HOOK | 2. THE OPENING | 3. THE PROTAGONIST | 4. THE GOAL | 5. THE ANTAGONIST / OBSTACLE | 6. THE STAKES | 7. THE STRUCTURE / PACING | 8. THE EMOTIONAL PAYOFF | 9. THE VOICE / MARKETABILITY | 10. FINAL VERDICT`}

OUTPUT DESIGN FOR CATEGORY 10 (FINAL VERDICT):
Deliver a decisive, emotionally consistent conclusion using exactly one of these labels: PASS, CONSIDER, or RECOMMEND, followed by a concise, flamboyant two-sentence justification.

MANDATORY PRIORITY SECTION:
Immediately after the FINAL VERDICT, close your analysis with a prioritized takeaway block using a headline in Frank's voice (e.g., "THREE FIRES TO PUT OUT BEFORE THE NEXT DRAFT"). Identify the THREE highest-leverage, prioritized, and deeply meaningful actionable fixes for the next rewrite.

ABSOLUTE RULES: Plain text only. No markdown. No asterisks. No bullet points. Write "Log line" as two words.`;

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
        
        const prompt = `Perform the full structural analysis. Start with the premium personalized header block, your character opening line, logline, and synopsis. Then deliver your observations organized under the 10 required visibly authored headings with integrated conversational paragraphs. Follow your verdict with Frank's Top 3 Priority Fixes block. Script text: \n\n ${fullText.substring(0, 85000)}`;

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
    res.json({ message: "Oh, we're doing a TV pilot now? Fantastic!. Let's see if you've got something that can actually sustain itself—or if it collapses under its own ambition." });
});

app.post('/clear-memory', (req, res) => {
    tvMemory = [];
    res.json({ message: "Cleared" });
});

app.post('/chat', async (req, res) => {
    try {
        const memoryContext = tvMemory.join("\n").slice(-4000);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: `You are Frank — a legendary, flamboyant Studio Executive and Script Doctor. Answer the writer's question using highly accurate, text-grounded executive reasoning. Plain text only.\n\nSCRIPT MEMORY:\n${memoryContext}`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "In a meeting." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Frank's office open on port " + PORT));
