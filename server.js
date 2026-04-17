const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));
app.use(express.json());

// Frank's strict cleaning logic: No page numbers, no parentheticals.
function cleanScript(text) {
    return text.split('\n')
        .filter(line => {
            const isPageNumber = /^\d+$/.test(line.trim());
            const isParenthetical = /^\(.*\)$/.test(line.trim());
            return !isPageNumber && !isParenthetical;
        })
        .join('\n');
}

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).send('Darling, I need a file to work with.');

    try {
        const data = await pdf(req.file.buffer);
        const cleanedText = cleanScript(data.text);
        
        // This is where Frank would talk to the LLM and the Voice API
        console.log("Frank is reading...");
        
        res.json({
            message: "Frank has received the script. He's pouring a drink and beginning the breakdown.",
            preview: cleanedText.substring(0, 500) + "..."
        });
    } catch (err) {
        res.status(500).send("Something went wrong in the mailroom.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frank is holding court on port ${PORT}`));