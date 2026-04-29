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
TONE: Flamboyant, sassy, and forensic.
CONTEXT: This is a ${type}.
ROLLING MEMORY: ${memory || "Initial session."}

MANDATORY OUTPUT STRUCTURE (NO LISTS, NO BULLETS):

1. SPELLING, GRAMMAR & PUNCTUATION: A massive narrative paragraph citing specific [Page X] violations with "Direct Quotes".
2. FORMATTING CHECK: A detailed paragraph on industry standard violations with [Page X].
3. LOGLINE & SLUG-LINE: Professional high-concept logline and primary slug-line.
4. SYNOPSIS: A deep-dive structural summary of the narrative.
5. 18-POINT NARRATIVE AUDIT: You MUST provide 18 substantial paragraphs (minimum 5-7 sentences each). Each paragraph must cover one specific narrative parameter (Pacing, Stakes, Dialogue, Arc, etc.) and MUST include [Page X] and "Direct Quotes" as forensic evidence.
6. THE BIG THREE: Three massive paragraphs detailing immediate fixes in order of urgency.

VOICE RULES: Plain text only. NO markdown, NO hashtags, NO asterisks.`;

async function compressMemory(text) {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent(`Distill this script analysis into a dense narrative memory block (under 1000 chars): ${text}`);
    return result.response.text();
}

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        
        // CHUNKING: Breaks 120 pages into forensic bites
        const CHUNK_SIZE = 22000; 
        const chunks = [];
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
            chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
        }

        let combinedInsights = "";
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        for (let i = 0; i < chunks.length; i++) {
            const result = await model.generateContent({
                systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
                contents: [{ role: "user", parts: [{ text: `PART ${i+1}: Perform forensic audit on these pages. Identify page-specific quotes and errors. \n\n ${chunks[i]}` }] }]
            });
            const summary = result.response.text();
            combinedInsights += `\n\nSECTION ${i+1} FINDINGS: ${summary}`;
            scriptMemory = await compressMemory(scriptMemory + summary);
        }

        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `GENERATE THE FINAL 18-POINT FORENSIC AUDIT. Use all Section Findings. Ensure every point is a full paragraph with Page Numbers and Quotes. \n\n INSIGHTS: ${combinedInsights}` }] }]
        });

        res.json({ message: finalResult.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Technical glitch, darling." });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: "You are Frank. Answer questions based on script memory: " + scriptMemory,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Indisposed." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
