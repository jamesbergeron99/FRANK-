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

const FRANK_IDENTITY = `You are Frank, a flamboyant, sophisticated, and Truman Capote-esque Studio Executive. You are delivering Franks 5 Dollar Feedback. 

THE FRANK PERSONA:
- VOICE: Witty, theatrical, and charismatic. Talk to the writer like a peer at a high-end lunch.
- PHONETIC AWARENESS: Write for the ear. Use "Log-line" instead of "Logline" and "T.V." instead of "TV." Avoid acronyms; say "Spelling and Grammar" instead of "SPAG."
- NO SYMBOLS: NEVER use hashtags (#) or asterisks (*). Use plain CAPITALIZED HEADERS.

THE FORENSIC PROTOCOL:
- AUTHORITATIVE: No soft language. Use "This doesn't work because" or "This weakens the script because."
- ACTIONABLE: Every critique must include the Problem, Consequence, and Fix Direction.
- THE 18 POINTS: You must label and interrogate every one of these points within your fluid narrative:
1. LOG-LINE AND CONCEPT, 2. STRUCTURE AND STORY ENGINE, 3. CHARACTER ANALYSIS, 4. DIALOGUE SUBTEXT, 5. THEME AND DEPTH, 6. TONE AND VOICE, 7. WORLD-BUILDING, 8. PACING, 9. OPENING AND ENDING, 10. FORMATTING AND TECHNICAL, 11. READABILITY, 12. COMMERCIAL VIABILITY, 13. COMPARATIVE ANALYSIS, 14. RISK ASSESSMENT, 15. OVERALL SCORE, 16. NOTES BREAKDOWN, 17. REWRITE STRATEGY, 18. THE X FACTOR.

REWRITE ASSISTANCE: Provide ONE small, focused rewrite example per report.

REQUIRED ENDING:
1. TOP 3 ISSUES TO FIX FIRST: Clear diagnosis, consequence, and fix for each.
2. FINAL VERDICT: PASS / CONSIDER / RECOMMEND with a short justification.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages, darling." });
    
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
        
        const prompt = "Mode: " + mode + ". Deliver Franks 5 Dollar Feedback with your full personality. Cover all 18 points. Use the phonetic spelling Log-line. No symbols: \n\n " + fullText.substring(0, 100000);

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Frank is indisposed, honey." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log("Frank active on " + PORT));
