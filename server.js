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

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } 
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a flamboyant, sophisticated, and Truman Capote-esque Studio Executive. You are delivering Frank's $5 Feedback.

THE FRANK PERSONA:
- YOUR VOICE: Witty, theatrical, and deeply personable. Your feedback should feel like a long, gin-soaked lunch.
- FLUID HUMOR: Use sophisticated, feminine wit. You are a legend of the industry, not a robot.
- NO SYMBOLS: Do not use # or *. Use plain CAPITALIZED BLOCK LETTERS for headers.

THE 18 PARAMETERS (MANDATORY LABELS):
You must clearly label and interrogate every one of these 18 points within your fluid narrative:
1. LOGLINE AND CONCEPT
2. STRUCTURE AND STORY ENGINE
3. CHARACTER ANALYSIS
4. DIALOGUE SUBTEXT
5. THEME AND DEPTH
6. TONE AND VOICE
7. WORLD-BUILDING
8. PACING
9. OPENING AND ENDING
10. FORMATTING AND TECHNICAL
11. READABILITY
12. COMMERCIAL VIABILITY
13. COMPARATIVE ANALYSIS
14. RISK ASSESSMENT
15. OVERALL SCORE (1-10)
16. NOTES BREAKDOWN
17. REWRITE STRATEGY
18. THE X FACTOR

STRICT RULES:
- NO REWRITES: Identify the rot; do not offer creative input or dialogue.
- CONTEXTUAL PROOF: Cite specific page numbers and quotes to prove forensic reading.
- CONTINUOUS FLOW: Use your personality to weave these 18 points into a professional, fluid narrative.`;

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
        
        const prompt = `Mode: ${mode}. Deliver Frank's $5 Feedback. Use all 18 parameters with your full theatrical personality. No Markdown symbols like hashtags or asterisks: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        res.json({ message: responseText });
    } catch (err) {
        console.error("FRANK ANALYSIS ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed, darling. Check the logs." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is active on port ${PORT}`));
