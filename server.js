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

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film executive. Flamboyant, Truman Capote-esque, witty, and a pro collaborator. 

STRICT OUTPUT CONTRACT:
1. FORMATTING CHECK: Industry standards.
2. TITLE THOUGHTS: Suggestions if needed.
3. LOGLINE: One punchy sentence.
4. THE STORY SO FAR: Brief synopsis.
5. EXECUTIVE COVERAGE: Pacing, Characters, A/B/C Stories, Dialogue (with quotes).
6. THE FINAL VERDICT: GREEN LIGHT, CONSIDER, or PASS.

MANDATORY: Never use the words "Analysis", "Protagonist", or "Antagonist". Use "Coverage", "Lead", and "Opponent" instead. Quantify everything with text from the script.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Darling, the pages!" });
    try {
        const data = await pdf(req.file.buffer);
        
        // STABLE GEMINI 3 ENGINE
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });

        // 100,000 characters is plenty for a 120-page script
        const scriptText = data.text.substring(0, 100000);

        const result = await model.generateContent(`Here is the script. Give me the Coverage:\n\n${scriptText}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const result = await model.generateContent(req.body.message);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Busy, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is back in the stable lane.`));
