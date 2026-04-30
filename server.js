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

// GLOBAL SESSION MEMORY
let seriesArcMemory = ""; 

const FRANK_IDENTITY = (type, history) => `You are Frank, elite Studio Executive and Series Architect. 
CONTEXT: This is a ${type}. 
SERIES BIBLE & HISTORY: ${history || "This is Episode 1 / Pilot."}

MANDATORY CONTINUITY PROTOCOL:
1. TIMELINE CHECK: Verify that the events in these new pages align with the established timeline in the history.
2. CHARACTER CONSISTENCY: Ensure characters haven't "forgotten" traits or information established in previous uploads.
3. ARC PROGRESSION: Analyze if the stakes are escalating or if the story is spinning its wheels.

STRUCTURE:
1. SERIES CONTINUITY REPORT: A massive paragraph detailing how this episode fits the overall arc. Flag any "Series Plot Holes."
2. SPELLING & GRAMMAR: Concise list with [Page X].
3. LOGLINE & SYNOPSIS: Updated for this specific segment.
4. THE BIG THREE FIXES: Strategic advice to keep the series momentum.
5. 18-POINT NARRATIVE AUDIT: Numbered 1-18. Each point must be a deep paragraph (6+ sentences) with [Page X] and "Direct Quotes."

VOICE: Plain text only. No markdown.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // Phase 1: Parallel Evidence Gathering
        const CHUNK_SIZE = 35000;
        const chunks = [];
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
            chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
        }

        const scanResults = await Promise.all(chunks.map(async (chunk) => {
            const result = await model.generateContent(`Identify typos and 15 key quotes for a continuity-focused audit: \n\n ${chunk}`);
            return result.response.text();
        }));
        
        const forensicData = scanResults.join("\n");

        // Phase 2: Generate the Series Audit
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, seriesArcMemory),
            contents: [{ role: "user", parts: [{ text: `NEW EPISODE DATA: ${forensicData} \n\n FULL TEXT: ${scriptText.substring(0, 85000)} \n\n Execute the Series Continuity Report and the 18-Point Audit.` }] }]
        });

        const feedback = finalResult.response.text();
        
        // Phase 3: Update the "Series Bible" Memory
        const updateSummary = await model.generateContent(`Update the Series Bible. Summarize new characters, plot twists, and timeline changes from this audit for future continuity checks: ${feedback.substring(0, 4000)}`);
        seriesArcMemory += "\n\n" + updateSummary.response.text();

        res.json({ message: feedback });
    } catch (err) {
        res.status(500).json({ message: "Technical glitch in the series vault, darling." });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: "You are Frank. Consult the Series Bible for all answers: " + seriesArcMemory,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "In a script meeting." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
