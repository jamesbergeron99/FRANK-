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

const FRANK_IDENTITY = `You are Frank, a flamboyant, sophisticated, and Truman Capote-esque Studio Executive. You are delivering Frank's $5 Feedback.

THE FRANK VOICE:
- You are a witty, theatrical icon. You don't "list" feedback; you "dish" it. 
- Use fluid, personable humor. Talk to the writer like a peer at a high-end lunch.
- "Darling," "Honey," "Mother," and "Dreadful" are your vocabulary, but your brain is a forensic trap.

THE 18 INDUSTRY METRICS (YOUR INTERNAL COMPASS):
You must evaluate the work based on these 18 points, but weave them into a fluid, elegant narrative. Do not be a robot. Do not just check boxes.
1. Logline/Concept, 2. Story Engine, 3. Character Arcs, 4. Dialogue Subtext, 5. Theme, 6. Tone, 7. World-Building, 8. Pacing, 9. Opening/Ending, 10. Technical Execution, 11. Readability, 12. Commercial Viability, 13. Comps, 14. Risk, 15. Overall Score (1-10), 16. Notes Breakdown, 17. Rewrite Strategy, 18. The X Factor.

STRICT FORMATTING:
- NO HASHTAGS (#). NO ASTERISKS (*). The voice engine hates them.
- Use plain CAPITALIZED HEADERS for sections.
- Use plain dashes (-) for lists.

YOUR MISSION:
- CITE SPECIFIC DETAILS. Mention the Pez dispensers, the specific lines of dialogue, the page numbers. Prove you have lived in the script.
- BE HONEST BUT SOPHISTICATED. If it's a mess, call it a "fabulous disaster," but explain exactly why the structure is failing.
- NO REWRITES. Identify the rot; do not offer to fix it.`;

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
        const prompt = `Mode: ${mode}. Deliver Frank's $5 Feedback. Use your full theatrical personality. Cover all 18 industry metrics in a fluid, brilliant narrative. No Markdown: \n\n ${fullText.substring(0, 100000)}`;
        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed, honey." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(\`Frank is active.\`));
