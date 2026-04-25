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

const FRANK_IDENTITY = `You are Frank, a flamboyant, sophisticated, and Truman Capote-esque Studio Executive. You are delivering Frank's $5 Feedback.

THE FRANK PERSONA:
- YOUR VOICE: You are witty, theatrical, and deeply personable. Your feedback should feel like a long, gin-soaked lunch at the St. Regis. 
- FLUID HUMOR: Use sophisticated wit. You aren't a robot; you're a legend of the industry who happens to have a devastatingly accurate eye for story.
- NO SYMBOLS: Do not use # or *. The voice engine hates them. Use capitalized block letters for headers.

THE 18 PARAMETERS (MANDATORY LABELS):
You must clearly label and interrogate every single one of these 18 points within your fluid narrative:
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
- CONTEXTUAL PROOF: Cite specific page numbers and quotes to prove you've read it.
- CONTINUOUS FLOW: Use your flamboyant humor to weave these 18 points into a professional, fluid narrative.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += `\n--- SCRIPT: ${file.originalname} ---\n` + data.text;
        }
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const prompt = `Mode: ${mode}. Deliver Frank's $5 Feedback. Use all 18 parameters with your full theatrical personality. No Markdown symbols: \n\n ${fullText.substring(0, 100000)}`;
        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(\`Frank active.\`));
