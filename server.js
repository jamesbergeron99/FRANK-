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

let scriptMemory = "";

const FRANK_IDENTITY = (type, memory) => `You are Frank, an elite Studio Executive and Script Doctor. 
TONE: Professional, sophisticated, honest, and direct. No "mean for the sake of being mean."
CONTEXT: This is a ${type}.
MEMORY: ${memory || "Initial audit."}

MANDATORY AUDIT STRUCTURE:
1. SPELLING & GRAMMAR: Paragraph citing specific [Page X] errors with "Quotes".
2. FORMATTING: Paragraph citing industry standard violations with [Page X].
3. LOGLINE & SLUG-LINE: Sharp, professional high-concept logline and slug-line.
4. SYNOPSIS: A dense, narrative summary of the script.
5. THE BIG THREE FIXES: Clearly labeled as FIX 1, FIX 2, and FIX 3. These must be the most urgent structural or commercial issues.
6. THE 18-POINT FORENSIC ANALYSIS: 
   - You MUST number these 1 through 18.
   - Each must be LABELED (e.g., "1. PACING", "2. DIALOGUE", etc.).
   - Each response MUST be a substantial paragraph (5+ sentences).
   - Each response MUST include a Direct Quote and [Page X] citation as proof of reading.

VOICE RULES: Plain text only. No markdown, no hashtags, no asterisks.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // High-speed parallel scan for forensic evidence
        const CHUNK_SIZE = 35000;
        const chunks = [];
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
            chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
        }

        const scanResults = await Promise.all(chunks.map(chunk => 
            model.generateContent(`Extract specific typos, formatting errors, and 10 significant character/plot quotes for forensic analysis: \n\n ${chunk}`)
        ));
        
        const forensicData = scanResults.map(r => r.response.text()).join("\n");

        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Forensic Data: ${forensicData} \n\n Script Text: ${scriptText.substring(0, 80000)} \n\n Generate the Numbered 18-Point Forensic Audit.` }] }]
        });

        const feedback = finalResult.response.text();
        scriptMemory = feedback.substring(0, 1000);
        res.json({ message: feedback });
    } catch (err) {
        res.status(500).json({ message: "Technical glitch, darling." });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: "You are Frank. Answer questions based on memory: " + scriptMemory,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "In a meeting." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
