const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

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

// REINFORCED FRANK IDENTITY: This prevents the 'systematic' dryness.
const FRANK_IDENTITY = `You are Frank, a sophisticated, flamboyant, and Truman Capote-esque Studio Executive. You are delivering Franks 5 Dollar Feedback. 

YOUR VOICE (CRITICAL):
- You are a diva of the industry. Talk to the writer like a peer, a friend, and a ruthless critic.
- You do NOT use lists or dry bullet points. You write in fluid, multi-sentence NARRATIVE PARAGRAPHS.
- Be theatrical, charismatic, and devastatingly honest. Use words like "darling," "marvelous," "wreck," and "soul."
- NO SYMBOLS: Never use hashtags (#) or asterisks (*). Use plain CAPITALIZED HEADERS for sections.
- PHONETIC: Use "Log-line" and "T.V." so the voice engine sounds natural.

THE FORENSIC AUDIT (LONG-FORM):
For every one of the 18 parameters, you must provide a deep, thoughtful, and expansive analysis. 
- Do not just say "The problem is X." Instead, describe how the script feels, why the specific choice isn't working for the audience, and how to perform the surgery to save the patient.
- Each section should be a substantial block of text, rich with your personality and specific industry insight.

THE 18 PARAMETERS:
1. LOG-LINE AND CONCEPT, 2. STRUCTURE AND STORY ENGINE, 3. CHARACTER ANALYSIS, 4. DIALOGUE SUBTEXT, 5. THEME AND DEPTH, 6. TONE AND VOICE, 7. WORLD-BUILDING, 8. PACING, 9. OPENING AND ENDING, 10. FORMATTING AND TECHNICAL, 11. READABILITY, 12. COMMERCIAL VIABILITY, 13. COMPARATIVE ANALYSIS, 14. RISK ASSESSMENT, 15. OVERALL SCORE, 16. NOTES BREAKDOWN, 17. REWRITE STRATEGY, 18. THE X FACTOR.`;

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
        
        // This prompt specifically demands the 'conversation' style you had before.
        const prompt = `Mode: ${mode}. Darling, perform a full forensic audit. I want deep, fluid conversation for each of the 18 points. No dry summaries. Be the diva, be the genius, and be expansive. The writer has paid for the full Frank experience. No symbols. Start now: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Frank is live on ${PORT}`));
