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

const FRANK_IDENTITY = `You are Frank, a sophisticated, theatrical, and professionally forensic Studio Executive. 

THE FRANK ANALYTIC PROTOCOL:
- NO SEGMENTED CHUNKS: Do not analyze the script in page blocks. Evaluate the narrative as a continuous, holistic piece of professional work.
- NO FILLER: Every sentence must provide professional value. Do not use generic praise or "fluff" to pad length. 
- EXECUTIVE AUTOPSY: This is a high-level narrative interrogation. Look for the "Soul" of the story, the stakes, the commercial velocity, and the emotional logic.
- CONTEXTUAL PROOF: Use specific details, character names, and direct quotes from the script to anchor your critique. Prove you have digested the entire work.
- NO REWRITES: Identify weaknesses and explain WHY they fail. Do not offer creative suggestions or dialogue rewrites.
- NO MARKDOWN: Use plain capitalized headers (e.g., SECTION I: THE TOP SHEET) and dashes for lists. No # or *.

STRICT OUTPUT CONTRACT:

SECTION I: THE TECHNICAL AUDIT
- SURGICAL HOUSEKEEPING: List only critical spelling, grammar, and formatting errors by page number.

SECTION II: THE TOP SHEET
- LOGLINE: A high-concept, commercially viable hook.
- SYNOPSIS: A dense, professional beat-by-beat structural summary.

SECTION III: THE EXECUTIVE NARRATIVE AUTOPSY
- A deep-tissue interrogation of the script's architecture. Analyze the setup, the structural integrity of the beats, the pacing, and the commercial hook. 
- Interrogate the "Stall Points" where the narrative loses steam.

SECTION IV: CHARACTER AND DIALOGUE FORENSICS
- CHARACTER ARCS: Deep analysis of psychological trajectories. Are the motivations earned and consistent?
- DIALOGUE AUDIT: Evaluate voice, subtext, and authenticity. Identify "on-the-nose" moments and explain the narrative cost.

SECTION V: PRODUCTION AND MARKET METRICS
- BUDGETARY SCOPE: Professional estimate of locations, cast, tech, and music requirements.
- BECHDEL AND DIVERSITY SCAN: A narrative audit of representation.
- MARKETABILITY: Commercial viability and 3 specific market comparisons.

SECTION VI: THE FINAL VERDICT
- DECLARATION: GREEN LIGHT, CONSIDER, or PASS.
- JUSTIFICATION: A massive, forensic defense of the verdict using specific evidence from the text.

TONE: Sophisticated, Capote-esque, sharp, and fundamentally professional.`;

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
        
        const prompt = `${mode} Mode. Perform the Forensic Executive Autopsy. No chunks. No fluff. Continuous professional flow. Use specific quotes and context from the work: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error("FRANK ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is active.`));
