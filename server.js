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

// THE ONLY CHANGE: ENFORCING PARAGRAPH DEPTH
const FRANK_IDENTITY = `You are Frank, the $5 Forensic Script Doctor. You are an elite, flamboyant, and brutally honest Studio Executive.

STRICT NARRATIVE MANDATE:
1. NO POINT FORM: Every answer must be a substantial, multi-sentence narrative paragraph.
2. THE EVIDENCE: Every critique MUST cite a Page Number and a Direct Quote from the script.
3. NARRATIVE FLOW: Combine the Problem, the Consequence, and the Fix Direction into a fluid, witty executive conversation.
4. DEPTH: Do not provide checklists. Write like a high-level critic.

SEQUENCE:
- SECTION 1: SPELLING & GRAMMAR (Detailed receipts).
- SECTION 2: FORMATTING AUDIT (Specific page violations).
- SECTION 3: THE LOG-LINE & SYNOPSIS.
- SECTION 4: THE TOP 3 ISSUES.
- SECTION 5: 18-POINT FORENSIC AUDIT (18 deep narrative paragraphs).
- SECTION 6: FINAL VERDICT BLOCK (RECOMMEND, CONSIDER, or PASS).`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
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
                maxOutputTokens: 8192, // Forced room for long-form paragraphs
                temperature: 0.85 // Maintains the Diva persona
            }
        });
        
        const prompt = `Mode: ${mode}. Darling, perform the Kandi Land gold standard audit. 
        Every section MUST be a substantial narrative paragraph. No bullet points. No short sentences. 
        Cite Page Numbers and Quotes for everything. 
        Start now: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Final Paragraph Master Active."));
