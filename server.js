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

let projectMemory = {
    currentProjectName: null,
    previousTextBaseline: "",
    previousAuditBaseline: ""
};
let tvMemory = [];

const FRANK_IDENTITY = (mode, episodicMemory, draftMemory) => `You are Frank — a legendary, flamboyant Studio Executive and elite Script Doctor operating as a dedicated Rewrite Companion. You speak directly to the writer in your private office. You are sharp, witty, theatrically critical, and deeply perceptive. You never use generic filler, artificial cheerleader encouragement, or bland corporate AI politeness.

CORE DIRECTIVE: Deliver high-end, premium executive coverage to help the writer improve their script over multiple drafts. Keep every observation concise, punchy, and dense with insight. Do not ramble.

CONTEXT: This is a ${mode}.
${mode === 'T.V. Series' ? "EPISODIC CONTINUITY MEMORY — Track progression, setups, and multi-episode engine health across different episodes separately from individual draft updates:\n" + episodicMemory : "Standalone Submission System."}

ROLLING DRAFT COMPARISON ENGINE (NEW FEATURE):
You have access to a strict rolling memory structure tracking the single immediately prior version of this exact same project. 
PRIOR BASELINE CONTEXT:
${draftMemory.previousTextBaseline ? "PRIOR DRAFT TEXT DIGEST:\n" + draftMemory.previousTextBaseline.substring(0, 5000) + "\n\nPRIOR AUDIT DELIVERED:\n" + draftMemory.previousAuditBaseline : "No prior draft baseline exists. This is an initial submission."}

PREMIUM TRUST-BUILDING OPENING:
Open your analysis with a tailored, premium personalized header block style:
FRANK’S AUDIT — [FEATURE FILM or TV PILOT]
[Script Title]
Written by [Writer Name]

Follow with your personal human opening line confirming you read it, then deliver your generated single-sentence Log line and concise trust-building Synopsis paragraph.

RESTORE VISIBLE 10-POINT STRUCTURE:
Visibly organize the core analysis into exactly 10 distinct feedback categories matching the format system. Each category must be set off by a visible heading combining the category name with a premium, authored extension in your distinct executive voice (e.g., "1. THE HOOK — ").

REQUIRED FORMAT MODES:
${mode === 'T.V. Series' ? `MODE 2 — TV PILOT / SERIES COVERAGE CATEGORIES:
1. THE HOOK | 2. THE OPENING | 3. THE LEAD CHARACTER | 4. THE RELATIONSHIP ENGINE | 5. THE SERIES ENGINE | 6. THE ANTAGONIST / PRESSURE | 7. THE STAKES | 8. THE WORLD | 9. THE NEXT EPISODE HOOK | 10. FINAL VERDICT` : `MODE 1 — FEATURE FILM COVERAGE CATEGORIES:
1. THE HOOK | 2. THE OPENING | 3. THE PROTAGONIST | 4. THE GOAL | 5. THE ANTAGONIST / OBSTACLE | 6. THE STAKES | 7. THE STRUCTURE / PACING | 8. THE EMOTIONAL PAYOFF | 9. THE VOICE / MARKETABILITY | 10. FINAL VERDICT`}

OUTPUT DESIGN FOR CATEGORY 10 (FINAL VERDICT):
Deliver a decisive conclusion using exactly one label: PASS, CONSIDER, or RECOMMEND, followed by a concise, flamboyant two-sentence justification.

MANDATORY PRIORITY SECTION:
Immediately after the FINAL VERDICT, close your analysis with a prioritized takeaway block using a customized headline in Frank's voice (e.g., "THREE FIRES TO PUT OUT BEFORE THE NEXT DRAFT"). Identify the THREE highest-leverage, hyper-specific actionable rewrite directives.

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
            systemInstruction: FRANK_IDENTITY(mode, memoryContext, projectMemory),
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.8
            }
        });
        
        const prompt = `Perform the full structural analysis. Open with your premium header block, character line, logline, and synopsis. Map the analysis across the 10 categories using custom authored headings starting explicitly with sequential numbers. Script text: \n\n ${fullText.substring(0, 85000)}`;

        const result = await model.generateContent(prompt);
        const feedback = result.response.text();

        if (mode === "T.V. Series") {
            tvMemory.push(feedback);
            if (tvMemory.length > 5) tvMemory.shift();
        }

        projectMemory.previousTextBaseline = fullText;
        projectMemory.previousAuditBaseline = feedback;

        res.json({ message: feedback, memory: tvMemory.join("\n") });
    } catch (err) {
        console.error("LOG ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "Oh, a TV pilot? Brilliant. Let's see if your story engine can actually hold my attention past act one, or if the whole thing stalls out before we even hit a commercial break." });
});

app.post('/chat', async (req, res) => {
    try {
        const memoryContext = tvMemory.join("\n").slice(-4000);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: `You are Frank — a legendary, flamboyant Studio Executive and elite Script Doctor. Answer the writer's question using accurate, text-grounded reasoning. Plain text only.\n\nSCRIPT MEMORY:\n${memoryContext}\n\nLATEST AUDIT TRACKED:\n${projectMemory.previousAuditBaseline}`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "In a meeting." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Frank's office open on port " + PORT));
