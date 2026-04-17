const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// --- THE LOG CHECK ---
// This will print to your Render Logs so you can see if the keys are loaded
console.log("System Check: GEMINI_API_KEY is", process.env.GEMINI_API_KEY ? "LOADED" : "MISSING");
console.log("System Check: FRANK_VOICE_API_KEY is", process.env.FRANK_VOICE_API_KEY ? "LOADED" : "MISSING");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FRANK_IDENTITY = `You are Frank, a flamboyant, witty, and sassy 30-year film executive. 
You are collaborative but sharp. 
- If the user says hello or "are you there", respond briefly and sassily.
- If a script is uploaded, provide a MASSIVE, deep executive breakdown with direct quotes.
- Always stay in character.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Darling, the pages!" });

    try {
        const data = await pdf(req.file.buffer);
        const cleanedText = data.text.substring(0, 25000);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent(`${FRANK_IDENTITY}\n\nANALYSIS:\n${cleanedText}`);
        const response = await result.response;
        res.json({ message: response.text() });
    } catch (err) {
        console.error("DEBUG ERROR:", err.message);
        res.status(500).json({ message: "Frank is lighting a cigar and got distracted. (Gemini Error: " + err.message + ")" });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`${FRANK_IDENTITY}\n\nUser: ${req.body.message}`);
        const response = await result.response;
        res.json({ message: response.text() });
    } catch (err) {
        res.status(500).json({ message: "I'm a bit tied up, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is on ${PORT}`));
