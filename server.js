const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// This line tells the server to look in the 'public' folder for your HTML
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Frank's cleaning logic: No page numbers, no parentheticals.
function cleanScript(text) {
    return text.split('\n')
        .filter(line => {
            const isPageNumber = /^\d+$/.test(line.trim());
            const isParenthetical = /^\(.*\)$/.test(line.trim());
            return !isPageNumber && !isParenthetical;
        })
        .join('\n');
}

// Explicitly send the index.html file if someone hits the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/analyze', upload.single('script'), async (req, res) => {
    if (!req.file) return res.status(400).send('Darling, I need a file to work with.');

    try {
        const data = await pdf(req.file.buffer);
        const cleanedText = cleanScript(data.text);
        
        // Frank's receipt log
        console.log("Frank is reviewing the pages...");
        
        res.json({
            message: "Frank has received the script. He's pouring a drink and beginning the breakdown.",
            preview: cleanedText.substring(0, 500) + "..."
        });
    } catch (err) {
        res.status(500).send("Something went wrong in the mailroom.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Frank is holding court on port ${PORT}`);
});
