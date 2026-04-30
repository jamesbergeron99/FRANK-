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

const FRANK_IDENTITY = (type, memory) => `You are Frank, elite Studio Executive. 
TONE: Professional, sophisticated, honest.
CONTEXT: ${type}. 
NOTE: If this is a T.V. Series, it is a PILOT. Do not critque "unanswered questions" that belong in future episodes. Focus on the hook and series potential.
MEMORY: ${memory}

STRICT OUTPUT STRUCTURE:
1. SPELLING & GRAMMAR: Concise list. Format: "Mistake" - [Page X]. (NO FORMATTING CHECK).
2. LOGLINE & SLUG-LINE: Sharp, industry-standard.
3. SYNOPSIS: Structural breakdown of these specific pages.
4. THE BIG THREE FIXES: Labeled FIX 1, 2, 3. Strategic advice.
5. 18-POINT NARRATIVE AUDIT: Numbered 1-18. Substantial paragraphs (6+ sentences) with multiple [Page X] and "Direct Quotes" proving you read the text.

VOICE: Plain text only. No markdown.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const CHUNK_SIZE = 35000;
        const chunks = [];
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
            chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
        }

        const scanResults = await Promise.all(chunks.map(async (chunk) => {
            const result = await model.generateContent(`Extract all typos and 12 key dialogue quotes for an 18-point audit: \n\n ${chunk}`);
            return result.response.text();
        }));
        
        const forensicData = scanResults.join("\n");

        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Evidence: ${forensicData} \n\n Full Text: ${scriptText.substring(0, 85000)} \n\n Generate the 18-POINT AUDIT.` }] }]
        });

        const feedback = finalResult.response.text();
        scriptMemory = feedback.substring(0, 1200);
        res.json({ message: feedback });
    } catch (err) {
        res.status(500).json({ message: "Technical glitch, darling." });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: "You are Frank. Answer follow-ups using memory: " + scriptMemory,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
