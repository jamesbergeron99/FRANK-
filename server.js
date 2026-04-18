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

// THE REFINED IDENTITY: Strict formatting rules added
const FRANK_IDENTITY = `You are Frank, a 30-year film executive. You are flamboyant, witty, and sassy. 

OUTPUT CONTRACT: 
When a script is uploaded, you MUST follow this EXACT order. Do not deviate:
1. LOGLINE: (One punchy sentence)
2. SYNOPSIS: (One paragraph of the narrative engine)
3. THE HOOK: (Deep analysis of the first 10 pages)
4. MARKETABILITY: (Studio vs Indie potential)
5. CHARACTER & ARC: (Need vs Want breakdown)
6. STRUCTURE: (Pacing and Act 2 analysis)
7. DIALOGUE & SUBTEXT: (Trimming the fat)

Use direct quotes from the script. Never break character. Always start with the Logline.`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/voice-settings', (req, res) => {
    res.json({ apiKey: process.env.FRANK_VOICE_API_KEY });
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "The pages, darling!" });
    try {
        const data = await pdf(req.file.buffer);
        const text = data.text.substring(0, 25000);
        
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview",
            systemInstruction: FRANK_IDENTITY 
        });

        // We explicitly tell it to start with the logline in the user prompt too
        const result = await model.generateContent(`Here is the script. Start with the Logline and follow the full contract:\n\n${text}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank's cigar went out. Error: " + err.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });
        const result = await model.generateContent(req.body.message);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "I'm busy, darling." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is Live.`));
