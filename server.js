// REPLACE your window.onload with this:
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('st') || localStorage.getItem('frank_paid') === 'true') {
        localStorage.setItem('frank_paid', 'true');
        document.getElementById('auth-check').style.display = 'none';
        
        // ONLY reference memory if feedback actually exists in storage
        const hasMemory = localStorage.getItem('frank_last_feedback');
        const welcome = hasMemory 
            ? "I've reviewed your previous notes. Let's see if this next installment actually shows some growth."
            : "Frank is in. Select your format and upload your pages. I don't have all day.";
        
        addMessage(welcome);
        speak(welcome);
    } else {
        window.location.href = "https://www.scriptread.ca";
    }
};

// REPLACE the inside of your uploadFiles() try block with this:
try {
    const response = await fetch('/analyze', { method: 'POST', body: formData });
    const data = await response.json();
    
    // SAVE FEEDBACK: This creates the memory for the next episode
    localStorage.setItem('frank_last_feedback', data.message);
    
    addMessage(data.message, true); 
    speak(data.message);
    
    uploadBtn.disabled = false;
    uploadBtn.innerText = isTV ? "START NEXT EPISODE ($5)" : "START SEQUEL / TRILOGY ($5)";
    
    uploadBtn.onclick = () => {
        localStorage.removeItem('frank_paid'); // Clear auth for fresh payment
        window.location.href = "https://www.paypal.com/ncp/payment/VRYUFK4H8K6M6";
    };
} catch (err) { 
    addMessage("Frank is indisposed, honey.");
    uploadBtn.disabled = false;
    uploadBtn.innerText = "RETRY UPLOAD";
}
