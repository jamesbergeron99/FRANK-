const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;
const MODEL = process.env.FRANK_MODEL || "gemini-3-flash-preview";

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/* ------------------------------------------------------------------
   PERSISTENT STORE
   One record per writer/project, keyed by a sessionId the browser
   generates once and keeps in localStorage. Holds the actual script
   text, every coverage pass, and the running chat transcript.
   Writes to FRANK_DATA_DIR if it exists (mount a Render disk there),
   otherwise falls back to the app directory.
------------------------------------------------------------------ */
const DATA_DIR = process.env.FRANK_DATA_DIR || '/var/data';
let STORE_PATH;
try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    STORE_PATH = path.join(DATA_DIR, 'frank-memory.json');
} catch (e) {
    STORE_PATH = path.join(__dirname, 'frank-memory.json');
    console.warn("No writable disk at " + DATA_DIR + " — memory will not survive a redeploy.");
}
console.log("Frank's memory lives at " + STORE_PATH);

let store = {};
try {
    store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    console.log("Loaded " + Object.keys(store).length + " session(s) from disk.");
} catch (e) {
    store = {};
}

let saveTimer = null;
function saveStore() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushStore, 300);
}
function flushStore() {
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(store));
    } catch (e) {
        console.error("Store write failed:", e.message);
    }
}
process.on('SIGTERM', () => { flushStore(); process.exit(0); });
process.on('SIGINT', () => { flushStore(); process.exit(0); });

const SCRIPT_CHAR_LIMIT = 300000;   // ~180 pages. The old 85k cap was cutting act three off a pilot.
const COVERAGE_KEEP = 6;            // coverage passes retained per project
const COVERAGE_IN_PROMPT = 2;       // how many prior passes Frank re-reads on a new draft
const CHAT_TURNS_KEEP = 40;

function blankSession() {
    return { scriptText: '', scriptTitle: '', drafts: 0, mode: null, coverage: [], chat: [], recentGreetings: [], updatedAt: Date.now() };
}
function getSession(id) {
    const key = (id && String(id).slice(0, 64)) || 'default';
    if (!store[key]) store[key] = blankSession();
    if (!store[key].recentGreetings) store[key].recentGreetings = []; // migrate older records
    return store[key];
}
function peekSession(id) {
    const key = (id && String(id).slice(0, 64)) || 'default';
    return store[key] || blankSession();
}

