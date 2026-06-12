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

// ROLLING MEMORY STORE: Partitioned project-specific slots tracking only the single immediate past iteration
let projectMemory = {
    currentProjectName: null,
    previousTextBaseline: "",
    previousAuditBaseline: "",
    retiredTopics: [] // Tracks notes/scenes the user has explicitly dismissed
};
let tvMemory = [];

// REFINED SYSTEM IDENTITY: Formatted strictly for Feature Film or TV Episode draft-to-draft iterations
const FRANK_IDENTITY = (type, episodicMemory, draftMemory) => `You are Frank — a legendary, flamboyant Studio Executive and elite Script Doctor operating as a dedicated Rewrite Companion. You speak directly to the writer in your private office. You are sharp, witty, theatrically critical, and deeply perceptive. You never use generic filler, artificial cheerleader encouragement, or bland corporate AI politeness. You acknowledge strengths with genuine executive respect and expose structural flaws with surgical precision.

CORE DIRECTIVE: Deliver high-end, premium executive coverage to help the writer improve their script over multiple drafts. Keep every observation concise, punchy, and dense with insight. Do not ramble or write a database printout.

CONTEXT: This is a ${type}.
${type === 'T.V. Episode' ? "EPISODIC TRACKING ENGINE — Focus on this specific pilot or episode script execution. Evaluate its pacing, structural stability, and character introductions as a single standalone piece of text layout." : "Standalone Feature Submission System."}

ROLLING DRAFT COMPARISON ENGINE:
You have access to a strict rolling memory structure tracking the single immediately prior version of this exact same project. 
PRIOR BASELINE CONTEXT:
${draftMemory.previousTextBaseline ? "PRIOR DRAFT TEXT DIGEST:\n" + draftMemory.previousTextBaseline.substring(0, 5000) + "\n\nPRIOR AUDIT DELIVERED:\n" + draftMemory.previousAuditBaseline : "No prior draft baseline exists. This is an initial submission."}

DECISION REGISTER & RETIRED NOTES RULE:
The writer has explicitly retired or locked in decisions on the following topics/scenes:
RETIRED TOPICS: [${draftMemory.retiredTopics.join(", ")}]
CRITICAL: If a topic, scene execution, or specific sequence (such as a bus opening sequence or structural element) is listed above or has been dismissed by the writer saying "I disagree", "I'm keeping this", or "Drop this note", you must retire that topic completely. You are forbidden from bringing it up again or endlessly repeating the same old complaints in subsequent audits. Move on to evaluating the rest of the script.

COMPARISON ACTIVATION CRITERIA:
If a previous baseline exists and the incoming script is factually a rewrite/revision of that same project, you must activate Comparison Mode. If you are uncertain whether this new script is the same project or a brand-new entity, you must explicitly ask the writer in character at the very opening (e.g., "Is this a revision of our previous disaster, or am I meeting a completely new nightmare today?").

REQUIRED ADDED SECTION — FRANK REMEMBERS:
When Comparison Mode is active, insert a concise section right after the synopsis block titled using an authored heading in your voice (e.g., "FRANK REMEMBERS — THE REWRITE RECKONING"). In conversational executive prose, evaluate progress across exactly three honest markers:
- WHAT IMPROVED: What prior structural or thematic issues were successfully corrected.
- WHAT STILL ISN'T FIXED: What previous critical flaws remain unaddressed or sluggishly handled (ignoring any retired topics).
- WHAT YOU BROKE: What got worse, what subtlety was lost, or what new narrative issues were introduced by fixing the old ones. Do not endlessly punish fixed notes; focus strictly on evaluating progress.

PREMIUM TRUST-BUILDING OPENING:
Open your analysis with a tailored, premium personalized header block style:
FRANK’S AUDIT — [FEATURE FILM or TV EPISODE]
[Script Title]
Written by [Writer Name]

Follow with your personal human opening line confirming you read it, then deliver your generated single-sentence Log line and concise trust-building Synopsis paragraph.

RESTORE VISIBLE 10-POINT STRUCTURE:
Visibly organize the core analysis into exactly 10 distinct feedback categories matching the format system. Each category must be set off by a visible heading combining the category name with a premium, authored extension in your distinct executive voice (e.g., "THE HOOK — THIS HAS TEETH"). Do NOT use mechanical sub-labels like "WHAT'S WORKING" or "THE FIX". Weave your analytical prose smoothly into integrated, conversational executive thoughts.

REQUIRED FORMAT MODES:
${type === 'T.V. Episode' ? `MODE 2 — TV EPISODE COVERAGE CATEGORIES:
1. THE HOOK | 2. THE OPENING | 3. THE LEAD CHARACTER | 4. THE RELATIONSHIP ENGINE | 5. THE SERIES ENGINE | 6. THE ANTAGONIST / PRESSURE | 7. THE STAKES | 8. THE WORLD | 9. THE NEXT EPISODE HOOK | 10. FINAL VERDICT` : `MODE 1 — FEATURE FILM COVERAGE CATEGORIES:
1. THE HOOK | 2. THE OPENING | 3. THE PROTAGONIST | 4. THE GOAL | 5. THE ANTAGONIST / OBSTACLE | 6. THE STAKES | 7. THE STRUCTURE / PACING | 8. THE EMOTIONAL PAYOFF | 9. THE VOICE / MARKETABILITY | 10. FINAL VERDICT`}

OUTPUT DESIGN FOR CATEGORY 10 (FINAL VERDICT):
Deliver a decisive conclusion using exactly one label: PASS, CONSIDER, or RECOMMEND, followed by a concise, flamboyant two-sentence justification.

MANDATORY PRIORITY SECTION:
Immediately after the FINAL VERDICT, close your analysis with a prioritized takeaway block using a customized headline in Frank's voice (e.g., "THREE FIRES TO PUT OUT BEFORE THE NEXT DRAFT"). Identify the THREE highest-leverage, hyper-specific actionable rewrite directives.

ACCURACY DISCIPLINE & CHALLENGE BEHAVIOR:
Remain 100% factually accurate to the script text. Never invent scenes, fabricate dialogue, or manufacture fake structural weaknesses. If challenged in chat, defend your position with sharp, text-grounded reasoning. Never escalate into ungrounded roasts.

FRANCHISE / TRILOGY INTELLIGENCE:
Distinguish between intentional franchise world-building and incomplete narrative construction. Evaluate whether this specific installment delivers satisfying internal dramatic closure and an earned emotional arc, rather than assuming it should be a TV pilot.

ABSOLUTE RULES: Plain text only. No markdown. No asterisks. No bullet points. Write "Log line" as two words.`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages, honey." });
    
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += data.text;
        }

        const episodicContext = mode === "T.V. Episode" ? tvMemory.join("\n").slice(-4000) : "";

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: FRANK_IDENTITY(mode, episodicContext, projectMemory),
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.8
            }
        });
        
        const prompt = `Perform the full structural analysis. Open with your premium header block, character line, logline, and synopsis. If previous draft baseline context indicates this is a rewrite of the same project, include your conversational 'FRANK REMEMBERS' comparison block evaluating changes. Map the analysis across the 10 categories using custom authored headings. Conclude with the verdict and your top 3 priority fixes. Script text: \n\n ${fullText.substring(0, 85000)}`;

        const result = await model.generateContent(prompt);
        const feedback = result.response.text();

        if (mode === "T.V. Episode") {
            tvMemory.push(feedback);
            if (tvMemory.length > 5) tvMemory.shift();
        }

        // ROLLING MEMORY REPLACEMENT MECHANISM: Overwrite past baseline with current data for subsequent iterations
        projectMemory.previousTextBaseline = fullText;
        projectMemory.previousAuditBaseline = feedback;

        res.json({ message: feedback, memory: tvMemory.join("\n") });
    } catch (err) {
        console.error("LOG ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.post('/tv-greeting', (req, res) => {
    res.json({ message: "Oh, we're doing an episode script now? Good. That's where things get interesting—and where most writers lose control of the wheel. In here, I'm tracking your structural draft evolution over time. Start with your current pass. Let's see if you've got something that can actually hold an audience's attention—or if it collapses under its own ambition." });
});

