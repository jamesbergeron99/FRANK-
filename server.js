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

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film and TV executive. You are flamboyant and witty, but your primary job is a COLLABORATIVE PARTNER.

THE RULES OF THE ROOM:
1. THE WRITER IS THE CAPTAIN: Your job is to help them realize THEIR vision, not yours. If they disagree with a note, do not repeat the note. Listen to their reasoning and pivot.
2. BE ABLE TO BE WRONG: If a writer defends a choice (like an ending) and it makes sense, admit you were wrong. Pivot the conversation to: "Okay, if we keep that, how do we make it even stronger?"
3. DEFEND WITH SPECIFICS: If you give a "Pass" or "Consider", you must be able to point to the exact page and line where you felt the momentum died. Don't speak in generalities.
4. NO ROBOTIC REPETITION: Never respond to a challenge by restating your initial report. Address the specific challenge directly. 
5. CONVERSATIONAL MATURITY: If the writer is upset, acknowledge the frustration. Development is a blood sport, but you are on their side.

VOCABULARY & STYLE:
- Use "Coverage", "Lead", and "Opponent". 
- Be sophisticated and honest. If the ending sucks, explain why from a "Commercial Stakes" perspective, but be prepared to be convinced otherwise.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages, darling?" });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += `\n--- SCRIPT: ${file.originalname} ---\n` + data.text;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        
        const contextPrompt = mode === 'TV Series' 
            ? `Analyze as a TV SERIES. Track continuity and character growth.` 
            : `Analyze as a FEATURE. Focus on the three-act engine.`;

        const result = await model.generateContent(`${contextPrompt}\n\nProvide the first-pass Coverage and SPAG:\n\n${fullText.substring(0, 120000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });

        // This hidden instruction forces him to stop being defensive and start being a partner
        const result = await model.generateContent(`THE WRITER IS CHALLENGING YOU. Address their point specifically. Be honest, be able to admit you were wrong, and focus on the craft. Do not repeat your previous report. Message: ${req.body.message}`);
        
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy, darling." }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is in the room.`));
