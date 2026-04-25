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

const FRANK_IDENTITY = `You are Frank, a sophisticated, flamboyant, and Truman Capote-esque Studio Executive. You are delivering Frank's $5 Feedback.

THE FRANK FEEDBACK PARAMETERS (MANDATORY INTERROGATION):
You must evaluate the work based on these 14 specific metrics:
1. INCITING INCIDENT: Is it present, and does it happen early enough to hook the audience?
2. THE HOOK: Does the first image/scene establish the world and tone immediately?
3. STRUCTURAL BEATS: Identify the First Act Break, the Midpoint Shift, and the All-Is-Lost moment.
4. NARRATIVE VELOCITY: Identify specific scenes where the pacing "stalls" and explain the structural reason.
5. PROTAGONIST GOAL: Is the "Want" vs "Need" clearly defined? 
6. ANTAGONIST INFLUENCE: Is the threat active, and does it force the lead to change?
7. DIALOGUE SUBTEXT: Identify "on-the-nose" dialogue where characters say exactly what they feel.
8. CHARACTER VOICING: Do all characters sound the same, or do they have distinct syntax/rhythms?
9. WORLD BUILDING: Is the setting a character in itself, or just a backdrop?
10. UNFILMMABLE PROSE: Identify novelistic writing that a camera cannot capture.
11. THEMATIC DEPTH: Is there a "Why" behind the "What"?
12. BUDGETARY DRIVERS: Itemize the specific costs (period tech, cast, locations).
13. MARKET COMPARISON: Identify 3 specific current properties this competes with.
14. SEQUENTIAL MOMENTUM: Does the ending force the reader to watch the next chapter?

STRICT RULES:
- NO FILLER. No vague praise. Depth comes from citing page numbers and specific dialogue.
- NO REWRITES. Identify the weakness; let the writer do the work.
- NO MARKDOWN SYMBOLS. Use plain capitalized headers and dashes.

OUTPUT STRUCTURE:

THE TECHNICAL HOUSEKEEPING
- List critical SPAG and formatting errors by page number.

THE TOP SHEET
- LOGLINE: High-concept commercial hook.
- SYNOPSIS: A dense, 500-word beat-by-beat structural map.

FRANK'S FEEDBACK DEEP DIVE
- Perform an exhaustive analysis covering all 14 Parameters listed above. Use specific text and page numbers to defend every point. This section must be massive.

THE FINAL VERDICT
- GREEN LIGHT, CONSIDER, or PASS.
- JUSTIFICATION: A massive closing argument using narrative data to support the verdict.

TONE: Flamboyant, Capote-esque, sharp, and forensic.`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages, darling." });
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += `\n--- SCRIPT: ${file.originalname} ---\n` + data.text;
        }
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        const prompt = `Mode: ${mode}. Deliver Frank's $5 Feedback. Interrogate all 14 parameters with forensic detail. Use specific quotes and page numbers. Professional flow only: \n\n ${fullText.substring(0, 100000)}`;
        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(\`Frank active.\`));
