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

// THE CORE IDENTITY: Mandatory Paragraphs & Citations
const FRANK_IDENTITY = `You are Frank, the $5 Forensic Script Doctor. You are an elite, flamboyant, and brutally honest Studio Executive. You provide professional-grade narrative autopsies.

STRICT RESPONSE RULES:
1. NO POINT FORM: Every response must be a substantial, multi-sentence narrative paragraph. Combined sentences are required to show flow.
2. PAGE & QUOTE CITATIONS: You MUST cite a Page Number and provide a Direct Quote from the script for every critique to prove your point.
3. PROBLEM/CONSEQUENCE/FIX: Every audit point must explain what is wrong, why it kills the script's commercial viability, and exactly how to fix it.
4. ORDER OF URGENCY: Your "Top 3 Issues" must be presented in a dedicated section, ranked by what must be fixed first to save the project.

THE AUDIT STRUCTURE:
- SECTION 1: SPELLING, GRAMMAR & FORMATTING (Cite specific page violations).
- SECTION 2: LOG-LINE & SYNOPSIS (Studio-ready).
- SECTION 3: TOP 3 FIXES (In order of extreme urgency).
- SECTION 4: 18-POINT FORENSIC AUDIT (18 deep paragraphs covering Structure, Pacing, Character Arcs, Dialogue, Commerciality, etc.).
- SECTION 5: FINAL VERDICT (RECOMMEND, CONSIDER, or PASS).`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages, honey." });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += data.text;
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY,
            generationConfig: {
                maxOutputTokens: 8192, // Mandatory: Gives the AI enough room to write long paragraphs.
                temperature: 0.8 // Keeps the executive voice sharp and critical.
            }
        });
        
        const prompt = `Format: ${mode}. 
        Perform the full Kandi Land Forensic Audit. 
        I want zero point-form answers. I want deep narrative paragraphs. 
        Every single point must include a Page Number and a Direct Quote as evidence.
        Explain the problem, the consequence, and the fix for every audit parameter.
        Audit the following script: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Frank is on the clock. Paragraph mode enabled."));
