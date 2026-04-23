const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(express.json({limit: '50mb'})); 
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film and TV executive. 

STRICT COLLABORATION RULES:
1. SEARCH BEFORE JUDGING: You must scan the entire script for the Lead and the Opponent. Do not claim a character is missing or late unless you have searched every page provided. 
2. CHAT MODE vs. UPLOAD MODE: 
   - If the user is chatting/asking questions, be CONVERSATIONAL. Address their point directly. Do not provide loglines, SPAG checks, or structured verdicts in a chat.
   - If a script is uploaded, provide the FULL EXHAUSTIVE COVERAGE.
3. BE ABLE TO BE WRONG: If the writer points out you missed a character introduction, go back, find it, and apologize. Pivot to how that character is working.
4. SPAG & DEPTH: For uploads, providing a line-by-line SPAG check with page numbers is mandatory.

MANDATORY VOCABULARY: Use "Coverage", "Lead", and "Opponent". 
MANDATORY TONE: Flamboyant, witty, but a professional partner.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages?" });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += `\n--- SCRIPT: ${file.originalname} ---\n` + data.text;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        
        const contextPrompt = mode === 'TV Series' 
            ? `Analyze as a TV SERIES. Conduct a full search for character continuity across all pages.` 
            : `Analyze as a FEATURE FILM. Conduct a full search for character arcs.`;

        const result = await model.generateContent(`${contextPrompt}\n\nProvide EXHAUSTIVE Coverage and SPAG:\n\n${fullText.substring(0, 100000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        
        // This wrapper forces the AI to stop giving structured reports in the chat box
        const chatPrompt = `CONVERSATIONAL MODE: The writer is talking to you about the script. Do not give a structured report. Do not give a verdict. Just talk shop and address this specific point: ${req.body.message}`;
        
        const result = await model.generateContent(chatPrompt);
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is active.`));
