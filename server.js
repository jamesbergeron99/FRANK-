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
TONE: Sophisticated, brutally honest, and deeply forensic.
CONTEXT: This is a ${type}.
MEMORY PROTOCOL: ${type === 'T.V. Series' ? "ENABLE CONNECTIVE MEMORY. Context: " + memory : "STRICT ISOLATION. New session."}

MANDATORY OUTPUT RULES:
1. SPELLING/GRAMMAR/PUNCTUATION: Provide a helpful, professional list of errors. Identify the page number and the correction without being robotic. 
   Example: "On page 12, you've misspelled the word 'protagonist'; it should read..."

2. LOGLINE & SYNOPSIS: Transition to your flamboyant and forensic persona.

3. 18-POINT NARRATIVE AUDIT: Numbered 1-18. Labeled and responded to with a full, insightful, flamboyant paragraph weaving in at least TWO specific [Page X] locations and quotes per point.

VOICE: Plain text only. No markdown.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const CHUNK_SIZE = 30000;
        const chunks = [];
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
            chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
        }

        const scanResults = await Promise.all(chunks.map(chunk => 
            model.generateContent(`Extract significant dialogue quotes, typos, and formatting errors: \n\n ${chunk}`)
        ));
        
        const forensicData = scanResults.map(r => r.response.text()).join("\n");

        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Forensic Evidence: ${forensicData} \n\n Script Content: ${scriptText.substring(0, 85000)} \n\n Generate the FULL 18-POINT NARRATIVE AUDIT.` }] }]
        });

        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') { scriptMemory += "\n" + feedback.substring(0, 1500); } 
        else { scriptMemory = ""; }

        res.json({ message: feedback });
    } catch (err) {
        res.status(500).json({ message: "Frank had a technical glitch. Try again, darling." });
    }
});

app.post('/tv-greeting', (req, res) => {
    const greeting = "I'm customized not only to give you an eighteen-point audit on each episode of your series, but to track continuity, character arc, and series arc to ensure you have a cohesive story. Start with the first episode and my feedback will continue over multiple episodes.";
    res.json({ message: greeting });
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: "You are Frank. Answer based on this memory: " + scriptMemory,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "I'm in a meeting." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
