// REPLACE your existing speak(), stopCurrentAudio(), and playSequentially() 
// in index.html with this exact block.

async function speak(fullText) {
    // 1. HARD RESET: Kill all active logic and flags before starting a new read
    stopCurrentAudio();
    
    // 2. Identify the sequence based on your mandatory headers
    const sections = fullText.split(/(?=SPELLING|LOGLINE|SYNOPSIS|WHAT’S WORKING|Concept|Structure|Pacing|Stakes|Protagonist|Antagonist|Dynamics|Dialogue|Tone|World|Theme|Marketability|TOP 3 ISSUES|FINAL VERDICT)/g);
    
    audioBuffers = {}; 
    nextToPlay = 0; 
    totalSections = sections.length;
    isSequenceActive = true; // This is the master gate

    const settings = await (await fetch('/voice-settings')).json();
    
    // 3. SEQUENTIAL GENERATION: Process sections one-by-one (Fixes the overlapping/echo)
    for (let index = 0; index < sections.length; index++) {
        const section = sections[index];
        if (section.trim().length < 2) continue;

        // If a new response or a 'stop' was triggered, exit this loop immediately
        if (!isSequenceActive) break;

        try {
            const res = await fetch("https://api.inworld.ai/tts/v1/voice", {
                method: "POST", 
                headers: { 
                    "Authorization": `Basic ${settings.apiKey}`, 
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({ 
                    text: section.replace(/Logline/gi, 'Log line'), 
                    voiceId: "default-oglabcjnetcklcq7rghmbw__frank", 
                    modelId: "inworld-tts-1.5-max" 
                })
            });
            
            const data = await res.json();
            const buffer = await audioCtx.decodeAudioData(Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0)).buffer);
            
            audioBuffers[index] = buffer;

            // 4. TRIGGER: Start playback ONLY for the first section to start the chain
            if (!isPlaying && index === 0 && isSequenceActive) {
                playSequentially();
            }
        } catch (e) {
            console.error("Audio Sequencing Error:", e);
        }
    }
}

function stopCurrentAudio() { 
    // Kill the sequence gate and reset playback flags immediately
    isSequenceActive = false;
    isPlaying = false;
    nextToPlay = 0;
    
    if (currentSource) { 
        try { 
            currentSource.stop(); 
        } catch (e) {
            // Source was already inactive or ended
        } 
        currentSource = null; 
    } 
    
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
}

function playSequentially() {
    // Master gate: if the sequence isn't active, do not play
    if (!isSequenceActive || nextToPlay >= totalSections) { 
        isPlaying = false; 
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
        return; 
    }

    if (audioBuffers[nextToPlay]) {
        isPlaying = true; 
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
        
        currentSource = audioCtx.createBufferSource();
        currentSource.buffer = audioBuffers[nextToPlay];
        currentSource.connect(audioCtx.destination);
        
        currentSource.onended = () => { 
            // Only move to the next section if the sequence is still the current active one
            if (isSequenceActive && isPlaying) { 
                nextToPlay++; 
                playSequentially(); 
            } 
        };
        
        currentSource.start();
    } else { 
        // Wait for the sequential generator in speak() to catch up
        if (isSequenceActive) {
            setTimeout(playSequentially, 100); 
        }
    }
}