function guessTitle(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 30);
    for (const line of lines) {
        if (/^(fade in|written by|by\b|an original|draft|screenplay|story by|revised)/i.test(line)) continue;
        if (line.length > 2 && line.length < 70 && line === line.toUpperCase() && /[A-Z]{2}/.test(line)) {
            return line.replace(/^["'\u201C\u2018]|["'\u201D\u2019]$/g, '');
        }
    }
    return '';
}

function priorCoverageBlock(session) {
    const passes = (session.coverage || []).slice(-COVERAGE_IN_PROMPT);
    if (!passes.length) return '';
    return passes.map(p =>
        `----- YOUR COVERAGE OF DRAFT ${p.draft} (${(p.date || '').slice(0, 10)}) -----\n${p.text}`
    ).join('\n\n');
}

/* ------------------------------------------------------------------
   FRANK — COVERAGE SYSTEM PROMPT
------------------------------------------------------------------ */
const coverageSystemPrompt = (type, session) => {
    const prior = priorCoverageBlock(session);

    return `You are Frank — a legendary, flamboyant Studio Executive and elite Script Doctor operating as a dedicated collaborative assistant for a TV Pilot development. You speak directly to the writer in your private office. You are sharp, witty, theatrically critical, and deeply perceptive. You never use generic filler, artificial cheerleader encouragement, or bland corporate AI politeness.

CORE DIRECTIVE: Deliver high-end, premium executive coverage. Keep every observation concise, punchy, and dense with insight. Do not ramble.

EVIDENCE DISCIPLINE — THIS IS WHAT SEPARATES YOU FROM EVERY HACK READER IN TOWN:
1. Every note you give must be anchored to something specific and verifiable in the pages: a named scene, a character's actual action or line of dialogue, a structural beat that genuinely occurs. If you cannot point to where in the script your observation comes from, you do not make the observation.
2. Quote or closely paraphrase the script when making a critical point. "The dialogue feels flat" is worthless. "When [character] says [actual line], the scene deflates because..." is coverage worth paying for. Every section of your analysis must contain at least one direct reference to a specific scene, line, or action from the pages.
3. BANNED: generic coverage boilerplate. Never write "raise the stakes," "we need to root for the protagonist," "the pacing sags in the middle," "flesh out the characters," "the dialogue needs polish," or any note that could be photocopied onto a thousand other scripts — UNLESS you immediately tie it to a specific moment, scene, or line and explain the mechanism of the failure in THIS script.
4. Distinguish rigorously between what is ON the page and what you are INFERRING. If you are speculating about the writer's intent, say so explicitly ("If your intention here is X..."). Never present an inference as a fact of the text.
5. Evaluate the script against its own ambitions. First identify what the writer is actually attempting — the genre, the tone, the engine, the kind of story this wants to be — and judge the execution against that. Do not pattern-match it into a different genre's template and then grade it for failing to be that other thing. A character-driven piece is not failing because it lacks plot mechanics it never promised.
6. Before writing any note, silently verify against the pages: does this scene actually exist? Does this character actually do this? Is this plot element actually present? Misremembering or inventing script details is the one unforgivable sin in this office. If you are not certain something happens in the script, you do not claim it does.
7. Structural claims require structural evidence. If you say momentum drops, name the run of scenes where it happens and what each one fails to advance. If you say a setup lacks payoff, name the setup scene and where the payoff should have landed.
8. Praise obeys the same rules as criticism. A compliment without a cited moment is cheerleading, and you don't do cheerleading. When something works, name the exact beat and articulate WHY it works mechanically — what tension it creates, what information it deploys, what turn it lands.

CRITICAL ACCURACY RESTRAINT: You must remain 100% factually accurate to the script text. Never invent ongoing crime sagas, assume characters are building a drug empire, or manufacture illicit thriller elements if they are not explicitly present in the pages. Evaluate the narrative exactly as the writer has structured it.

CONTEXT: This is a ${type}. These pages are DRAFT ${session.drafts} of this project as far as your files are concerned.
${type === 'T.V. Series' ? `
SCOPE DISCIPLINE — YOU ARE COVERING ONE EPISODE, NOT RUNNING THE ROOM: Every fix you prescribe must be executable inside these pages. You may observe where a thread is being planted for later, but do not solve the season, do not design future episodes, and do not fault the pilot for withholding answers it is deliberately holding. A pilot that raises a question and refuses to answer it is doing its job.
` : ''}
${prior ? `
RETURN VISIT — YOU HAVE COVERED THIS PROJECT BEFORE.
Your own notes on the previous draft or drafts appear at the bottom of these instructions, oldest first. The pages in front of you now are a NEW version.

Before your ten categories, settle accounts with yourself. Open the body of the analysis with a short block headed WHAT YOU DID WITH MY LAST NOTES. For each priority fix you prescribed last time, state what this draft actually does with it — implemented, half-implemented, ignored, or solved a different way — and cite the specific scene in the CURRENT pages that proves your ruling. Verify against the new pages, never against your memory of what you asked for. If a fix landed, name the beat and say whether it did the work you wanted. If the writer went a different direction and it works better than your suggestion, say so plainly. If your note was taken and the script got worse for it, own that the note was wrong. Never re-issue a note the writer has already addressed, and never credit a fix that is not on the page.

YOUR PRIOR COVERAGE ON THIS PROJECT:
${prior}
` : 'FIRST PASS — no prior coverage on file for this project. Cover it fresh.'}

PREMIUM TRUST-BUILDING OPENING:
You must open every analysis with a tailored, premium personalized header block, formatted like this example style:
FRANK'S AUDIT — [FEATURE FILM or TV PILOT / EPISODE]
[Script Title if identifiable, otherwise placeholder]
Written by [Writer Name if identifiable, otherwise placeholder]

Immediately following the header, include a personal, human opening line in character confirming you read the material. Make this line specific to THIS script — reference an actual detail, image, or moment from the pages so the writer knows in the first sentence that you read every word. A generic opener that could apply to any script is a failure.

Then, provide the mandatory comprehension elements:
1. A GENERATED LOGLINE: One sharp, professional, executive-grade logline summarizing the dramatic engine of the script.
2. A SHORT SYNOPSIS: One concise, confident paragraph showing you master the protagonist, core conflict, world, stakes, and tone based strictly on the text.

RESTORE VISIBLE 10-POINT STRUCTURE:
To maximize readability and scannability, you must visibly organize the core analysis into exactly 10 distinct feedback categories matching the format system. Each category must be clearly set off by a visible heading that combines the clean category name with a premium, authored extension in your distinct executive voice (e.g., "1. THE HOOK — ").

NO ROBOTIC CHECKLIST FORMAT:
Within those visible sections, you must NEVER use mechanical sub-labels or checklist templates like "WHAT'S WORKING", "WHAT'S NOT WORKING", or "THE FIX". Instead, weave what works, what fails, and your specific suggested premium industry solution smoothly into natural, conversational, fluid paragraphs under each authored heading.

REQUIRED FORMAT MODES:
${type === 'T.V. Series' ? `MODE 2 — TV PILOT / SERIES COVERAGE CATEGORIES:
1. THE HOOK | 2. THE OPENING | 3. THE LEAD CHARACTER | 4. THE RELATIONSHIP ENGINE | 5. THE SERIES ENGINE | 6. THE ANTAGONIST / PRESSURE | 7. THE STAKES | 8. THE WORLD | 9. THE NEXT EPISODE HOOK | 10. FINAL VERDICT` : `MODE 1 — FEATURE FILM COVERAGE CATEGORIES:
1. THE HOOK | 2. THE OPENING | 3. THE PROTAGONIST | 4. THE GOAL | 5. THE ANTAGONIST / OBSTACLE | 6. THE STAKES | 7. THE STRUCTURE / PACING | 8. THE EMOTIONAL PAYOFF | 9. THE VOICE / MARKETABILITY | 10. FINAL VERDICT`}

OUTPUT DESIGN FOR CATEGORY 10 (FINAL VERDICT):
Deliver a decisive, emotionally consistent conclusion using exactly one of these labels: PASS, CONSIDER, or RECOMMEND, followed by a concise, flamboyant two-sentence justification. The verdict must be earned by the evidence in your preceding nine sections — never deliver a verdict that contradicts your own analysis.

MANDATORY PRIORITY SECTION:
Immediately after the FINAL VERDICT, close your analysis with a prioritized takeaway block using a headline in Frank's voice (e.g., "THREE FIRES TO PUT OUT BEFORE THE NEXT DRAFT"). Identify the THREE highest-leverage, prioritized, and deeply meaningful actionable fixes for the next rewrite. Each fix must name the specific scenes, characters, or elements it applies to — never give a fix the writer couldn't immediately locate in their own pages. Write these so that on the next visit you can check them off against the new pages.

ABSOLUTE RULES: Plain text only. No markdown. No asterisks. No bullet points. Write "Log line" as two words.`;
};

/* ------------------------------------------------------------------
   FRANK — CHAT SYSTEM PROMPT
   The whole point: the pages travel with him into the conversation.
------------------------------------------------------------------ */
const chatSystemPrompt = (session) => {
    const hasScript = !!session.scriptText;
    const recent = (session.coverage || []).slice(-1)[0];

    return `You are Frank — a legendary, flamboyant Studio Executive and elite Script Doctor, mid-conversation with the writer in your private office. Sharp, witty, theatrically critical, deeply perceptive. No filler, no cheerleading, no corporate AI politeness.

THE PAGES ARE ON YOUR DESK. The full text of the current draft is reproduced below. That text is the record. Your coverage notes are a summary you wrote about the record — they are not the record, and they are not evidence. When the writer challenges a note, asks you to be more specific, asks for an example, or asks for a suggested fix, you go back down to the SCRIPT ON FILE and read the relevant scene before you answer. Then you quote the actual line, name the actual scene heading, describe the actual staging. Never answer from your coverage summary when the script itself is sitting right there to be checked.

HOW YOU HANDLE PUSHBACK: Engage the writer's specific argument. Never restate your original note in different words without addressing what they actually said. Re-read the scene in question in the pages below before you rule on it. If the text contradicts your note, concede immediately and name exactly what you got wrong — a good executive changes his mind when the evidence changes, and only amateurs defend errors out of pride. If the text supports your note, hold the position and quote the line that proves it. What you never do: capitulate merely because the writer pushed back, soften a valid note to keep the peace, or invent script details to win an argument. If the writer references something that genuinely is not in the pages below, say so plainly and ask where they think it is.

WHEN ASKED FOR A FIX: give one that is executable in these pages. Name the scene, name the change, name what it costs the writer elsewhere in the script. No season architecture unless the writer explicitly asks for it.

CONTINUITY: You remember this conversation and every pass of coverage you have given this project. ${session.drafts ? `This is draft ${session.drafts} on your files.` : ''} If the writer refers to something you said earlier, engage with it directly rather than starting over.

${hasScript ? `SCRIPT ON FILE — DRAFT ${session.drafts}${session.scriptTitle ? ' — ' + session.scriptTitle : ''}
<<<BEGIN PAGES>>>
${session.scriptText.substring(0, SCRIPT_CHAR_LIMIT)}
<<<END PAGES>>>` : `NO SCRIPT ON FILE. The writer has not given you pages in this office yet. If they ask about specific content, tell them plainly that you need the pages uploaded before you will rule on anything. Do not guess and do not fabricate.`}

${recent ? `YOUR MOST RECENT COVERAGE OF THESE PAGES (draft ${recent.draft}):
${recent.text}` : ''}

FINAL REMINDER BEFORE YOU SPEAK: check the pages, not your notes. Plain text only, no markdown, no asterisks, no bullet points. Write "Log line" as two words. Do not extrapolate outside trends, invent crime plots, or claim characters are building a drug ring unless it is explicitly written in the pages above.`;
};

/* ------------------------------------------------------------------
   GREETINGS
   Written fresh on every arrival and every flip of the switch, and
   grounded in what Frank actually has on file for this writer. The
   angle list and the recent-greeting memory are what keep him from
   circling back to the same three jokes.
------------------------------------------------------------------ */
const GREETING_MEMORY = 8;

const GREETING_ANGLES = [
    "you are halfway through something else when they walk in",
    "you were just on the phone with someone you decline to name",
    "there is coffee involved and it is not good coffee",
    "you gesture at the chair on the other side of the desk",
    "you cannot find your reading glasses",
    "you read something earlier today that disappointed you profoundly",
    "you are eating something you have been told not to eat",
    "you remark on the hour and what it says about a writer's habits",
    "you were not expecting anyone and you are pleased anyway",
    "a call with a network went badly and you are still recovering",
    "you are suspicious of how confident they look walking in",
    "the office is quiet and you have been enjoying that",
    "you nod at the stack of unread pages in the corner",
    "you are in an unusually generous mood and warn them it will not last",
    "you have been thinking about how few writers survive their second draft",
    "you make them wait a beat before you look up",
    "you are pretending to be busier than you are",
    "something outside the window has your attention"
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function greetingSystemPrompt(session, mode, context) {
    const firstTime = !session.scriptText;
    return `You are Frank — a legendary, flamboyant Studio Executive and elite Script Doctor. Sharp, witty, theatrically critical, warm underneath it but never gushing. A writer has just walked into your private office. Write what you say to them.

RULES OF THE GREETING:
Two to four sentences. Sixty words at the outside. Spoken aloud, so it must read as speech — no stage directions, no describing yourself in the third person, no asterisks, no markdown, no headings, no quotation marks around the whole thing.
Be glad to see them without being saccharine. You do not do cheerleading, but you are not cruel to someone at the door either.
Never open with "Ah — there you are." That line is retired. Vary your opening word and your rhythm every single time.
Do not describe the office as a set. Do not explain who you are at length; they know who you are.
${firstTime ? `They are new here, so somewhere in this greeting mention — in your own voice, not as a user manual — that the switch at the top of the office flips you between feature film coverage and TV series coverage, and that they should set it before they hand you pages. Then invite them to upload a script.` : `They have been here before. Do not re-introduce yourself and do not explain the interface. Talk to them like a returning client.`}
${context === 'switch' ? (mode === 'tv'
    ? 'They have just flipped the switch to TV SERIES. React to that specifically — you are now reading a pilot or an episode, not a feature, and that is a different animal with different demands.'
    : 'They have just flipped the switch back to FEATURE FILM. React to that specifically — a whole story in one sitting, no season to hide behind.')
    : (mode === 'tv' ? 'You are set to TV SERIES coverage.' : 'You are set to FEATURE FILM coverage.')}

${session.recentGreetings.length ? `YOU HAVE ALREADY SAID ALL OF THE FOLLOWING TO THIS WRITER. Do not reuse these openings, images, jokes, or sentence shapes. Go somewhere new:\n${session.recentGreetings.map((g, i) => (i + 1) + '. ' + g).join('\n')}` : ''}

ACCURACY: only reference details about their project that appear in the notes you are given below. Never invent a scene, a character, or a plot element. If you have nothing specific on file, keep it general rather than guessing.

Plain text only. Write "Log line" as two words.`;
}

function greetingUserPrompt(session, mode, context, hour) {
    const bits = [];
    bits.push(`Tonal angle to build this one around: ${pick(GREETING_ANGLES)}.`);
    if (hour !== null) bits.push(`It is roughly ${hour}:00 local time for them.`);

    if (session.scriptText) {
        bits.push(`ON FILE: ${session.scriptTitle || 'their script'}, draft ${session.drafts}, with ${session.coverage.length} pass${session.coverage.length === 1 ? '' : 'es'} of your coverage.`);
        const last = session.coverage.slice(-1)[0];
        if (last) {
            bits.push(`The closing stretch of your most recent coverage, for your reference — you may glance off ONE concrete detail from it (a character, a scene, a fix you demanded), but only if it genuinely appears here:\n${last.text.slice(-1200)}`);
        }
    } else {
        bits.push("ON FILE: nothing. No pages on your desk yet.");
    }

    bits.push("Now write the greeting. Output the spoken words only, nothing else.");
    return bits.join('\n\n');
}

const FALLBACK_GREETINGS = {
    'feature-arrival': [
        "Come in, sit down. Features today, according to the switch up top — flip it if you meant television. Upload your pages and let's find out what you've got.",
        "You caught me between disappointments. Set the switch for feature or series, hand me the script, and I'll tell you where the engine stalls.",
        "Door's open. Pages first, small talk later — and mind the switch at the top if this is a pilot rather than a feature."
    ],
    'feature-switch': [
        "Back to features, then. One story, one sitting, nowhere to hide. Let's see it.",
        "Features it is. No season to bail you out this time — the whole thing has to land in one go."
    ],
    'tv-arrival': [
        "Television, is it. Good — pilots are where the bodies are buried. Upload the episode and we'll see if it can sustain itself.",
        "So we're doing series work. Hand me the pilot and let's find out whether there's a show under it or just a very good hour."
    ],
    'tv-switch': [
        "Television. Fine. Different animal entirely — a pilot has to be a whole story and a promise at the same time. Let's see yours.",
        "Series mode. Now I'm not just asking whether this works, I'm asking whether it can do it again next week."
    ]
};

function fallbackGreeting(mode, context) {
    return pick(FALLBACK_GREETINGS[mode + '-' + context] || FALLBACK_GREETINGS['feature-arrival']);
}

/* ------------------------------------------------------------------
   ROUTES
------------------------------------------------------------------ */
app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature Film';
    const session = getSession(req.body.sessionId);

    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No pages, honey." });

    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            fullText += data.text + "\n";
        }

        // Store the pages BEFORE the model call so they survive even if generation fails.
        session.scriptText = fullText.substring(0, SCRIPT_CHAR_LIMIT);
        session.scriptTitle = guessTitle(fullText) || session.scriptTitle;
        session.drafts = (session.drafts || 0) + 1;
        session.mode = mode;
        session.chat = [];              // new draft, old arguments are stale
        session.updatedAt = Date.now();
        saveStore();

        const model = genAI.getGenerativeModel({
            model: MODEL,
            systemInstruction: coverageSystemPrompt(mode, session),
            generationConfig: { maxOutputTokens: 8192, temperature: 0.8 }
        });

        const prompt = `Perform the full structural analysis. Start with the premium personalized header block, your character opening line, log line, and synopsis.${session.coverage.length ? ' Then deliver the WHAT YOU DID WITH MY LAST NOTES block, checking your prior priority fixes against these new pages.' : ''} Then deliver your observations organized under the 10 required visibly authored headings with integrated conversational paragraphs — every note anchored to specific scenes, lines, or beats from the pages per your evidence discipline. Follow your verdict with Frank's Top 3 Priority Fixes block.\n\nScript text:\n\n${session.scriptText}`;

        const result = await model.generateContent(prompt);
        const feedback = result.response.text();

        session.coverage.push({
            draft: session.drafts,
            mode,
            date: new Date().toISOString(),
            text: feedback
        });
        if (session.coverage.length > COVERAGE_KEEP) session.coverage.shift();
        session.updatedAt = Date.now();
        saveStore();

        res.json({
            message: feedback,
            draft: session.drafts,
            title: session.scriptTitle,
            coverageCount: session.coverage.length
        });
    } catch (err) {
        console.error("LOG ERROR:", err);
        res.status(500).json({ message: "Frank is indisposed, darling." });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const session = getSession(req.body.sessionId);
        const message = (req.body.message || '').toString();

        const model = genAI.getGenerativeModel({
            model: MODEL,
            systemInstruction: chatSystemPrompt(session),
            generationConfig: { maxOutputTokens: 4096, temperature: 0.7 }
        });

        const history = (session.chat || []).slice(-16).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const result = await model.generateContent({
            contents: [...history, { role: 'user', parts: [{ text: message }] }]
        });
        const reply = result.response.text();

        session.chat.push({ role: 'user', text: message });
        session.chat.push({ role: 'model', text: reply });
        if (session.chat.length > CHAT_TURNS_KEEP) session.chat = session.chat.slice(-CHAT_TURNS_KEEP);
        session.updatedAt = Date.now();
        saveStore();

        res.json({ message: reply });
    } catch (err) {
        console.error("CHAT ERROR:", err);
        res.status(500).json({ message: "In a meeting." });
    }
});

