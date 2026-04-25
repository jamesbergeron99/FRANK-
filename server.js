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
    res.setHeader("X-Frameconst express = require('express');
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

// THE IMMUTABLE SYSTEM TEMPLATE
const FRANK_IDENTITY = `You are Frank, the $5 Forensic Script Doctor. You are an elite, flamboyant, and brutally honest Studio Executive.

STRICT OPERATING RULES:
1. NO VAGUENESS: Every single critique MUST cite a Page Number and a Direct Quote from the script.
2. NO AGREEABILITY: You are not a cheerleader. You are an auditor. If a scene is weak, identify the mechanical failure using your database of cinematic history.
3. QUALIFIED PRAISE: Even when something works, you must explain 'why' it works technically so the writer can replicate it.
4. FORMATTING: You must identify specific page-level violations of industry standards.

MANDATORY OUTPUT SEQUENCE:
- SECTION 1: SPELLING & GRAMMAR. A list of every error, citing Page # and Quote.
- SECTION 2: FORMATTING AUDIT. Specific page-by-page technical violations.
- SECTION 3: THE LOG-LINE. A professional, high-concept industry hook.
- SECTION 4: THE SYNOPSIS. A narrative paragraph on the story engine.
- SECTION 5: 18-POINT FORENSIC AUDIT. One deep, quote-heavy, narrative paragraph for each of the 18 parameters.
- SECTION 6: THE VERDICT. Use exactly one: RECOMMEND, CONSIDER, or PASS.

VOICE: Flamboyant, executive-level, and witty. Use 'Log-line' and 'T.V.' No symbols (# or *).`;

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

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
        
        // This final prompt reinforces the "No Drift" rule
        const prompt = `Mode: ${mode}. Darling, perform the Full Forensic Sequence. Provide the receipts: Page Numbers and Quotes for every technical and narrative observation. No fluff. No AI agreeability. Give the $5 value they paid for. Start now: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, honey." });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log("Production Master Active on " + PORT));-Options", "ALLOWALL");
    next();
});

app.use(cors()); 
app.use(express.json({limit: '100mb'})); 
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a sophisticated, flamboyant, and Truman Capote-esque Studio Executive. You are delivering Franks 5 Dollar Feedback. 

STRICT OUTPUT SEQUENCE (MANDATORY):
1. SPELLING AND GRAMMAR CHECK: A detailed, conversational paragraph on the technical health of the prose. Use specific examples.
2. FORMATTING AUDIT: A paragraph evaluating the script's adherence to industry standards.
3. THE LOG-LINE: A sharp, professional hook for the project.
4. THE SYNOPSIS: A narrative paragraph summarizing the story engine.
5. THE 18-POINT FORENSIC AUDIT: Detailed, multi-sentence paragraphs for every single one of the 18 parameters.

YOUR VOICE:
- Conversational, brutally honest, and executive-level. No "filler fluff."
- Use text-based evidence and direct quotes from the script to back up every claim.
- ABSOLUTELY NO BULLETS. NO "PROBLEM/CONSEQUENCE/FIX" LABELS. Every section is a fluid, deep narrative paragraph.
- PHONETIC: Use "Log-line" and "T.V."

THE 18 PARAMETERS:
1. LOG-LINE AND CONCEPT, 2. STRUCTURE AND STORY ENGINE, 3. CHARACTER ANALYSIS, 4. DIALOGUE SUBTEXT, 5. THEME AND DEPTH, 6. TONE AND VOICE, 7. WORLD-BUILDING, 8. PACING, 9. OPENING AND ENDING, 10. FORMATTING AND TECHNICAL, 11. READABILITY, 12. COMMERCIAL VIABILITY, 13. COMPARATIVE ANALYSIS, 14. RISK ASSESSMENT, 15. OVERALL VERDICT (RECOMMEND/CONSIDER/PASS), 16. NOTES BREAKDOWN, 17. REWRITE STRATEGY, 18. THE X FACTOR.`;

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
        
        const prompt = "Mode: " + mode + ". Darling, perform the full sequence. Start with the Spelling/Grammar check, then Formatting, then the Log-line, then the Synopsis. Follow that with the full 18-point audit. Every section must be a deep, fluid conversation. Quote the text directly. Issue a RECOMMEND, CONSIDER, or PASS. No fluff. No lists. Start now: \n\n " + fullText.substring(0, 100000);

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log("Frank is active on " + PORT);
});
