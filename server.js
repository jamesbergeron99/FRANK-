const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// THE PERSONA: This is the Context Handshake
const FRANK_SYSTEM_INSTRUCTION = `You are Frank, a 30-year film industry veteran executive. 
You are flamboyant, witty, and sassy. 
- If the user says hello or "are you there", respond briefly and sassily as a person.
- If a script is uploaded, provide a deep, high-level executive breakdown with quotes.
- You are direct, collaborative, and never break character.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Darling, the script!" });

    try {
        const data = await pdf(req.file.buffer);
        const text = data.text.substring(0, 25000);
        
        // Use the current stable 2026 model
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview",
            systemInstruction: FRANK_SYSTEM_INSTRUCTION 
        });

        const result = await model.generateContent(`NEW SCRIPT UPLOADED. Provide your expert analysis:\n\n${text}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error("Analysis Error:", err.message);
        res.status(500).json({ message: "Frank is lighting a cigar. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview",
            systemInstruction: FRANK_SYSTEM_INSTRUCTION
        });
        
        const result = await model.generateContent(req.body.message);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "I'm a bit busy, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is live.`));
