async function speak(fullText) {
    // 1. HARD RESET: Kill all active audio logic and flags immediately
    stopCurrentAudio();
    
    // 2. Map the sequence based on your mandatory forensic headers
    const sections = fullText.split(/(?=SPELLING|LOGLINE|SYNOPSIS|WHAT’S WORKING|Concept|Structure|Pacing|Stakes|Protagonist|Antagonist|Dynamics|Dialogue|Tone|World|Theme|Marketability|TOP 3 ISSUES|FINAL VERDICT)/g);
    
    audioBuffers = {}; 
    nextToPlay = 0; 
    totalSections = sections.length;
    isSequenceActive = true; // Master gate to prevent overlapping responses

    const settings = await (await fetch('/voice-settings')).json();
    
    // 3. SEQUENTIAL GENERATION: Process one thought at a time
    for (let index = 0; index < sections.length; index++) {
        const section = sections[index];
        if (section.trim().length < 2) continue;

        // If a new 'speak' call or a 'stop' was triggered, exit this loop instantly
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

            // 4. TRIGGER: Start the playback chain only for the very first buffer
            if (!isPlaying && index === 0 && isSequenceActive) {
                playSequentially();
            }
        } catch (e) {
            console.error("Audio Sync Error:", e);
        }
    }
}

function stopCurrentAudio() { 
    // Immediate kill-switch for all sequence flags and playback
    isSequenceActive = false;
    isPlaying = false;
    nextToPlay = 0;
    
    if (currentSource) { 
        try { 
            currentSource.stop(); 
        } catch (e) {
            // Source was already inactive or finished
        } 
        currentSource = null; 
    } 
    
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
}

function playSequentially() {
    // Check if this specific sequence is still the authorized active one
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
            // Only move to the next buffer if we are still the active sequence
            if (isSequenceActive && isPlaying) { 
                nextToPlay++; 
                playSequentially(); 
            } 
        };
        
        currentSource.start();
    } else { 
        // Wait briefly for the sequential generator in speak() to finish the next chunk
        if (isSequenceActive) {
            setTimeout(playSequentially, 100); 
        }
    }
}
