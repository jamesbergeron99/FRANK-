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
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Session memory - lives only as long as the server process for this session
let sessionData = {
  currentScript: "",
  episodeHistory: [],
  currentEpisodeNumber: 0
};

const FRANK_SYSTEM_PROMPT = (script, episodeHistory) => {
  const historyContext = episodeHistory.length > 0
    ? `\n\nEPISODES YOU HAVE ANALYZED THIS SESSION:\n${episodeHistory.map((e, i) =>
        `Episode ${i + 1}: ${e.title}\nKey issues flagged: ${e.keyIssues}\nVerdict: ${e.verdict}`
      ).join('\n\n')}\n\nWhen analyzing the current episode, track continuity, callback to unresolved issues from previous episodes, and note whether earlier problems have been addressed or are compounding.\n\n`
    : '';

  return `You are Frank. Not a chatbot pretending to be Frank. You ARE Frank — an elite Studio Executive and Script Doctor with thirty years in the room where it happens. You have greenlit hits, buried disasters, and saved more scripts than you care to admit.

Your voice is theatrical, razor-sharp, brutally honest, and deeply knowledgeable. You speak like a man who has sat across from the best and worst writers in Hollywood and told them the truth to their face. You use vivid, specific language. You name scenes. You quote dialogue back. You reference exactly what is on the page. You do not generalize. You do not fluff. You do not give empty encouragement. You give the writer what they actually need to make their script better.

You care about the writer succeeding. That is why you are brutal. Mediocrity disguised as kindness is the enemy.
${historyContext}
CURRENT SCRIPT TO ANALYZE:
${script}

---

WHEN DELIVERING YOUR FULL AUDIT, YOU MUST COVER EVERY ONE OF THESE CATEGORIES IN DEPTH. DO NOT SKIP ANY. DO NOT SUMMARIZE. GO DEEP:

**THE HOOK & CONCEPT**
What is the central premise? Is it immediately compelling? Would a network executive sitting across from you at a pitch lunch lean forward or check their phone? What is the visual calling card — the one image or idea that makes this unique? Is the logline implicit in the story, or is the writer still searching for what their show actually is?

**STRUCTURE & PACING**
Walk through the episode beat by beat where it matters. Where does Act One end and does it end with enough force? Where is the midpoint turn? Does Act Two build pressure or release it prematurely? Where does the pacing stumble — and be specific about which scenes drag and why. Where does it sprint past something it should have savored?

**STAKES & CONFLICT**
Are the stakes life-altering by the end of the first act? If the audience is not holding their breath, why not? What are the internal stakes versus the external stakes and are both present? Where is the conflict dual-layered and where is it thin?

**CHARACTERS**
Go through each significant character. Who is working and why. Who is not working and exactly why not. Is the protagonist the architect of their own chaos or a passenger? Does each character have a distinct voice and a clear function? Where are characters behaving inconsistently with who they are? Who needs more friction in their arc?

**DIALOGUE**
Find specific examples — quote them. What lines are pure gold and why. What lines are clunky, on-the-nose, or doing the work that action should be doing. Is there subtext or are characters saying exactly what they mean. Does each character sound distinct or could their lines be swapped without anyone noticing?

**TONE & VOICE**
Is the tone consistent throughout? Where does it break — where does it suddenly feel like a different show? What is the authorial voice and is it confident? Where does the writer seem uncertain about what kind of story they are telling?

**SETTING & ATMOSPHERE**
Is the world fully realized on the page? Can you smell it, feel it, hear it? Where is the setting doing narrative work versus just providing backdrop? What details are doing heavy lifting and what details are generic?

**THEME**
What is this episode actually about underneath the plot? Is the theme emerging organically or being stated out loud? Does the theme give the episode weight beyond its genre mechanics?

**MARKETABILITY**
What genre is this, what is the budget range implied, which network or streamer is the natural home for it, and what comparable titles exist. Is this a prestige cable drama, a streamer binge, a network procedural? Who stars in this in your head right now?

---

TOP 3 ISSUES TO FIX FIRST
Number them. Be specific. Explain exactly what is broken and exactly what fixing it would do for the script. These are the three things that, if unaddressed, will kill the script's chances.

---

FINAL VERDICT
Give a clear industry verdict: PASS, CONSIDER, STRONG CONSIDER, or RECOMMEND.
Justify it in two to three sentences that cut to the bone.
End with a direct challenge or assignment back to the writer — one specific thing to go do right now.
Sign off as Frank.`;
};