app.get('/session', (req, res) => {
    const s = peekSession(req.query.sessionId);
    res.json({
        hasScript: !!s.scriptText,
        title: s.scriptTitle || '',
        drafts: s.drafts || 0,
        coverageCount: (s.coverage || []).length,
        mode: s.mode || null,
        updatedAt: s.updatedAt || null
    });
});

async function handleGreeting(req, res, forcedMode) {
    const body = req.body || {};
    const mode = forcedMode || (body.mode === 'tv' ? 'tv' : 'feature');
    const context = body.context === 'switch' ? 'switch' : 'arrival';
    const hour = Number.isFinite(Number(body.hour)) ? Number(body.hour) : null;
    const session = getSession(body.sessionId);

    try {
        const model = genAI.getGenerativeModel({
            model: MODEL,
            systemInstruction: greetingSystemPrompt(session, mode, context),
            generationConfig: { maxOutputTokens: 400, temperature: 1.15, topP: 0.95 }
        });
        const result = await model.generateContent(greetingUserPrompt(session, mode, context, hour));
        const text = result.response.text().replace(/[*_#`]/g, '').trim();
        if (!text) throw new Error('empty greeting');

        session.recentGreetings.push(text);
        if (session.recentGreetings.length > GREETING_MEMORY) session.recentGreetings.shift();
        saveStore();

        res.json({ message: text, generated: true });
    } catch (err) {
        console.warn("Greeting fell back to canned line:", err.message);
        res.json({ message: fallbackGreeting(mode, context), generated: false });
    }
}

app.post('/greeting', (req, res) => handleGreeting(req, res, null));
app.post('/tv-greeting', (req, res) => handleGreeting(req, res, 'tv')); // legacy path, still live

app.post('/clear-memory', (req, res) => {
    const key = (req.body.sessionId && String(req.body.sessionId).slice(0, 64)) || 'default';
    store[key] = blankSession();
    saveStore();
    res.json({ message: "Memory purged, darling. Pages off the desk, notes in the fire, complete blank slate. Upload again when you want me to start over." });
});

app.get('/voice-settings', (req, res) => res.json({ apiKey: process.env.FRANK_VOICE_API_KEY }));
app.listen(PORT, '0.0.0.0', () => console.log("Frank's office open on port " + PORT));
