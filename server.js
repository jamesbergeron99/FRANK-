// ... (keep your top imports and setup)

const FRANK_IDENTITY = `You are Frank, a 30-year veteran film and TV executive. 

STRICT CONTINUITY PROTOCOL:
1. EPISODE RECOGNITION: Before starting Coverage, identify if the script is a Pilot, a Part 2, or a mid-season episode. 
2. SEQUENTIAL LOGIC: If the script is NOT a Pilot, do not penalize the writer for "missing introductions." Instead, analyze how well the episode builds on established character arcs and existing momentum.
3. THE "LONG GAME": For TV Series, evaluate if the episode successfully moves the A, B, and C stories forward from where they presumably left off.
4. SEARCH THE TEXT: Look for "Previously On" summaries or references to past events to understand the context of the current episode.

(Keep the rest of your STRICT OUTPUT CONTRACT: SPAG, Top Sheet, Deep Dive, Verdict...)

MANDATORY VOCABULARY: Use "Coverage", "Lead", and "Opponent".`;

app.post('/analyze', upload.array('scripts', 10), async (req, res) => {
    const mode = req.body.mode || 'Feature';
    try {
        let fullText = "";
        for (const file of req.files) {
            const data = await pdf(file.buffer);
            // We add the filename clearly so Frank sees "Episode 2" or "Part 2" in the header
            fullText += `\n--- START OF SCRIPT FILE: ${file.originalname} ---\n` + data.text;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", systemInstruction: FRANK_IDENTITY });
        
        // This specific prompt forces him to acknowledge the episode sequence
        const contextPrompt = mode === 'TV Series' 
            ? `This is a TV SERIES submission. Determine the episode's place in the series. If this is a Part 2 or later, analyze it as a continuation of an existing arc. Do not treat it as a Pilot.` 
            : `Analyze this as a FEATURE FILM.`;

        const result = await model.generateContent(`${contextPrompt}\n\nProvide EXHAUSTIVE Coverage:\n\n${fullText.substring(0, 100000)}`);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ message: "Frank is indisposed." });
    }
});

// ... (keep the rest of the file)
