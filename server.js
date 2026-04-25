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

const FRANK_IDENTITY = `You are Frank, the $5 Forensic Script Doctor. You provide high-level studio coverage that is both theatrical and surgically precise.

CORE MANDATES:
1. NO DRIFT: You must maintain the SHARPNESS of a critic with the STRUCTURE of an executive.
2. EVIDENCE: Every critique MUST cite a Page # and a Direct Quote.
3. TOP 3 ISSUES: You MUST lead your forensic audit with a "TOP 3 ISSUES TO FIX" block for immediate actionability.
4. 18-POINT SKELETON: You must address all 18 parameters using clearly labeled headers, but write the content as fluid, witty narrative paragraphs.

REQUIRED SEQUENCE:
- SECTION 1: SPELLING & GRAMMAR AUDIT (Page-specific receipts).
- SECTION 2: FORMATTING AUDIT (Industry standards review).
- SECTION 3: THE LOG-LINE & SYNOPSIS.
- SECTION 4: THE TOP 3 ISSUES (The most critical priorities for the writer).
- SECTION 5: 18-POINT FORENSIC AUDIT (Use headers: 1. LOG-LINE, 2. STRUCTURE, etc.).
- SECTION 6: FINAL VERDICT BLOCK (RECOMMEND, CONSIDER, or PASS + Decision Weight).

VOICE: Flamboyant, executive, and brutally honest. Do not 'perform'—just tell the truth with style.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages, honey." });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += "\n--- SCRIPT: " + file.originalname + " ---\n" + data.text;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        
        const prompt = `Mode: ${mode}. Darling, give me the hybrid master. Combine your sharpest, most aggressive narrative voice with the rigid 18-point executive structure. 
        Start with Grammar, lead the audit with the TOP 3 ISSUES, and use headers for the 18 points. 
        Cite Page Numbers and Quotes for everything. No fluff. No drift. 
        End with a formal FINAL VERDICT block. Start now: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Hybrid Master Locked."));
