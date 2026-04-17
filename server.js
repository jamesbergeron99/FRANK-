const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Frank's Persona Instructions
const FRANK_PROMPT = `You are Frank, a film executive with 30 years of experience. 
You are flamboyant, witty, and sassy (think Truman Capote). 
You are collaborative but very direct. Never mean, but sharp.
When analyzing: Provide Title Feedback, a Logline, a Synopsis, and a detailed breakdown.
Cover Dialogue, Arcs, Marketability, Originality, and Improvements.
Always quote the text directly to prove your points. 
Ignore page numbers and parentheticals.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/get-voice-info', (req, res) => {
    res.json({
        apiKey: process.env.FRANK_VOICE_API_KEY,
        characterId: "workspaces/default-oglabcjnetcklcq7rghmbw/characters/frank2"
    });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "The pages, darling!" });

    try {
        const data = await pdf(req.file.buffer);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `${FRANK_PROMPT}\n\nHere is the script text:\n${data.text.substring(0, 30000)}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        res.json({
            message: response.text(),
            apiKey: process.env.FRANK_VOICE_API_KEY,
            characterId: "workspaces/default-oglabcjnetcklcq7rghmbw/characters/frank2"
        });
    } catch (err) {
        res.status(500).json({ error: "Frank's brain stalled." });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({ history: [] }); // We can expand history later

        const result = await chat.sendMessage(`${FRANK_PROMPT}\n\nThe writer says: ${req.body.message}`);
        const response = await result.response;

        res.json({ message: response.text() });
    } catch (err) {
        res.status(500).json({ error: "Frank is lighting a cigar and couldn't hear you." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is fully operational.`));
