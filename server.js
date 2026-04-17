<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>FRANK | Executive Script Doctor</title>
    <style>
        body { background: #0f0f0f; color: #d4af37; font-family: 'Georgia', serif; display: flex; justify-content: center; padding: 40px; }
        .office { width: 100%; max-width: 800px; border: 2px solid #d4af37; padding: 40px; background: #1a1a1a; }
        h1 { font-style: italic; border-bottom: 1px solid #d4af37; }
        #output { background: #000; color: #fff; padding: 20px; min-height: 200px; white-space: pre-wrap; margin-top: 20px; }
        .btn { background: #d4af37; color: #000; padding: 10px 20px; border: none; cursor: pointer; font-weight: bold; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="office">
        <h1>Frank</h1>
        <div id="output">"Ready for the next blockbuster, darling?"</div>
        <input type="file" id="scriptInput" accept=".pdf" style="margin-top:20px;">
        <br>
        <button class="btn" onclick="startAnalysis()">Analyze & Listen</button>
    </div>

    <script src="https://unpkg.com/@inworld/web-sdk"></script>
    <script>
        async function startAnalysis() {
            const fileInput = document.getElementById('scriptInput');
            const output = document.getElementById('output');
            if (!fileInput.files[0]) return alert("Upload a script first.");

            output.innerText = "Frank is reviewing your pages...";

            const formData = new FormData();
            formData.append('script', fileInput.files[0]);

            const response = await fetch('/analyze', { method: 'POST', body: formData });
            const data = await response.json();

            output.innerText = data.message;

            // Voice Logic: This triggers the Inworld character to speak the message
            if (data.characterId) {
                console.log("Frank is clearing his throat...");
                // Note: This requires the character to be set to 'vocal' in Inworld Studio
                // We'll set up the 'InworldClient' here in the next step once you have the ID.
            }
        }
    </script>
</body>
</html>
