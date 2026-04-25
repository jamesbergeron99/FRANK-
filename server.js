async function speak(fullText) {
            stopCurrentAudio();
            
            // Phonetic Cleanup for the Voice Engine
            let cleanText = fullText.replace(/[#*]/g, '');
            cleanText = cleanText.replace(/LOGLINE/gi, "LOG-LINE");
            cleanText = cleanText.replace(/SPAG/gi, "S.P.A.G.");
            cleanText = cleanText.replace(/\b(TV)\b/gi, "T.V.");
            
            const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
            audioBuffers = {}; nextToPlay = 0; totalSentences = sentences.length;
            
            sentences.forEach(async (sentence, index) => {
                try {
                    const settingsResp = await fetch('/voice-settings');
                    const settings = await settingsResp.json();
                    const ttsResponse = await fetch("https://api.inworld.ai/tts/v1/voice", {
                        method: "POST",
                        headers: { "Authorization": `Basic ${settings.apiKey}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ text: sentence, voiceId: "default-oglabcjnetcklcq7rghmbw__frank", modelId: "inworld-tts-1.5-max" })
                    });
                    const data = await ttsResponse.json();
                    const audioData = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0)).buffer;
                    audioBuffers[index] = await audioCtx.decodeAudioData(audioData);
                    if (!isPlaying && index === nextToPlay) playSequentially();
                } catch (e) { console.error(e); }
            });
        }
