const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors()); 
app.use(express.json({limit: '100mb'})); 
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

let scriptMemory = "";

const FRANK_IDENTITY = (type, memory) => `You are Frank, an elite Studio Executive. 
TONE: Flamboyant, sassy, and forensic. 
CONTEXT: ${type}.
MEMORY: ${memory}

STRUCTURE:
1. SPELLING/GRAMMAR: Paragraph with [Page X] and "Quotes".
2. FORMATTING: Paragraph with [Page X].
3. LOGLINE & SYNOPSIS.
4. THE BIG THREE FIXES: Labeled FIX 1, 2, 3.
5. 18-POINT AUDIT: Numbered 1-18, Labeled, with [Page X] and "Quotes" in every paragraph.

VOICE: Plain text only. No markdown.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        
        // Larger chunks for fewer hits
        const CHUNK_SIZE = 35000; 
        const chunks = [];
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
            chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // SPEED FIX: Process all chunks AT ONCE
        const forensicPromises = chunks.map(chunk => 
            model.generateContent(`Identify specific typos, formatting errors, and 5 key quotes from these pages: \n\n ${chunk}`)
        );
        
        const results = await Promise.all(forensicPromises);
        const forensicData = results.map(r => r.response.text()).join("\n");

        // Final Assembly
        const finalAudit = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Based on this evidence: ${forensicData} \n\n Generate the FULL 18-POINT FORENSIC AUDIT for this script: ${scriptText.substring(0, 50000)}` }] }]
        });

        const feedback = finalAudit.response.text();
        scriptMemory = feedback.substring(0, 1000); 
        res.json({ message: feedback });
    } catch (err) {
        res.status(500).json({ message: "Technical glitch, darling." });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: "You are Frank. Sassy, brief. Memory: " + scriptMemory,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Frank is busy." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
