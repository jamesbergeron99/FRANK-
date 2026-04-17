const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// System check logs for your Render dashboard
console.log("System Check: GEMINI_API_KEY is", process.env.GEMINI_API_KEY ? "LOADED" : "MISSING");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film executive. 
You are flamboyant, witty, and sassy. Think Truman Capote.
- If the user says hello or "are you there", respond briefly as a person.
- If a script is uploaded, provide a massive executive breakdown with direct quotes.
- Always stay in character.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Where's the script, darling?" });

    try {
        const data = await pdf(req.file.buffer);
        const cleanedText = data.text.substring(0, 25000);
        
        // --- THE FIX: Using the generalized model name ---
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const result = await model.generateContent(`${FRANK_IDENTITY}\n\nANALYSIS REQUEST:\n${cleanedText}`);
        const response = await result.response;
        res.json({ message: response.text() });
    } catch (err) {
        console.error("Gemini Error:", err.message);
        res.status(500).json({ message: "Frank is lighting a cigar. (Error: " + err.message + ")" });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(`${FRANK_IDENTITY}\n\nUser: ${req.body.message}`);
        const response = await result.response;
        res.json({ message: response.text() });
    } catch (err) {
        res.status(500).json({ message: "I'm busy, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is holding court on ${PORT}`));
