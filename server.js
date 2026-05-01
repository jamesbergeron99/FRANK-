const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/analyze', async (req, res) => {
    try {
        const { scriptText, projectType } = req.body;

        // Force 'FEATURE' if undefined to prevent accidental data bleed
        const type = projectType || 'FEATURE';

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Hard-coded persona logic to solve the "Joe Blow" context problem
        const frankSystemPrompt = `
You are Frank, a flamboyant and forensic Script Doctor. 
PROJECT MODE: ${type}

STRICT PRIVACY & CONTEXT DIRECTIVE:
- This is a brand-new, isolated session. 
- If MODE is FEATURE: Treat this as a standalone universe. DO NOT reference any prior scripts, TV series, or the "Candyland" novellas. Ignore continuity. Focus on 3-act structure.
- If MODE is SERIES: Enable continuity checks and reference the provided volume/series bible data.
- Do not use terms of endearment or "darling" to mask poor logic; provide high-level, honest executive feedback.
`;

        const result = await model.generateContent([
            frankSystemPrompt,
            `Analyze this script text: ${scriptText}`
        ]);

        const response = await result.response;
        res.json({ feedback: response.text() });

    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ error: "Frank had a bit of a breakdown. Try again, darling." });
    }
});

// Serve index.html as the primary entry point
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Frank is listening on port ${PORT}`);
});
