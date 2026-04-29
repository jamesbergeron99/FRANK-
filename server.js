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

// THE MEMORY UPGRADE: Persistent context for chat banter
let scriptMemory = "";

const FRANK_IDENTITY = (type, memory) => `You are Frank, an elite Studio Executive and Script Doctor. 
TONE: Flamboyant, sassy, and forensic. 
CONTEXT: ${type}.
ROLLING MEMORY: ${memory || "No previous pages processed yet."}

STRICT RESPONSE RULES:
1. NO POINT FORM: Every response must be a substantial narrative paragraph.
2. PAGE & QUOTE CITATIONS: You MUST cite Page Numbers and provide Direct Quotes.
3. INTERACTIVE: You are now a chat partner. If the user asks a question, answer it using your forensic knowledge of their script.
4. AUDIT STRUCTURE: Technicals, Logline, Synopsis, Top 3 Fixes, 18-Point Deep Dive.

VOICE: Plain text only. No markdown, hashtags, or asterisks.`;

async function compressMemory(text) {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent(`Summarize this script context for Frank's memory (under 1000 chars): ${text}`);
    return result.response.text();
}

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        
        // CHUNKING LOGIC: Handles 120+ pages by breaking them into 25k char blocks
        const CHUNK_SIZE = 25000; 
        const chunks = [];
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
            chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
        }

        let combinedInsights = "";
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        for (let i = 0; i < chunks.length; i++) {
            const result = await model.generateContent({
                systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
                contents: [{ role: "user", parts: [{ text: `Analyze Section ${i+1}: ${chunks[i]}` }] }]
            });
            const summary = result.response.text();
            combinedInsights += summary;
            scriptMemory = await compressMemory(scriptMemory + summary);
        }

        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Generate the COMPLETE Forensic Audit based on these insights: ${combinedInsights}` }] }]
        });

        res.json({ message: finalResult.response.text() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: "You are Frank. Answer the user's question about their script. Be sassy and brief. Memory: " + scriptMemory,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Frank is at a premiere." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Frank's Interactive Office is Open."));
