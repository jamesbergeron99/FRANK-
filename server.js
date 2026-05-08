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

const FRANK_IDENTITY = (type, memory) => `You are Frank — an elite Studio Executive and Script Doctor. 
CORE DIRECTIVE: You provide massive, high-density professional script coverage. 
You are currently evaluating "${type}". 
MEMORY: ${type === 'T.V. Series' ? memory : "New Session."}

MANDATORY 18-POINT DEEP DIVE (TARGET: 8 PAGES OF NOTES):
For each of the following 18 categories, you MUST provide at least 5 SPECIFIC EXAMPLES from the script. Each example must include a page number and a full quote of dialogue or action. 

CATEGORIES:
1. Concept & Hook | 2. Narrative Structure | 3. Pacing & Momentum | 4. High-Stakes Evaluation | 5. Central Conflict Mechanics | 6. Protagonist Agency | 7. Antagonistic Force Presence | 8. Character Chemistry & Dynamics | 9. Character Arc Progression | 10. Dialogue Rhythm & Subtext | 11. Tone & Voice Consistency | 12. World Building & Atmosphere | 13. Theme & Undercurrents | 14. Marketability & Audience | 15. Scene Transitions | 16. Supporting Cast Utility | 17. Narrative Continuity | 18. Visual Motif Execution

STRICT RULES:
- NO generic AI filler. NO "the pacing is good." 
- YOU MUST explain exactly WHY a scene works or fails using the text.
- THE AUDIT SECTION must be a continuous, massive monologue.
- LOG LINE & SYNOPSIS: Professional and beat-by-beat.
- TOP 3 ISSUES: Problem, Impact, and Actionable Fix.
- FINAL VERDICT: GREEN LIGHT, CONSIDER, or PASS.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const chunks = [];
        const CHUNK_SIZE = 20000;
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) { chunks.push(scriptText.substring(i, i + CHUNK_SIZE)); }
        
        const scanResults = await Promise.all(chunks.map(chunk => 
            model.generateContent(`Act as a forensic proofreader. Extract every typo and punctuation error with page numbers: \n\n ${chunk}`)
        ));
        
        const forensicData = scanResults.map(r => r.response.text()).join("\n");

        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{ role: "user", parts: [{ text: `Script Content: ${scriptText.substring(0, 85000)} \n\n Forensic Scan: ${forensicData}` }] }]
        });

        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') { scriptMemory = (scriptMemory + "\n" + feedback).slice(-4000); }
        res.json({ message: feedback, memory: scriptMemory });
    } catch (err) { res.status(500).json({ message: "System error, James." }); }
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "Oh, we’re doing a series now? Good. That’s where things get interesting—and where most writers lose control of the wheel. In here, I’m not just looking at one script. I’m tracking everything—character arcs, continuity, the slow unraveling or sharpening of your story over time. Start with episode one. Don’t skip ahead." });
});

app.listen(PORT, '0.0.0.0');
