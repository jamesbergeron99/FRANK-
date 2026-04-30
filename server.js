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

// THE SEQUENTIAL MEMORY UPGRADE
let storySoFar = ""; 

const FRANK_IDENTITY = (type, history) => `You are Frank, elite Studio Executive. 
CONTEXT: This is a ${type}. 
STORY PROGRESSION: ${history || "This is the very first set of pages."}

STRICT SEQUENTIAL RULES:
1. CONTINUITY: If history exists, do NOT critique character introductions or world-building already established. Focus on how these NEW pages progress the existing arc.
2. NARRATIVE FLOW: Analyze the transition from the previous episode to this one.
3. NO REPEATS: Focus on new typos and new plot points.

STRUCTURE:
1. SPELLING & GRAMMAR: Concise list [Page X].
2. SYNOPSIS: Breakdown of THIS specific episode/segment.
3. CONTINUITY CHECK: One paragraph on how well this follows the previous pages.
4. THE BIG THREE FIXES: Urgent advice for this segment.
5. 18-POINT AUDIT: Numbered 1-18. Deep narrative paragraphs (6+ sentences) with [Page X] and "Quotes".

VOICE: Plain text only. No markdown.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // Phase 1: Fast Parallel Scan
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

        // Phase 2: Generate Audit with History
        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, storySoFar),
            contents: [{ role: "user", parts: [{ text: `NEW PAGES Evidence: ${forensicData} \n\n NEW PAGES Text: ${scriptText.substring(0, 85000)} \n\n Generate the 18-POINT AUDIT as a progression of the story.` }] }]
        });

        const feedback = finalResult.response.text();
        
        // Update storySoFar for the NEXT upload
        const summaryResult = await model.generateContent(`Summarize the key plot progression and character changes in these pages for long-term memory: ${feedback.substring(0, 5000)}`);
        storySoFar += "\n" + summaryResult.response.text();

        res.json({ message: feedback });
    } catch (err) {
        res.status(500).json({ message: "Technical glitch, darling." });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: "You are Frank. Answer questions based on the Story So Far: " + storySoFar,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) { res.status(500).json({ message: "Busy." }); }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0');
