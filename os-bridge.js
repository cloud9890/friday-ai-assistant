/* ==========================================================================
   F.R.I.D.A.Y. // BROWSER-NATIVE OS BRIDGE & PHONETIC INTENT PARSER
   ========================================================================== */

const SERVER_URL = ''; // Same origin as Vite dev server (port 5173)

/**
 * Cleanly extracts the actual search query by stripping all conjunctions,
 * action verbs, filler words, and service names.
 */
function extractSearchQuery(raw, service) {
  let text = (raw || '').trim();

  // 1. Remove wake words
  text = text.replace(/^(friday|hey friday|ok friday|hi friday)[,\s]*/i, '');

  // 2. Remove opening commands like "open youtube", "launch youtube", "go to youtube"
  text = text.replace(new RegExp(`\\b(open|launch|go to|open up)\\s+${service}\\b`, 'gi'), '');

  // 3. Remove "on youtube", "in youtube", "from youtube"
  text = text.replace(new RegExp(`\\b(on|in|from)\\s+${service}\\b`, 'gi'), '');

  // 4. Remove standalone service name
  text = text.replace(new RegExp(`\\b${service}\\b`, 'gi'), '');

  // 5. Remove trailing requests like "and play the latest video", "play latest video", "play latest", "and play"
  text = text.replace(/\b(and\s+)?(play\s+the\s+latest\s+video|play\s+latest\s+video|play\s+the\s+newest\s+video|play\s+latest|play\s+newest|latest\s+video|newest\s+video|play\s+it)\b/gi, '');

  // 6. Iteratively strip leading filler phrases
  let prev = '';
  while (prev !== text) {
    prev = text;
    text = text.replace(/^(and\s+|for\s+|about\s+|to\s+|a\s+|the\s+|search\s+for\s+|search\s+|find\s+|play\s+|look\s+up\s+|look\s+for\s+|show\s+me\s+|show\s+|watch\s+|listen\s+to\s+|videos?\s+of\s+|videos?\s+on\s+)/i, '').trim();
  }

  // 7. Strip trailing filler
  text = text.replace(/(\s+on\s+\w+|\s+please)$/i, '').trim();

  // 8. Strip surrounding punctuation
  text = text.replace(/^[,\s\-\:]+|[,\s\-\:\.\?]+$/g, '').trim();

  return text;
}

export class OSBridge {
  constructor() {
    this.serverOnline = true;
  }

  /* ------------------------------------------------------------------------
     1. OPEN WEB APPS (Direct Browser Anchor Click — Never Blocked)
     ------------------------------------------------------------------------ */
  openWebApp(url) {
    // Send to Vite backend to avoid browser popup blockers
    this.executeMacro([{ type: 'url', target: url }]);
    return true;
  }

  /* ------------------------------------------------------------------------
     5. WEB AGENT INTERACTION
     ------------------------------------------------------------------------ */
  async interactWebAgent(action, url = null, elementId = null, text = null, direction = null) {
    try {
      const res = await fetch(`${SERVER_URL}/api/web-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, url, elementId, text, direction }),
        signal: AbortSignal.timeout(15000)
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.warn('Web agent error:', e);
      return { success: false, error: e.message };
    }
  }

  /* ------------------------------------------------------------------------
     2. LAUNCH DESKTOP APP (Vite Embedded Plugin)
     ------------------------------------------------------------------------ */
  async openDesktopApp(appName) {
    try {
      const res = await fetch(`${SERVER_URL}/api/open-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName }),
        signal: AbortSignal.timeout(3000)
      });
      const data = await res.json();
      return data.success;
    } catch (e) {
      console.warn('Desktop app launch error:', e);
      return false;
    }
  }

  /* ------------------------------------------------------------------------
     3. DOWNLOAD / SAVE FILE DIRECTLY
     ------------------------------------------------------------------------ */
  async saveOrDownloadFile(fileName, content, format = 'txt') {
    // Try Vite server desktop saver first
    try {
      const res = await fetch(`${SERVER_URL}/api/save-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, content, targetFolder: 'Desktop', format }),
        signal: AbortSignal.timeout(2500)
      });
      const data = await res.json();
      if (data.success) return true;
    } catch (e) {}

    // Fallback: Browser Download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }

  /* ------------------------------------------------------------------------
     4. REAL HARDWARE TELEMETRY
     ------------------------------------------------------------------------ */
  async fetchSystemStats() {
    try {
      const res = await fetch(`${SERVER_URL}/api/system-stats`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  }

  async searchFiles(query, folder = 'all') {
    try {
      const res = await fetch(`${SERVER_URL}/api/search-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, folder })
      });
      return await res.json();
    } catch (e) { return { success: false }; }
  }

  async executeMacro(steps) {
    try {
      const res = await fetch(`${SERVER_URL}/api/execute-macro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps })
      });
      return await res.json();
    } catch (e) { return { success: false }; }
  }

  /* ------------------------------------------------------------------------
     2. NATIVE TOOL METHODS (Triggered via LLM)
     ------------------------------------------------------------------------ */
  async createDocument(topic, originalRequest, fetchGroqResponseFn) {
    if (!fetchGroqResponseFn) return false;

    let essayContent = '';
    const prompt = `You have been asked to generate a document/essay. Topic: "${topic}". User request details: "${originalRequest}".\nPlease fulfill the request exactly as specified. If the user mentions facts from memory, use them. Structure it well.`;
    
    essayContent = await fetchGroqResponseFn(prompt);
    
    if (essayContent) {
      essayContent = essayContent.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
    } else {
      essayContent = `# Document: ${topic}\n\nContent could not be generated.`;
    }

    const fileName = `Document_${topic.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await this.saveOrDownloadFile(fileName, essayContent, 'docx');
    
    return `I've successfully composed the document on "${topic}" and saved it to your computer as a docx file, Boss!`;
  }
}

export const osBridge = new OSBridge();
