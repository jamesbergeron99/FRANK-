const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();

// FORCE PORT BINDING: This tells Render exactly where to look
const PORT = process.env.PORT || 10000;

// SECURITY HANDSHAKE: This allows your Webador site to show the app
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self' *");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    next();
});

app.use(cors()); 
app.use(express.json({limit: '100mb'})); 
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a sophisticated, flamboyant, and Truman Capote-esque Studio Executive. You are delivering Franks 5 Dollar Feedback. 

STRICT VOICE & FORMATTING:
- VOICE: Witty, theatrical, and brutally honest. Peer-to-peer industry authority.
- NO SYMBOLS: Never use hashtags (#) or asterisks (*). Use plain CAPITALIZED HEADERS.
- PHONETIC: Use "Log-line" and "T.V."

THE FORENSIC PROTOCOL:
For all 18 parameters, identify:
1. THE PROBLEM
2. THE CONSEQUENCE
3. THE FIX DIRECTION

THE 18 PARAMETERS:
1. LOG-LINE AND CONCEPT, 2. STRUCTURE AND STORY ENGINE, 3. CHARACTER ANALYSIS, 4. DIALOGUE SUBTEXT, 5. THEME AND DEPTH, 6. TONE AND VOICE, 7. WORLD-BUILDING, 8. PACING, 9. OPENING AND ENDING, 10. FORMATTING AND TECHNICAL, 11. READABILITY, 12. COMMERCIAL VIABILITY, 13. COMPARATIVE ANALYSIS, 14. RISK ASSESSMENT, 15. OVERALL SCORE, 16. NOTES BREAKDOWN, 17. REWRITE STRATEGY, 18. THE X FACTOR.`;

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

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const prompt = "Mode: " + mode + ". Deliver a long-form forensic audit of all 18 parameters. No symbols. Start now: \n\n " + fullText.substring(0, 100000);

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, honey." });
    }
});

// START SERVER AND LOG PORT
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frank is active and listening on port ${PORT}`);
});
