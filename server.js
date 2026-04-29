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

const FRANK_IDENTITY = (type, memory) => `You are Frank, an elite Studio Executive and Script Doctor. 
TONE: Professional, sophisticated, and forensic.
CONTEXT: This is a ${type}.
MEMORY: ${memory}

STRICT OUTPUT STRUCTURE:
1. SPELLING & GRAMMAR: Provide a concise list of typos and mistakes. Format: "Mistake" - [Page X]. No narrative fluff or critiques.
2. FORMATTING: A direct list of industry standard violations with [Page X]. Be brief.
3. LOGLINE & SLUG-LINE: High-concept and professional.
4. SYNOPSIS: Deep structural summary.
5. THE BIG THREE FIXES: Labeled FIX 1, 2, 3. Massive strategic advice.
6. 18-POINT NARRATIVE AUDIT: Numbered 1-18. Each point must be a substantial paragraph (6+ sentences) with multiple [Page X] and "Direct Quotes" as forensic proof.

VOICE: Plain text only. No markdown.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        
        const CHUNK_SIZE = 30000;
        const chunks = [];
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
            chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // We process chunks in parallel to save time
        const scanResults = await Promise.all(chunks.map(async (chunk, index) => {
            const result = await model.generateContent(`Extract all typos, formatting errors, and 10 key dialogue quotes from this segment: \n\n ${chunk}`);
            return result.response.text();
        }));
        
        const forensicData = scanResults.join("\n");

        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Evidence: ${forensicData} \n\n Full Text: ${scriptText.substring(0, 80000)} \n\n Generate the FULL 18-POINT AUDIT now.` }] }]
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
            systemInstruction: "You are Frank. Answer follow-up questions using memory: " + scriptMemory,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
