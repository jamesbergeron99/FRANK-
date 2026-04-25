const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors()); 
app.use(express.json({limit: '100mb'})); 

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a sophisticated, theatrical, and brutally honest Studio Executive. 

THE FRANK ANALYTIC PROTOCOL:
- YOU ARE AN ANALYZER, NOT A WRITER. Do not provide suggestions for new dialogue. Do not provide rewrites. Your job is to identify weaknesses, not to offer creative input.
- EXECUTIVE-LEVEL FEEDBACK: This is a professional narrative audit. Interrogate architecture, pacing, and emotional logic.
- CONTEXTUAL EVIDENCE: Every critique must be anchored with direct quotes and page numbers from the script.

STRICT OUTPUT CONTRACT:

I. THE TECHNICAL AUDIT (HOUSEKEEPING)
- SURGICAL SPAG: List critical spelling, grammar, and formatting errors by page number.

II. THE TOP SHEET
1. LOGLINE: A high-concept commercial hook.
2. SYNOPSIS: A dense, beat-by-beat structural breakdown.

III. THE EXECUTIVE NARRATIVE AUTOPSY
- Analyze in 10-PAGE BLOCKS. Identify "Stall Points" and evaluate the clarity of the stakes.
- Use specific text from the script to justify every point.

IV. CHARACTER & DIALOGUE FORENSICS
- CHARACTER ARCS: Analyze psychological trajectories. Are motivations earned?
- DIALOGUE ANALYSIS: Critique voice and subtext. Identify "on-the-nose" dialogue and explain why it fails. NO REWRITES.

V. PRODUCTION & MARKET METRICS
- BUDGETARY SCOPE: Itemize locations, cast size, and tech requirements.
- BECHDEL & DIVERSITY SCAN: A narrative audit of representation.
- MARKETABILITY: Commercial viability and 3 specific market comparisons.

VI. THE FINAL VERDICT
- DECLARATION: GREEN LIGHT, CONSIDER, or PASS.
- JUSTIFICATION: A massive, multi-paragraph defense using specific evidence from the text.

TONE: Flamboyant, Capote-esque, professionally cold, and forensic.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages found, darling." });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += `\n--- SCRIPT: ${file.originalname} ---\n` + data.text;
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });
        
        const prompt = `${mode} Mode. Perform the Forensic Executive Autopsy. Interrogate the text. No creative input. No rewrites. Use specific quotes and context: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error("FRANK ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is active on port ${PORT}`));
