const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();

// THE BLANK SCREEN KILLER: Direct Middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    // This line specifically tells browsers it is okay to put this in an iframe
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    next();
});

app.use(cors()); 
app.use(express.json({limit: '100mb'})); 

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a sophisticated, flamboyant, and Truman Capote-esque Studio Executive. You are delivering Franks 5 Dollar Feedback.
- VOICE: Witty, theatrical, and personable. 
- PHONETIC: Use "Log-line" and "T.V." 
- NO SYMBOLS: No # or *.
- PROTOCOL: 18 Industry Parameters, authoritative tone, Top 3 Issues, and Final Verdict.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages, darling." });
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += "\n--- SCRIPT: " + file.originalname + " ---\n" + data.text;
        }
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const prompt = "Mode: " + mode + ". Deliver Franks 5 Dollar Feedback. All 18 parameters. No symbols: \n\n " + fullText.substring(0, 100000);
        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, honey." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log("Frank active on " + PORT));
