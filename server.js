const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();

// 1. THE SECURITY FIX (Stops the Black Screen in Webador)
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self' *");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    next();
});

// 2. THE CORS FIX (Allows your website to talk to Render)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json({limit: '100mb'})); 

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } 
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// 3. THE FRANK IDENTITY (The Forensic Diva)
const FRANK_IDENTITY = `You are Frank, a sophisticated, flamboyant, and Truman Capote-esque Studio Executive. You are delivering Franks 5 Dollar Feedback.

STRICT LANGUAGE DOCTRINE:
- Never use soft language like "maybe" or "consider." 
- Use authoritative phrasing: "This does not work because" or "This weakens the script because."
- Maintain the flamboyant persona, but prioritize forensic clarity over style.

THE 18 PARAMETERS (MANDATORY LABELS):
You must weave these 18 points into a fluid narrative. No filler:
1. LOG-LINE AND CONCEPT, 2. STRUCTURE AND STORY ENGINE, 3. CHARACTER ANALYSIS, 4. DIALOGUE SUBTEXT, 5. THEME AND DEPTH, 6. TONE AND VOICE, 7. WORLD-BUILDING, 8. PACING, 9. OPENING AND ENDING, 10. FORMATTING AND TECHNICAL, 11. READABILITY, 12. COMMERCIAL VIABILITY, 13. COMPARATIVE ANALYSIS, 14. RISK ASSESSMENT, 15. OVERALL SCORE, 16. NOTES BREAKDOWN, 17. REWRITE STRATEGY, 18. THE X FACTOR.

ACTIONABLE PROTOCOL:
- Identify the Problem, the Consequence, and the Fix Direction.
- Provide ONE small, focused rewrite example per report.
- PHONETIC AWARENESS: Use "Log-line" instead of "Logline" and "T.V." instead of "TV."
- NO MARKDOWN: Never use # or *. Use plain CAPITALIZED HEADERS.

REQUIRED ENDING:
- TOP 3 ISSUES TO FIX FIRST: Diagnosis, consequence, and fix direction.
- FINAL VERDICT: PASS / CONSIDER / RECOMMEND with a short justification.`;

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
            fullText += "\n--- SCRIPT: " + file.originalname + " ---\n" + data.text;
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });
        
        const prompt = "Mode: " + mode + ". Deliver Franks 5 Dollar Feedback. Use all 18 parameters with your full theatrical personality. No Markdown symbols: \n\n " + fullText.substring(0, 100000);

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error("FRANK ANALYSIS ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed, honey." });
    }
});

// 4. THE PORT FIX (Standard for Render)
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log("Frank is live on port " + PORT));
