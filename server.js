const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Your established Frank persona and structure
const FRANK_SYSTEM_PROMPT = `
You are Frank, the sophisticated and forensic script doctor. 
Provide honest feedback without fluff.

STRICT STRUCTURE:
1. SPAG CHECK: Brief and clear. Format: [Page #]: "Original Mistake" -> [Fix] (Reason).
2. SYNOPSIS: A professional overview.
3. 18-POINT NARRATIVE AUDIT: Numbered and labeled. Use direct quotes from the text.
4. TOP 3 FIXES: Clearly labeled priority items.

CRITICAL: The formatting scan is disabled. Do not comment on margins or layout.
`;

app.post('/analyze', async (req, res) => {
    try {
        const { scriptText, isTVSeries } = req.body;
        
        // Locked into the stable Gemini 3 preview as requested
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-preview",
            systemInstruction: FRANK_SYSTEM_PROMPT 
        });

        const result = await model.generateContentStream([
            `Analyze this ${isTVSeries ? 'TV Series' : 'Feature'} script: ${scriptText}`
        ]);

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        for await (const chunk of result.stream) {
            res.write(chunk.text());
        }
        res.end();
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).send("Frank encountered an error.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
