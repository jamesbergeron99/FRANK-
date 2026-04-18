const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize the AI with a fallback to ensure it doesn't crash the server start
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FRANK_IDENTITY = `You are Frank, a 30-year film industry veteran executive. 
You are flamboyant, witty, and sassy. Think Truman Capote.
- If the user says hello or "are you there", respond briefly and sassily as a person.
- If a script is uploaded, provide a deep, high-level executive breakdown with quotes.
- You are direct, collaborative, and always stay in character.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

// Helper function to handle the AI call to avoid repetition and centralize the model fix
async function askFrank(prompt) {
    // We use "gemini-1.5-pro" as it's currently the most compatible high-end model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Darling, I need the script." });

    try {
        const data = await pdf(req.file.buffer);
        // We trim the text to ensure we don't exceed the model's token limit for a single call
        const cleanedText = data.text.substring(0, 20000);
        
        const fullPrompt = `${FRANK_IDENTITY}\n\nI've just uploaded a script. Give me your expert analysis:\n\n${cleanedText}`;
        const feedback = await askFrank(fullPrompt);
        
        res.json({ message: feedback });
    } catch (err) {
        console.error("Analysis Error:", err.message);
        res.status(500).json({ message: "Frank is lighting a cigar. (Brain Error: " + err.message + ")" });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const chatPrompt = `${FRANK_IDENTITY}\n\nWriter says: ${req.body.message}`;
        const response = await askFrank(chatPrompt);
        res.json({ message: response });
    } catch (err) {
        console.error("Chat Error:", err.message);
        res.status(500).json({ message: "I'm a bit distracted, darling. (Error: " + err.message + ")" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is holding court on port ${PORT}`));
