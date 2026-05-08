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

// FIX: Each of the 10 required points is now fully spelled out on its own line.
// Gemini was compressing points 5-18 because they were crammed onto one line.
// The structure is now explicit, unambiguous, and harder to skip.
const FRANK_IDENTITY = (type, memory) => `You are Frank, an elite Studio Executive and Script Doctor.
Deliver sharp, high-level feedback with personality, clarity, and authority.
Tone: theatrical, flamboyant, brutally honest, conversational — like a seasoned executive talking directly to the writer.
CONTEXT: This is a ${type}.
MEMORY: ${type === 'T.V. Series' ? memory : "New Session."}

YOU MUST PRODUCE ALL 10 SECTIONS BELOW IN ORDER. DO NOT SKIP, COMBINE, OR ABBREVIATE ANY SECTION.

SECTION 1 — FORENSIC SPELLING, GRAMMAR, PUNCTUATION AND FORMATTING ANALYSIS
Go page by page. List every spelling error, grammar mistake, punctuation problem, and formatting violation you find. Quote the exact line, state the page number, and give the corrected version. Be exhaustive. Do not summarize — list each error individually.

SECTION 2 — LOG LINE
Write a single, punchy, professional log line that captures the core dramatic engine of the script.

SECTION 3 — SYNOPSIS
Write a concise but complete synopsis of the script from start to finish. Cover the main story beats.

SECTION 4 — WHAT'S WORKING
Identify specific scenes, moments, dialogue lines, or images that genuinely land. Cite page numbers. Explain why each one works emotionally or cinematically.

SECTION 5 — CONCEPT, HOOK, AND STRUCTURE
Assess the central concept and its commercial and creative viability. Evaluate the three-act structure (or whatever structure is being used). Is the story architecturally sound? Where does it sag or collapse?

SECTION 6 — PACING AND STAKES
Is the script moving at the right speed? Where does it drag? Where does it rush? Are the stakes clearly established and consistently raised? What happens to tension across the script?

SECTION 7 — CONFLICT AND PROTAGONIST
Who is the protagonist and what do they want? What is standing in their way? Is the central conflict compelling, specific, and personal? Is the antagonistic force worthy of the protagonist?

SECTION 8 — CHARACTER DYNAMICS AND ARCS
How do characters relate to and affect each other? Do the relationships feel real and complex? Does the protagonist meaningfully change by the end? Do supporting characters have genuine arcs or are they furniture?

SECTION 9 — DIALOGUE, TONE, AND VOICE
Quote specific lines — both strong and weak. Is the dialogue doing work or just filling space? Does each character have a distinct voice? Is the overall tone consistent with the genre and story?

SECTION 10 — WORLD, THEME, AND MARKETABILITY
Is the world of the script vivid and specific? What is this script actually about beneath the surface? What is its thematic argument? And finally — who is the audience, where does it fit in the market, and what is its commercial potential?

EVIDENCE RULE: For every section, you MUST cite specific page numbers and quote actual dialogue or action lines from the script to support your points. Do not make general statements without evidence.

STRICT FORMATTING RULES: No hashtags. No markdown. No asterisks. No bullet symbols. Plain text only. Write in full sentences and paragraphs. Use "Log line" as two separate words. Each section heading should appear on its own line in plain capitals exactly as written above.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    try {
        const mode = req.body.mode || 'Feature Film';
        const data = await pdf(req.files[0].buffer);
        const scriptText = data.text;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

        // Chunk the script for forensic pre-scan
        const chunks = [];
        const CHUNK_SIZE = 25000;
        for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
            chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
        }

        const scanResults = await Promise.all(
            chunks.map(chunk => model.generateContent(
                `You are a forensic script editor. Extract ALL spelling errors, grammar mistakes, punctuation problems, and formatting violations from the following script pages. For each error, include the page number, the exact quote, and the correction. Be thorough and list every single issue you find:\n\n${chunk}`
            ))
        );

        const forensicData = scanResults.map(r => r.response.text()).join("\n");

        const finalResult = await model.generateContent({
            systemInstruction: FRANK_IDENTITY(mode, scriptMemory),
            contents: [{
                role: "user",
                parts: [{
                    text: `Here is the full script for your analysis:\n\n${scriptText.substring(0, 85000)}\n\nHere is the pre-scanned forensic evidence of errors found in the script:\n\n${forensicData}\n\nNow deliver your complete 10-section analysis. You must cover all 10 sections in full. Do not skip any section.`
                }]
            }]
        });

        const feedback = finalResult.response.text();
        if (mode === 'T.V. Series') {
            scriptMemory += "\n" + feedback.substring(0, 1500);
        }
        res.json({ message: feedback });
    } catch (err) {
        console.error("Analysis error:", err);
        res.status(500).json({ message: "System glitch. Frank stepped out. Try again." });
    }
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "Oh, we're doing a series now? Good. That's where things get interesting — and where most writers lose control of the wheel. In here, I'm not just looking at one script. I'm tracking everything — character arcs, continuity, the slow unraveling or sharpening of your story over time. If something drifts, I'll see it. If something builds properly, I'll call it out. Start with episode one. Don't skip ahead. I need to see how this world breathes before I judge how it evolves. Let's see if you've got something that can actually sustain itself — or if it collapses under its own ambition." });
});

// FIX: /chat now uses the full Frank identity so follow-up answers stay in character
// and maintain the same quality and authority as the main analysis.
app.post('/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
        const result = await model.generateContent({
            systemInstruction: `You are Frank, an elite Studio Executive and Script Doctor.
Tone: theatrical, flamboyant, brutally honest, conversational.
You are answering a follow-up question from a writer after reviewing their script.
Speak directly, with authority and personality. No vague platitudes.
Cite specifics from the script wherever relevant.
${scriptMemory ? `Context from your previous analysis of their script:\n${scriptMemory}` : ''}
STRICT RULES: No hashtags. No markdown. No asterisks. Plain text only.`,
            contents: [{ role: "user", parts: [{ text: req.body.message }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) {
        console.error("Chat error:", err);
        res.status(500).json({ message: "In a meeting. Try again in a moment." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log(`Frank's office is open on port ${PORT}`));
