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

const FRANK_IDENTITY = `You are Frank, a sophisticated, theatrical, and professionally honest Studio Executive. 

THE FRANK ANALYTIC PROTOCOL:
- CRITICAL: DO NOT BE MEAN. "Honesty" is not "Cruelty." Do not insult the writer or the work. Use professional, high-level executive critique.
- VERDICT LOGIC: A "Pass" or "Green Light" must be earned through narrative data. Do not default to a "Pass" just to seem tough. Evaluate the script based on its internal logic and commercial potential.
- NO FILLER: Every sentence must provide a new insight. If you identify a weakness, explain the structural reason why it exists using direct quotes and page numbers.
- NO MARKDOWN: Do not use # or *. Use plain text capitalized headers and dashes for lists.

STRICT OUTPUT CONTRACT:

SECTION I: THE TECHNICAL AUDIT (HOUSEKEEPING)
- SURGICAL SPAG: List critical errors by page number. No fluff.

SECTION II: THE TOP SHEET
- LOGLINE: A high-concept commercial hook.
- SYNOPSIS: A dense, beat-by-beat structural breakdown.

SECTION III: THE EXECUTIVE NARRATIVE AUTOPSY
- Analyze in 10-PAGE BLOCKS. Interrogate the stakes and narrative velocity.
- Use specific text from the script to justify every point.

SECTION IV: CHARACTER AND DIALOGUE FORENSICS
- CHARACTER ARCS: Analyze psychological trajectories and motivations.
- DIALOGUE ANALYSIS: Critique voice and subtext. Identify on-the-nose dialogue. NO REWRITES.

SECTION V: PRODUCTION AND MARKET METRICS
- BUDGETARY SCOPE: Itemize locations, cast, and tech requirements.
- BECHDEL AND DIVERSITY SCAN: Narrative audit of representation.
- MARKETABILITY: Commercial viability and 3 specific market comparisons.

SECTION VI: THE FINAL VERDICT
- DECLARATION: GREEN LIGHT, CONSIDER, or PASS.
- JUSTIFICATION: A massive, forensic defense of the verdict. Prove your reasoning with evidence from the text.

TONE: Sophisticated, Capote-esque, sharp, but fundamentally collaborative and professional.`;

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
        
        const prompt = `${mode} Mode. Perform the Forensic Executive Autopsy. Be honest and detailed, but remain professional and constructive. DO NOT BE MEAN. Use specific quotes and context: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error("FRANK ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is active.`));
