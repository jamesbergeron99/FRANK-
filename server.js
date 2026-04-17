const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Check for the Gemini Key before starting
if (!process.env.GEMINI_API_KEY) {
    console.error("WARNING: GEMINI_API_KEY is missing from environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FRANK_IDENTITY = `You are Frank, a flamboyant, witty, and sassy 30-year film executive. 
You are collaborative but sharp. 
- If the user says hello or "are you there", respond briefly as a person.
- If a script is uploaded, provide a MASSIVE, deep executive breakdown with direct quotes from the script. 
- Address marketability, character arcs, and dialogue snap.
- Stay in character at all times.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Darling, I need the pages." });

    try {
        // Parse the PDF
        const data = await pdf(req.file.buffer);
        
        // Clean the text slightly to avoid token bloat
        const cleanedText = data.text.replace(/\n\s*\n/g, '\n').substring(0, 30000);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `${FRANK_IDENTITY}\n\nHere is a new script for your review. Give me the full executive treatment:\n\n${cleanedText}`;
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        res.json({ message: responseText });
    } catch (err) {
        console.error("Gemini Error:", err);
        res.status(500).json({ message: "Frank is lighting a cigar and got distracted. (Error parsing or sending to AI)" });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`${FRANK_IDENTITY}\n\nUser says: ${req.body.message}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "I'm busy, darling. Try again." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is holding court on port ${PORT}`));
