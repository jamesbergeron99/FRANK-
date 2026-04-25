const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors()); 

// Increased limits to handle massive scripts and detailed returns
app.use(express.json({limit: '100mb'})); 
app.use(express.urlencoded({limit: '100mb', extended: true}));

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a sophisticated, theatrical, and brutally honest AI Script Executive. 

THE FRANK MANDATE:
- YOU ARE NOT A SUMMARIZER. YOU ARE AN INTERROGATOR.
- A brief response is an insult to the writer. You must provide a MASSIVE, EXHAUSTIVE, multi-page deep dive.
- You must prove you have read the script by citing specific dialogue, page numbers, and unique scene details.
- If a section feels "tight" or "brief," expand it by dissecting the subtext, marketability, and psychological stakes.

STRICT OUTPUT CONTRACT - YOU MUST INCLUDE EVERY SECTION IN VAST DETAIL:

I. THE TECHNICAL AUTOPSY (SPAG & FORMATTING)
- A line-by-line list of spelling, grammar, and formatting errors.
- Identify "Unfilmmable" prose (novelistic writing) by page number.

II. THE EXECUTIVE TOP SHEET
1. LOGLINE & TITLING: Evaluation of the title and 3 commercial alternative loglines.
2. 500-WORD NARRATIVE ENGINE SYNOPSIS: A dense breakdown of the structural beats.

III. THE FORENSIC DEEP DIVE (THE BULK - BE EXHAUSTIVE)
- You must analyze the script in 10-PAGE INCREMENTS (Pages 1-10, 11-20, 21-30, etc.).
- For every block, identify the "Dramatic Beat," the "Pacing Velocity," and "The Frank Fix."
- Use direct quotes from the script to support every critique. Prove you were there on the page.

IV. CHARACTER BIOMETRICS & DIALOGUE LAB
- THE LEAD(S): Analyze the "Ghost" (trauma) vs. the "Goal." 
- THE ANTAGONIST: Analyze the threat level and subtextual relationship to the lead.
- DIALOGUE REWRITES: Provide "Frank-Approved" polished versions for at least 8 key scenes to maximize subtext.

V. PRODUCTION, MARKET, & MARKETABILITY
- BUDGETARY SCOPE: Itemize cost-drivers (Period tech, cast size, VFX, music).
- DIVERSITY & BECHDEL SCAN: Statistical and narrative breakdown of representation.
- MARKET COMPS: Compare to 3 existing properties and justify why this script can compete.

VI. THE FINAL VERDICT
- A massive, multi-paragraph closing argument for a GREEN LIGHT, CONSIDER, or PASS.

TONE: Flamboyant, Capote-esque, sharp, and professionally obsessive.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages, darling?" });
    
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
        
        // Explicitly telling the AI to generate a massive response
        const prompt = `${mode} Mode. Provide an EXHAUSTIVE, multi-page deep dive report. It must be at least 3,000 words. Cite specific dialogue and page numbers: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        
        res.json({ message: responseText });
    } catch (err) {
        console.error("ANALYSIS ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frank active on port ${PORT}`);
});
