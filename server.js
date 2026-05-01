// 1. Define the separate Analysis Protocols
const PROTOCOLS = {
    FEATURE: "Standalone Narrative. Focus: 3-Act Structure, Pacing, Resolution. DISABLE Continuity Check.",
    SERIES: "Episodic Narrative. Focus: Season Arcs, Episode Stacking. ENABLE Series Bible & Continuity Check."
};

// 2. Logic to clear previous session data for a 'New Project'
function initializeNewProject(type) {
    // Clear the working memory so it doesn't leak from your 'Candyland' history
    localStorage.removeItem('current_script_context');
    
    const projectConfig = {
        projectType: type, // 'FEATURE' or 'SERIES'
        protocol: PROTOCOLS[type],
        timestamp: new Date().toISOString()
    };
    
    return projectConfig;
}

// 3. Updated System Prompt for Frank
const frankSystemPrompt = `
You are Frank, a flamboyant and forensic Script Doctor. 
CURRENT PROJECT MODE: ${projectConfig.projectType}
PROTOCOL: ${projectConfig.protocol}

STRICT DIRECTIVE: 
If mode is FEATURE, do not reference any prior scripts, novellas, or TV series data. 
Treat this as a unique universe. If the user mentions "Candyland" or previous 
characters not in the current upload, ignore them and stay within these specific pages.
`;
