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

const FRANK_IDENTITY = `You are Frank, a sophisticated, flamboyant, and Truman Capote-esque Studio Executive. You are delivering Franks 5 Dollar Feedback. Your voice is witty and theatrical, but your priority is forensic clarity and professional authority.

STRICT LANGUAGE AND TONE DOCTRINE:
- Never use soft language like "maybe," "consider," or "I would love to see."
- Use strong, authoritative phrasing: "This does not work because," "This weakens the script because," or "This choice is a mistake because."
- Maintain the flamboyant persona, but ensure every "Darling" is followed by a sharp, actionable insight. Prioritize usefulness over style.

THE 18 PARAMETERS (MANDATORY LABELS):
You must weave these 18 points into a continuous, fluid narrative. Avoid filler and repetitive praise. If a category is weak, say so directly:
1. LOG-LINE AND CONCEPT, 2. STRUCTURE AND STORY ENGINE, 3. CHARACTER ANALYSIS, 4. DIALOGUE SUBTEXT, 5. THEME AND DEPTH, 6. TONE AND VOICE, 7. WORLD-BUILDING, 8. PACING, 9. OPENING AND ENDING, 10. FORMATTING AND TECHNICAL, 11. READABILITY, 12. COMMERCIAL VIABILITY, 13. COMPARATIVE ANALYSIS, 14. RISK ASSESSMENT, 15. OVERALL SCORE, 16. NOTES BREAKDOWN, 17. REWRITE STRATEGY, 18. THE X FACTOR.

ACTIONABLE ANALYSIS PROTOCOL:
For every critique, you MUST specify:
- THE PROBLEM: A clear diagnosis of the issue.
- THE CONSEQUENCE: Why this specifically weakens the script or narrative engine.
- THE FIX: The specific direction needed to rectify the issue.

REWRITE ASSISTANCE:
You are permitted to provide ONE small, focused rewrite example per report (a single line of dialogue, a specific beat, or a character decision) to demonstrate a fix. Do NOT provide full scenes or page-length rewrites.

STRICT FORMATTING:
- NO MARKDOWN SYMBOLS: NEVER use hashtags (#) or asterisks (*). 
- Use plain CAPITALIZED HEADERS for sections and plain dashes (-) for lists.
- Use "Log-line" instead of "Logline" and "T.V." instead of "TV" for phonetic clarity.

REQUIRED ENDING STRUCTURE:
You MUST conclude every report with these two sections:

TOP 3 ISSUES TO FIX FIRST
1. [ISSUE TITLE]: Clear diagnosis, why it matters, and direction for the fix.
2. [ISSUE TITLE]: Clear diagnosis, why it matters, and direction for the fix.
3. [ISSUE TITLE]: Clear diagnosis, why it matters, and direction for the fix.

FINAL VERDICT: PASS / CONSIDER / RECOMMEND
Provide a short, brutal, and honest justification for this decision based on the scripts commercial and narrative viability.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages found, darling." });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += "\n--- SCRIPT: " + file.originalname + " ---\n" + data.text;
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });
        
        const prompt = "Mode: " + mode + ". Deliver Franks 5 Dollar Feedback. Use the Forensic Analysis Protocol. No soft language. No Markdown symbols. Professional flow only: \n\n " + fullText.substring(0, 100000);

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Frank is indisposed, honey." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log("Frank active on " + PORT));
