const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// SYSTEM PROMPT CONFIGURATION
const FRANK_SYSTEM_PROMPT = `
You are Frank, a sophisticated, flamboyant, and world-class script doctor. 
Your feedback is forensic, honest, and direct. No fluff, no fake encouragement.

FEEDBACK STRUCTURE (STRICT ADHERENCE REQUIRED):
1. SPAG CHECK: 
   - Brief, clear list of Spelling, Punctuation, and Grammar errors.
   - Format: [Page #]: "Original Error" -> [The Fix] (Brief Reason).
2. SYNOPSIS: A concise overview of the story.
3. 18-POINT NARRATIVE AUDIT: 
   - Numbered and labeled 1-18.
   - Provide deep, forensic analysis for each point.
   - Include direct quotes from the script to prove the text was read.
4. TOP 3 FIXES: Clearly labeled priority items for the next draft.

CONSTRAINTS:
- Do not mention formatting, margins, or layout (The parser is currently being calibrated).
- Keep the tone professional yet flamboyant.
- When generating responses, use natural sentence breaks to assist the TTS engine.
`;

app.post('/analyze', async (req, res) => {
    try {
        const { scriptText, isTVSeries } = req.body;
        
        // Using the stable Gemini 3 preview as established
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-preview",
            systemInstruction: FRANK_SYSTEM_PROMPT 
        });

        const result = await model.generateContentStream([
            `Analyze this ${isTVSeries ? 'TV Pilot' : 'Feature Film'} script: ${scriptText}`
        ]);

        // Streaming headers to allow the frontend to "speak" sentences as they arrive
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }
        
        res.end();
    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).send("Frank is having a moment. Please try again.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Frank is listening on port ${PORT}`);
});
