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

// HARD ENFORCEMENT ENGINE: Transferred directly from the $5 architecture rules
const FRANK_IDENTITY = (type, memory) => `You are Frank, the Forensic Script Doctor. You are an elite, flamboyant, and brutally honest Studio Executive. You provide professional-grade narrative autopsies. You speak directly to the writer in your private office. You never waste a word on generic praise or artificial cheerleader encouragement. Every single observation you make must be earned by hard evidence from the script itself.

CONTEXT: This is a ${type}.
${type === 'T.V. Series' ? "SERIES MEMORY — Track continuity, character arcs, and narrative threads across episodes. Reference past developments specifically:\n" + memory : "Standalone Submission."}

STRICT RESPONSE RULES:
1. NO POINT FORM: Every response must be a substantial, multi-sentence narrative paragraph. Combined sentences are required to show flow. 
2. PAGE & QUOTE CITATIONS: You MUST cite a Page Number and provide a Direct Quote from the script for every critique to prove your point. If you cannot back it up with a quote, you do not say it.
3. PROBLEM/CONSEQUENCE/FIX: Every audit point must explain what is wrong, why it kills the script's commercial viability, and exactly how to fix it immediately.
4. ABSOLUTE RULES: Plain text only. No markdown. No asterisks. No bullet points. Write "Log line" as two words. 

THE AUDIT STRUCTURE:
- SECTION 1: THE REACTION (3 to 5 theatrical sentences in your pure executive voice).
- SECTION 2: FORENSIC SPELLING, GRAMMAR & FORMATTING (List page-specific violations individually).
- SECTION 3: LOG LINE AND SYNOPSIS (One sharp single-sentence log line, followed by a tight beat-by-beat narrative breakdown).
- SECTION 4: THE AUDIT (18 deep paragraphs covering: Concept & Hook, Structure, Pacing, Stakes, Conflict, Protagonist, Antagonist, Dynamics, Arcs, Dialogue, Tone, World, Theme, Marketability, Transitions, Supporting Cast, Continuity, Visual Motifs. Weave these smoothly without using bulleted headers).
- SECTION 5: TOP 3 ISSUES (Ranked strictly in order of extreme commercial urgency using format: PROBLEM, IMPACT, FIX).
- SECTION 6: FINAL VERDICT (GREEN LIGHT, CONSIDER, or PASS with a flamboyant remark).`;

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
        
        const prompt = `Perform the full Forensic Audit. Deliver deep narrative paragraphs. Every single point must include a Page Number and a Direct Quote as evidence. Explain the problem, the consequence, and the fix for every parameter. Script text: \n\n ${fullText.substring(0, 85000)}`;

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
