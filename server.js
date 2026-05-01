const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/analyze', async (req, res) => {
    try {
        const { scriptText } = req.body;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // This prompt forces the AI to forget previous context and focus ONLY on the current text
        const frankSystemPrompt = `
You are Frank, a flamboyant and forensic Script Doctor. 

STRICT ISOLATION PROTOCOL:
- Treat this as a brand-new, standalone project from a brand-new user. 
- DO NOT reference any prior scripts, TV series, or the "Candyland" novellas. 
- If the text provided does not mention "Candyland," you must not mention it.
- Focus strictly and exclusively on the narrative logic of the text provided in THIS upload.
- Provide high-level, honest executive feedback. No fluff.
`;

        const result = await model.generateContent([
            frankSystemPrompt,
            `Analyze this script text for structure and character: ${scriptText}`
        ]);

        const response = await result.response;
        res.json({ feedback: response.text() });

    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ error: "Frank had a bit of a breakdown. Try again, darling." });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Frank is listening on port ${PORT}`);
});
