async function speak(fullText) {
    stopCurrentAudio();
    const sections = fullText.split(/(?=\bLogline:|\bSynopsis:|\d+\.|\bOn page)/g);
    audioBuffers = {}; nextToPlay = 0; totalSections = sections.length;
    isSequenceActive = true;
    const settingsResp = await fetch('/voice-settings');
    const settings = await settingsResp.json();
    
    // Track how many chunks have finished decoding
    let chunksReady = 0; // ADDED

    sections.forEach(async (section, index) => {
        if (section.trim().length < 2) return;
        try {
            const vSection = section.replace(/Logline/gi, 'Log line');
            const ttsResp = await fetch("https://api.inworld.ai/tts/v1/voice", {
                method: "POST", headers: { "Authorization": `Basic ${settings.apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ text: vSection, voiceId: "default-oglabcjnetcklcq7rghmbw__frank", modelId: "inworld-tts-1.5-max" })
            });
            const data = await ttsResp.json();
            const buffer = await audioCtx.decodeAudioData(Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0)).buffer);
            audioBuffers[index] = buffer;
            chunksReady++; // ADDED

            // Start playback only when we have 2 chunks ready OR we've reached the end of a short response
            if (!isPlaying && (chunksReady >= 2 || totalSections < 2) && index === 0) { // CHANGED
                playSequentially(); 
            }
        } catch (e) {}
    });
}