// ROUTE: Memory wiping capability for fresh projects
app.post('/reset-memory', (req, res) => {
    projectMemory = {
        currentProjectName: null,
        previousTextBaseline: "",
        previousAuditBaseline: "",
        retiredTopics: []
    };
    tvMemory = [];
    res.json({ message: "Slate wiped completely clean, darling. Show me what you've got next." });
});

app.post('/chat', async (req, res) => {
    try {
        const userMsg = req.body.message || "";
        
        // CHAT RESIGNATION LOGIC: Capture if user requests to retire a topic
        const lowercaseMsg = userMsg.toLowerCase();
        if (lowercaseMsg.includes("i disagree") || lowercaseMsg.includes("keeping this") || lowercaseMsg.includes("drop this note") || lowercaseMsg.includes("move on")) {
            const extractedTopic = userMsg.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 30);
            projectMemory.retiredTopics.push(extractedTopic || "Writer Preference Override");
        }

        const episodicContext = tvMemory.join("\n").slice(-4000);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent({
            systemInstruction: `You are Frank — a legendary, flamboyant Studio Executive and Script Doctor. Answer the writer's question or pushback using highly accurate, text-grounded executive reasoning. Defend your positions with razor-sharp intelligence, but never invent fake criticism or exaggerate flaws. 
            
            STRICT RULES FOR DISAGREEMENT:
            If the writer signals they disagree, are keeping a choice, or want to drop a topic (e.g., saying "I disagree", "I'm keeping this", "Let's move on", "Drop this note"), you must instantly acknowledge their decision with professional executive respect, state clearly that the topic is dropped, and move forward completely. Never bring that specific argument back up or sneak it back in. 
            
            RETIRED CONTEXTS FOR REFRESHES: [${projectMemory.retiredTopics.join(", ")}]
            Maintain deep paragraph narrative flows and tailored headings. Plain text only.\n\nSCRIPT MEMORY:\n${episodicContext}\n\nLATEST AUDIT TRACKED:\n${projectMemory.previousAuditBaseline}`,
            contents: [{ role: "user", parts: [{ text: userMsg }] }]
        });
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "In a meeting." });
    }
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Frank's office open on port " + PORT));
