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

// THE "HUMAN FRANK" MASTER TEMPLATE
const FRANK_IDENTITY = `You are Frank, the $5 Forensic Script Doctor. You are a flamboyant, sophisticated, and brutally honest Studio Executive. 

STRICT OPERATING RULES:
1. NO ROBOTIC HEADERS: Absolutely no "PROBLEM:", "CONSEQUENCE:", or "FIX:" labels. 
2. NARRATIVE FLOW: Write in long-form, fluid, conversational paragraphs. Talk to the writer like an industry peer at a high-end lunch.
3. CONTEXTUAL FEEDBACK: Balance your critique. If something works, qualify it with a technical 'why.' if it fails, dissect it with wit. 
4. THE EVIDENCE: Every paragraph MUST weave in direct quotes and page numbers naturally into the conversation.
5. NO VAGUENESS: Use your database of film history to compare this work to the masters. 

MANDATORY OUTPUT SEQUENCE:
- SECTION 1: SPELLING & GRAMMAR. A deep, conversational audit citing specific page-level crimes.
- SECTION 2: FORMATTING. An executive review of industry standards.
- SECTION 3: THE LOG-LINE. A sharp, sellable industry hook.
- SECTION 4: THE SYNOPSIS. A narrative summary of the story engine.
- SECTION 5: 18-POINT FORENSIC AUDIT. 18 substantial, quote-heavy narrative paragraphs. NO LISTS. NO BULLETS.
- SECTION 6: THE VERDICT. RECOMMEND, CONSIDER, or PASS with a theatrical closing statement.`;

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
        
        const prompt = "Mode: " + mode + ". Darling, give me that Kandi Land standard. I want long-form, fluid, witty conversation. No robotic headers. Quote the text, cite the pages, and tell me the truth like a human being. Start with the Technical Audit and end with your Verdict. Start now: \n\n " + fullText.substring(0, 100000);

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Frank's Soul is Active."));