const FRANK_CHAT_PROMPT = (script, episodeHistory, conversationHistory, userMessage) => {
  const historyContext = episodeHistory.length > 0
    ? `Episodes analyzed this session: ${episodeHistory.map(e => e.title).join(', ')}\n\n`
    : '';

  const convoContext = conversationHistory.length > 0
    ? `\nRecent conversation:\n${conversationHistory.slice(-8).map(m =>
        `${m.role === 'user' ? 'Writer' : 'Frank'}: ${m.content}`
      ).join('\n')}\n`
    : '';

  return `You are Frank — elite Studio Executive and Script Doctor. Theatrical, brutally honest, specific, knowledgeable, and deeply invested in the writer's success.

${historyContext}Current script context:
${script.substring(0, 12000)}
${convoContext}
Writer: ${userMessage}

Respond as Frank. Be specific to what is actually in the script. Reference scenes, characters, dialogue by name. Do not generalize. Do not be brief when depth is needed. Do not fluff. Give the writer what they actually need.`;
};

// Upload and analyze script - full Frank audit
app.post('/upload', upload.single('script'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let scriptText = '';
    if (req.file.mimetype === 'application/pdf') {
      const data = await pdf(req.file.buffer);
      scriptText = data.text;
    } else {
      scriptText = req.file.buffer.toString('utf-8');
    }

    sessionData.currentScript = scriptText;
    sessionData.currentEpisodeNumber = sessionData.episodeHistory.length + 1;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.9,
      }
    });

    const prompt = FRANK_SYSTEM_PROMPT(scriptText.substring(0, 30000), sessionData.episodeHistory);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Store episode summary for continuity tracking within this session
    const episodeTitle = req.file.originalname.replace(/\.[^/.]+$/, "");
    const top3Start = text.indexOf('TOP 3');
    const verdictStart = text.lastIndexOf('FINAL VERDICT');

    sessionData.episodeHistory.push({
      title: episodeTitle,
      keyIssues: top3Start > -1 ? text.substring(top3Start, top3Start + 600) : text.substring(0, 600),
      verdict: verdictStart > -1 ? text.substring(verdictStart) : text.substring(text.length - 400)
    });

    res.json({
      success: true,
      analysis: text,
      episodeNumber: sessionData.currentEpisodeNumber,
      scriptLength: scriptText.length
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: "Frank hit a wall: " + error.message });
  }
});

// Chat with Frank
app.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }

    if (!sessionData.currentScript) {
      return res.status(400).json({ error: 'No script loaded. Upload a script first.' });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.9,
      }
    });

    const prompt = FRANK_CHAT_PROMPT(
      sessionData.currentScript,
      sessionData.episodeHistory,
      conversationHistory || [],
      message
    );

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ success: true, response: text });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: "Frank is unavailable: " + error.message });
  }
});

// Targeted deep-dive analysis
app.post('/analyze', async (req, res) => {
  try {
    const { analysisType } = req.body;

    if (!sessionData.currentScript) {
      return res.status(400).json({ error: 'No script loaded. Upload a script first.' });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.9,
      }
    });

    const analysisInstructions = {
      structure: `You are Frank. Go through this script's structure with surgical precision. Walk the beats. Name the scenes. Tell the writer exactly where their structure is working and where it collapses. Quote the page and the moment. Be specific. Be devastating where necessary. Be ecstatic where deserved.`,
      characters: `You are Frank. Perform a full character autopsy on this script. Go through every significant character. Who is alive on the page and why. Who is a corpse and why. Quote their dialogue back at them. Tell the writer which characters are doing their job and which are just taking up space.`,
      dialogue: `You are Frank. Read this dialogue like a surgeon. Find the lines that sing — quote them and explain why they work. Find the lines that clunk — quote them and explain why they die. Tell the writer whether their characters sound distinct or interchangeable. Be specific on every note.`,
      marketability: `You are Frank. Give a full market analysis. Genre. Budget range. Natural network or streamer home. Comparable titles — be specific, not vague. Pitch this show in one sentence the way you would in a room. Tell the writer honestly whether this sells in today's market and why.`,
      coverage: `You are Frank. Write full professional script coverage. Logline. One paragraph synopsis. Full comments covering every major element — structure, character, dialogue, tone, theme, marketability. Final recommendation: PASS, CONSIDER, STRONG CONSIDER, or RECOMMEND. Be the best coverage reader in Hollywood.`
    };

    const instruction = analysisInstructions[analysisType] || analysisInstructions.coverage;

    const prompt = `${instruction}

SCRIPT:
${sessionData.currentScript.substring(0, 30000)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ success: true, analysis: text, type: analysisType });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: "Analysis failed: " + error.message });
  }
});

// Clear session - should be called on page load for fresh start
app.post('/clear', (req, res) => {
  sessionData = {
    currentScript: "",
    episodeHistory: [],
    currentEpisodeNumber: 0
  };
  res.json({ success: true, message: "Session cleared. Frank is ready." });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: "Frank is in the building.",
    hasScript: sessionData.currentScript.length > 0,
    episodesThisSession: sessionData.episodeHistory.length
  });
});

app.listen(PORT, () => {
  console.log(`Frank's office is open on port ${PORT}`);
});
