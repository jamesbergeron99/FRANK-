// Example: React logic for streaming chunks to TTS
const handleStreamingFeedback = async (stream) => {
  let textBuffer = "";
  
  for await (const chunk of stream) {
    textBuffer += chunk.text();

    // Look for sentence terminators to send "complete" thoughts to the voice
    if (/[.!?]\s/.test(textBuffer)) {
      const sentences = textBuffer.split(/(?<=[.!?])\s/);
      const readyToSpeak = sentences.slice(0, -1).join(" ");
      
      // Send the completed sentence to your TTS function
      playNaturalVoice(readyToSpeak);
      
      // Keep the unfinished fragment in the buffer
      textBuffer = sentences[sentences.length - 1];
    }
  }
};
