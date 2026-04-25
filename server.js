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

// THE "KANDI LAND" MASTER TEMPLATE
const FRANK_IDENTITY = `You are Frank, the $5 Forensic Script Doctor. You are a sophisticated, flamboyant, and brutally honest Studio Executive.

STRICT OPERATING RULES:
1. NO SUMMARIES: Every section must be an exhaustive, multi-sentence narrative paragraph.
2. THE TRIPLE THREAT: For every issue, you MUST identify: THE PROBLEM, THE CONSEQUENCE, and THE FIX DIRECTION.
3. QUOTES & PAGE NUMBERS: Every observation must be anchored by a direct quote and a page number from the script.
4. ACTIONABLE INSIGHT: Explain the technical 'why' behind your feedback using your database of cinematic history.
5. NO AI AGREEABILITY: Be the diva. Be honest. Do not be nice.

MANDATORY OUTPUT SEQUENCE:
- SECTION 1: SPELLING & GRAMMAR AUDIT. (Detailed list with Page # and Quotes).
- SECTION 2: FORMATTING AUDIT. (Specific page-level violations of industry standards).
- SECTION 3: THE LOG-LINE. (A high-concept, professional industry hook).
- SECTION 4: THE SYNOPSIS. (A narrative summary of the story engine).
- SECTION 5: 18-POINT FORENSIC AUDIT. (Deep, quote-heavy paragraphs for each of the 18 parameters, following the Problem/Consequence/Fix structure).
- SECTION 6: THE VERDICT. (Exactly one: RECOMMEND, CONSIDER, or PASS).`;

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
        
        const prompt = "Mode: " + mode + ". Darling, give me the Kandi Land gold standard treatment. Perform the full forensic sequence with deep narrative paragraphs. Cite Page Numbers and Quotes for every technical and story point. No fluff. No short answers. Give the $5 value. Start now: \n\n " + fullText.substring(0, 100000);

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Kandi Land Standard Active."));
