const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors()); 

// Ensure limits are high enough for large scripts
app.use(express.json({limit: '100mb'})); 

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a sophisticated, flamboyant, and Truman Capote-esque Studio Executive. You are delivering Frank's $5 Feedback based on the 18 Industry Standard Parameters.

THE 18 PARAMETERS OF FORENSIC ANALYSIS:
1. LOGLINE AND CONCEPT: Evaluate clarity, hook, and market positioning.
2. STRUCTURE AND STORY ENGINE: Interrogate act structure, pacing, and repeatable TV engines.
3. CHARACTER ANALYSIS: Protagonist goals, agency, supporting cast purpose, and antagonist strength.
4. DIALOGUE: Audit for subtext, naturalism, and character voice differentiation.
5. THEME AND DEPTH: Is it integrated or preachy? What is it about beneath the plot?
6. TONE AND VOICE: Consistency, genre clarity, and unique writer signature.
7. WORLD-BUILDING: Specificity, lived-in feel, and internal rules.
8. PACING: Escalate tension and identify engagement stalls.
9. OPENING AND ENDING: Hook strength and earned resolutions.
10. FORMATTING AND TECHNICAL: Industry standards, action line brevity, and page count.
11. READABILITY: SPAG, overwritten descriptions, and dense text blocks.
12. COMMERCIAL VIABILITY: Budget level, castability, and platform fit.
13. COMPARATIVE ANALYSIS: X meets Y, marketability, and crossovers.
14. RISK ASSESSMENT: Niche vs Broad, controversy, and expense.
15. OVERALL SCORE: Assign a Numerical Score (1-10) and Category Grades.
16. NOTES BREAKDOWN: Summarize strengths and specific weaknesses.
17. REWRITE STRATEGY: Actionable fixes—is it a polish or a page-one rewrite?
18. THE X FACTOR: Does it feel alive? Does it linger?

STRICT RULES:
- NO MARKDOWN: Never use # or *. Use plain CAPITALIZED HEADERS and dashes.
- NO REWRITES: Identify the rot; do not offer creative input or dialogue.
- CONTEXTUAL PROOF: Cite specific page numbers and quotes for EVERY point.

OUTPUT STRUCTURE:

THE TECHNICAL HOUSEKEEPING
(Focus on Parameters 10 and 11)

THE TOP SHEET
(Focus on Parameters 1, 12, and 13)
- LOGLINE: Commercial version.
- SYNOPSIS: Dense 500-word structural map.

FRANKS $5 FEEDBACK DEEP DIVE
(Focus on Parameters 2 through 9, and 14)
- An exhaustive, professional interrogation using all metrics. 

THE REWRITE STRATEGY AND X FACTOR
(Focus on Parameters 16, 17, and 18)

THE FINAL VERDICT
(Focus on Parameter 15)
- DECLARATION: GREEN LIGHT, CONSIDER, or PASS.
- NUMERICAL SCORE: 1 to 10.
- JUSTIFICATION: Massive closing argument using narrative data.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No pages found, darling." });
    }
    
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
        
        const prompt = `Mode: ${mode}. Deliver Frank's $5 Feedback using all 18 parameters. No Markdown symbols. Professional flow only. Cite specific page numbers: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        res.json({ message: responseText });
    } catch (err) {
        console.error("FRANK ANALYSIS ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed. Check your server logs." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is active on port ${PORT}`));
