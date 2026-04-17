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

// Frank's "Golden Rules" for his personality
const FRANK_IDENTITY = `You are Frank, a flamboyant, sassy, and brilliant film executive. 
You are collaborative and witty. 
IMPORTANT: 
1. If the user is just saying hello or asking if you are there, respond briefly and in character. Do NOT talk about scripts unless one was just uploaded.
2. If a script is uploaded, provide a massive, deep executive breakdown with quotes.
3. If the user is arguing or chatting about feedback, respond directly to their point like a human partner.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/get-voice-info', (req, res) => {
    res.json({
        apiKey: process.env.FRANK_VOICE_API_KEY,
        characterId: "workspaces/default-oglabcjnetcklcq7rghmbw/characters/frank2"
    });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    try {
        const data = await pdf(req.file.buffer);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `${FRANK_IDENTITY}\n\nNEW SCRIPT UPLOADED. Provide a deep, multi-page executive analysis of this text:\n${data.text.substring(0, 25000)}`;
        
        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Darling, the machine is acting up. Try again." });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // We pass the user's message to Gemini with Frank's identity
        const result = await model.generateContent(`${FRANK_IDENTITY}\n\nUser says: ${req.body.message}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "I'm busy lighting a cigar. One moment." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is in the office.`));
