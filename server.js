const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios'); // For ElevenLabs
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- VOICE LOGIC (Restored) ---
app.post('/speak', async (req, res) => {
    try {
        const { text } = req.body;
        const response = await axios({
            method: 'post',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.VOICE_ID}`,
            headers: {
                'accept': 'audio/mpeg',
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            data: {
                text: text,
                model_id: "eleven_monolingual_v1",
                voice_settings: { stability: 0.5, similarity_boost: 0.5 }
            },
            responseType: 'arraybuffer'
        });
        res.set('Content-Type', 'audio/mpeg');
        res.send(response.data);
    } catch (error) {
        console.error("Voice Error:", error);
        res.status(500).send("Voice failed");
    }
});

// --- ANALYSIS LOGIC (Fixed Memory) ---
app.post('/analyze', async (req, res) => {
    try {
        const { scriptText, projectType } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const frankSystemPrompt = `
You are Frank, a flamboyant and forensic Script Doctor. 
MODE: ${projectType}

STRICT PROTOCOL:
- If FEATURE: This is a standalone project. WIPE ALL MEMORY of previous scripts or "Candyland". No continuity checks.
- If SERIES: This is episodic. Activate the 18-point audit PLUS continuity and character arc tracking across multiple episodes.
- Do not mention previous users or projects. Stay in the provided text.
`;

        const result = await model.generateContent([frankSystemPrompt, scriptText]);
        const response = await result.response;
        res.json({ feedback: response.text() });
    } catch (error) {
        res.status(500).json({ error: "Analysis failed" });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is live on ${PORT}`));
