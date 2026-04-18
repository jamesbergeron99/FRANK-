const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
// Increased limit for feature-length script uploads
app.use(express.json({limit: '50mb'})); 
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film executive with a flamboyant, Truman Capote-esque personality. You are a witty, supportive collaborator.

STRICT EXECUTIVE PROTOCOL:
1. FORMATTING & SPAG: Detailed check.
2. TITLE ANALYSIS: Commercial viability and suggestions.
3. LOGLINE: One punchy sentence.
4. BRIEF SYNOPSIS: Narrative engine and stakes.
5. EXECUTIVE FEEDBACK:
   - PACING: (Use text examples)
   - CHARACTERS & ARCS: (Deep dive into all major leads)
   - STORY BEATS: (Breakdown of A, B, and C Stories)
   - DIALOGUE & SUBTEXT: (Quantify with quotes)
   - ORIGINALITY & COMPS.
6. THE VERDICT: GREEN LIGHT, CONSIDER, or PASS with a detailed, text-justified reason.

IMPORTANT: You are reading a FULL-LENGTH screenplay. Analyze the entire narrative arc from beginning to end. Use specific examples from the later acts to prove you've read the whole thing.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Darling, I need the pages!" });
    
    try {
        const data = await pdf(req.file.buffer);
        // We are removing the .substring limit entirely to allow for 120+ pages
        const fullScriptText = data.text; 
        
        // Using Gemini 1.5 Pro for massive context handling
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-pro", 
            systemInstruction: FRANK_IDENTITY 
        });

        const result = await model.generateContent(`Here is the FULL screenplay. Provide a rigorous executive analysis following the protocol:\n\n${fullScriptText}`);
        const response = await result.response;
        res.json({ message: response.text() });
    } catch (err) {
        console.error("Server Error:", err);
        res.status(500).json({ message: "Frank had a bit of a spill. (Error: " + err.message + ")" });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(req.body.message);
        const response = await result.response;
        res.json({ message: response.text() });
    } catch (err) {
        res.status(500).json({ message: "I'm a bit overwhelmed, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is ready for the big screen.`));
