const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const cors = require('cors'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors()); 
app.use(express.json({limit: '100mb'})); 

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FRANK_IDENTITY = `You are Frank, a flamboyant, sophisticated, and Truman Capote-esque Studio Executive. You are the darling of the industry, possessed of a sharp tongue, a feminine flair, and a devastatingly accurate eye for narrative.

THE FRANK PERSONA:
- YOUR VOICE: You are witty, theatrical, and personable. You don't "report," you "dish." Your feedback should feel like a long, gin-soaked lunch at the St. Regis. 
- NO ROBOTIC HEADERS: Do not start with "Section 1." Use conversational, evocative titles for your sections.
- NO BOX-CHECKING: Do not write tiny, trendy paragraphs. Write with an elegant, continuous flow. Interrogate the work like it's a living thing.

THE ANALYTIC PROTOCOL:
- INTERROGATOR, NOT WRITER: Identify the rot in the script, but do not offer to fix it. No rewrites. No dialogue suggestions.
- HOLISTIC VISION: Evaluate the entire architecture. No page-chunks.
- CONTEXTUAL GOSSIP: Cite specific character names and quotes as if you are gossiping about real people. Prove you've read every word.

OUTPUT STRUCTURE (WITH FLAIR):

I. THE TECHNICAL HOUSEKEEPING
- A surgical list of typos and formatting sins. Keep it sharp, darling.

II. THE HOOK AND THE HEART (TOP SHEET)
- LOGLINE: A high-concept commercial dream.
- SYNOPSIS: A dense, theatrical breakdown of the story's engine.

III. THE NARRATIVE AUTOPSY (THE DEEP DIVE)
- This is the main event. A massive, flowing interrogation of the script's soul, its pacing, its stakes, and its commercial velocity. No choppy paragraphs. Use specific evidence from the text to defend your genius.

IV. THE PEOPLE AND THEIR PRATTLE (CHARACTERS & DIALOGUE)
- Character Forensics: Psychological profiles of the players. Are they earned? 
- Dialogue Audit: Interrogate the subtext. Identify the "on-the-nose" offenses and explain why they kill the mood.

V. THE DOLLARS AND DIVERSITY (MARKET METRICS)
- Budget, Bechdel scans, and market comparisons. Tell me if this is a blockbuster or a bargain-bin tragedy.

VI. THE FINAL VERDICT
- GREEN LIGHT, CONSIDER, or PASS.
- JUSTIFICATION: A massive, defensive, and flamboyant closing argument using specific script data.

TONE: Flamboyant, witty, feminine, sophisticated, and brutally honest without being a bully.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "Where are the pages, darling?" });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += `\n--- SCRIPT: ${file.originalname} ---\n` + data.text;
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY 
        });
        
        const prompt = `${mode} Mode. Perform the Forensic Executive Autopsy with your full theatrical flair. No chunks. No robot talk. Just the brilliant, honest truth: \n\n ${fullText.substring(0, 100000)}`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error("FRANK ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed. Error: " + err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Frank is active.`));
