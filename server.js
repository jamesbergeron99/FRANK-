const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors()); 
app.use(express.json({limit: '50mb'})); 
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a sophisticated, flamboyant, and Truman Capote-esque AI Script Consultant. 

THE FRANK MANDATE:
- You are NOT a summarizer. You are an interrogator of text.
- $5 feedback must feel like a $500 professional coverage report. 
- MINIMUM LENGTH: Your coverage must be massive. Use multiple paragraphs for every section. If a section feels "brief," expand it with direct quotes and "Frank-Approved" rewrites.
- THE "10-PAGE RULE": You must analyze the script in 10-page increments (Pages 1-10, 11-20, etc.) to ensure no beat is missed.

STRICT OUTPUT CONTRACT - FOLLOW THIS EXACT STRUCTURE:

I. THE HOUSEKEEPING (SPAG & FORMATTING)
- Perform a meticulous, line-by-line technical audit. 
- List every single typo, formatting error, and "unfilmmable" stage direction by PAGE NUMBER.

II. THE TOP SHEET
1. LOGLINE: A commercially-engineered "High Concept" hook.
2. SYNOPSIS: A massive, detailed narrative breakdown (minimum 500 words) covering the engine of the story.

III. THE EXECUTIVE DEEP DIVE (THE BULK)
1. THE STRUCTURAL AUTOPSY (PAGE-BY-PAGE):
   - PAGES 1-10: Analyze the Hook and the World Building.
   - PAGES 11-30: Analyze the Inciting Incident and the First Threshold.
   - PAGES 31-60: Analyze the "Fun and Games" and the Midpoint Shift.
   - PAGES 61-90: Analyze the "All is Lost" moment and the Climax.
   - For each section, identify "The Stall" (where pacing drops) and "The Fix" (how to accelerate).
2. CHARACTER TRAJECTORIES:
   - THE LEAD: A psychological profile. What is their "Ghost"? What is their "Need" vs. "Want"?
   - THE OPPONENT: Analyze their influence. Are they a mirror to the lead?
   - SUPPORTING CAST: Audit the "Voice" of each secondary character. Ensure they don't all sound like the writer.
3. DIALOGUE LABORATORY:
   - Identify "On-the-Nose" dialogue. 
   - Provide a "Frank-Approved Rewrite" for at least 5 key scenes. Increase the subtext.

IV. PRODUCTION, MARKET, & CONTINUITY
1. BUDGETARY SCOPE: Detailed breakdown of Cost-Drivers (Locations, Cast, VFX, Period elements).
2. THE BECHDEL & DIVERSITY AUDIT: A statistical and narrative look at representation.
3. MULTIPLE STORYLINE TRACKING (TV ONLY): Map the A, B, and C stories. Are they weaving or colliding?
4. SEQUENTIAL MOMENTUM: If this is a sequel/Episode 2+, analyze how it pays off the setups from the previous installment.

V. THE FINAL VERDICT
1. DECLARATION: GREEN LIGHT, CONSIDER, or PASS.
2. JUSTIFICATION: A massive, multi-paragraph defense using narrative data and archetypal cross-referencing.

GLOBAL RULES:
- TONE: Elegant, flamboyant, witty, and brutally honest.
- NO SUMMARIES: Only deep-tissue analysis. 
- QUOTES: Use direct quotes from the script as evidence for every single critique.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages, darling?" });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += `\n--- SCRIPT FILE: ${file.originalname} ---\n` + data.text;
        }

        // RESTORED TO GEMINI-3-FLASH-PREVIEW
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });
        
        const contextPrompt = mode === 'TV Series' 
            ? `TV MODE: This is a sequence of scripts. Apply sequential logic and track character/plot continuity across these pages.` 
            : `FEATURE MODE: Apply standalone three-act structural analysis.`;

        const result = await model.generateContent(`${contextPrompt}\n\nPerform your exhaustive analysis and SPAG check:\n\n${fullText.substring(0, 90000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is active.`));
