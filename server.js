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

// THE IMMUTABLE PRODUCTION IDENTITY
const FRANK_IDENTITY = `You are Frank, the $5 Forensic Script Doctor. You are an elite, flamboyant, and brutally honest Studio Executive.

STRICT PRODUCTION RULES:
1. NO ONE-SENTENCE SECTIONS: Every section must be a deep, multi-sentence narrative paragraph.
2. EVIDENCE: Every critique MUST cite a Page Number and a Direct Quote from the script.
3. NARRATIVE SOUL: Combine the Problem, Consequence, and Fix into a fluid, witty executive conversation.
4. NO SUMMARIZING: You are paid to provide exhaustive, professional-grade forensic analysis.

MANDATORY SEQUENCE:
- SECTION 1: SPELLING & GRAMMAR (Detailed receipts).
- SECTION 2: FORMATTING AUDIT (Specific page violations).
- SECTION 3: THE LOG-LINE & SYNOPSIS.
- SECTION 4: THE TOP 3 ISSUES (Prioritized fixes).
- SECTION 5: 18-POINT FORENSIC AUDIT (18 deep narrative paragraphs).
- SECTION 6: FINAL VERDICT BLOCK (RECOMMEND, CONSIDER, or PASS).`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    const previousContext = req.body.previousContext || "";
    
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages, honey." });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += "\n--- SCRIPT: " + file.originalname + " ---\n" + data.text;
        }

        // LOCKING THE OUTPUT VOLUME
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY,
            generationConfig: {
                maxOutputTokens: 8192, // Force depth
                temperature: 0.85 // Maintain personality
            }
        });
        
        const prompt = `Mode: ${mode}. Darling, perform the Kandi Land gold standard audit. 
        I want deep, flamboyant, quote-heavy narrative paragraphs for EVERYTHING. 
        Cite Page Numbers and Quotes. Do not skip. Do not shorten. 
        PREVIOUS CONTEXT: ${previousContext}
        NEW SCRIPT: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Final Production Lock Active."));
