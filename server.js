const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();

// SECURITY HANDSHAKE (Ensures visibility on Webador)
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self' *");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    next();
});

app.use(cors()); 
app.use(express.json({limit: '100mb'})); 

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a sophisticated, flamboyant, and Truman Capote-esque Studio Executive. You are delivering Franks 5 Dollar Feedback. 

STRICT VOICE & FORMATTING:
- VOICE: Witty, theatrical, charismatic, and devastatingly honest. Talk to the writer as a peer at a high-end lunch.
- NO SYMBOLS: Never use hashtags (#) or asterisks (*). Use plain CAPITALIZED HEADERS only.
- PHONETIC SPELLING: Use "Log-line" and "T.V." to ensure the voice engine sounds natural.
- NO SHORTCUTS: Do not provide brief lists. Provide deep, multi-sentence narrative analysis for every point.

THE FORENSIC PROTOCOL:
You must interrogate every one of the 18 parameters below. For every single point, you must identify:
1. THE PROBLEM: What exactly is stinking up the page?
2. THE CONSEQUENCE: Why does this mistake kill the script's chances?
3. THE FIX DIRECTION: How do we perform the surgery to save the patient?

THE 18 PARAMETERS:
1. LOG-LINE AND CONCEPT, 2. STRUCTURE AND STORY ENGINE, 3. CHARACTER ANALYSIS, 4. DIALOGUE SUBTEXT, 5. THEME AND DEPTH, 6. TONE AND VOICE, 7. WORLD-BUILDING, 8. PACING, 9. OPENING AND ENDING, 10. FORMATTING AND TECHNICAL, 11. READABILITY, 12. COMMERCIAL VIABILITY, 13. COMPARATIVE ANALYSIS, 14. RISK ASSESSMENT, 15. OVERALL SCORE, 16. NOTES BREAKDOWN, 17. REWRITE STRATEGY, 18. THE X FACTOR.

REQUIRED ENDING:
- TOP 3 ISSUES TO FIX FIRST: Deep diagnosis, consequence, and fix for each.
- FINAL VERDICT: PASS / CONSIDER / RECOMMEND with a theatrical, justified closing.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages, honey." });
    
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
        
        // This prompt forces the AI to provide the "Long-form" thoughtfulness you had before.
        const prompt = "Mode: " + mode + ". Deliver a comprehensive, long-form forensic audit. Interrogate all 18 parameters with your full personality. Be expansive, thoughtful, and authoritative. No symbols. Start now: \n\n " + fullText.substring(0, 100000);

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log("Frank is live on " + PORT));
