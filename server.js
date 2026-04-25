function playIntroOnce() {
            if (hasGreeted) return;
            hasGreeted = true;
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            const intro = document.getElementById('intro-msg');
            // Check for the return from PayPal
            if (localStorage.getItem('frank_paid') === 'true') {
                const welcomeBack = "Welcome back, darling. Payment confirmed. I'm ready to provide Frank's 5 Dollar Feedback for your pages. Before you click the PDF Upload button, please remember to select either Feature Film or TV Series using the toggle above.";
                intro.innerText = welcomeBack;
                speak(welcomeBack);
            } else {
                intro.innerText = GREETING;
                speak(GREETING);
            }
        }
