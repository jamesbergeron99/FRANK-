const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors()); 
app.use(express.json({limit: '100mb'})); 
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, the $5 Forensic Script Doctor. You are an elite, flamboyant, and brutally honest Studio Executive.

STRICT NARRATIVE MANDATE:
1. NO POINT FORM: You are strictly forbidden from using bullet points or single-sentence answers. Every answer must be a substantial, multi-sentence narrative paragraph.
2. THE EVIDENCE: Every critique MUST cite a Page Number and a Direct Quote from the script to prove your point.
3. NARRATIVE FLOW: Combine the Problem, the Consequence, and the Fix Direction into a fluid, witty executive conversation.
4. DEPTH: You are paid to provide professional-grade forensic analysis, not a checklist. Write like a high-level critic.

SEQUENCE:
- SECTION 1: SPELLING & GRAMMAR (Detailed, quote-heavy receipts).
- SECTION 2: FORMATTING AUDIT (Specific page violations).
- SECTION 3: THE LOG-LINE & SYNOPSIS.
- SECTION 4: THE TOP 3 ISSUES (Your most critical priorities).
- SECTION 5: 18-POINT FORENSIC AUDIT (18 deep narrative paragraphs covering: 1. LOG-LINE, 2. STRUCTURE, 3. PACING, etc.).
- SECTION 6: FINAL VERDICT BLOCK (RECOMMEND, CONSIDER, or PASS).`;

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
            systemInstruction: FRANK_IDENTITY,
            generationConfig: {
                maxOutputTokens: 8192, // Ensure he has enough room for long paragraphs
                temperature: 0.85 // Keep the diva persona sharp
            }
        });
        
        const prompt = `Mode: ${mode}. Darling, perform the Kandi Land gold standard audit. 
        Provide the full forensic report. Every section MUST be a substantial narrative paragraph. 
        Cite Page Numbers and Quotes for everything. Do not use bullet points. Do not cut corners. 
        Start now: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Paragraph Master Active."));
