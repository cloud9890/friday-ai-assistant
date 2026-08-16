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
  async saveOrDownloadFile(fileName, content) {
    // Try Vite server desktop saver first
    try {
      const res = await fetch(`${SERVER_URL}/api/save-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, content, targetFolder: 'Desktop' }),
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
     2. PARSE AND EXECUTE INTENT
     ------------------------------------------------------------------------ */
  async parseAndExecute(cleanQuery, rawPrompt, fetchGroqResponseFn) {
    const q = cleanQuery.toLowerCase().trim();
    const raw = rawPrompt.trim();

    // ============================================
    // FILE SEARCH INTENT
    // ============================================
    if (q.includes('find file') || q.includes('search file') || q.includes('locate file') ||
        q.includes('find files') || q.includes('search files') || q.includes('locate files') ||
        q.includes('find document') || q.includes('search document') || q.includes('find documents') || q.includes('search documents')) {
      const fileQuery = q.replace(/^.*(find|search|locate)\s+(files|documents|file|document)\b\s*/i, '').trim();
      if (fileQuery.length > 0) {
        const searchRes = await this.searchFiles(fileQuery);
        if (searchRes.success && searchRes.files?.length > 0) {
          const fileList = searchRes.files.map(f => f.name).join(', ');
          return `I found ${searchRes.count} matching files, Boss: ${fileList}.`;
        }
        return `I searched your system for "${fileQuery}", but found no matching files, Boss.`;
      }
    }

    // ============================================
    // A. DESKTOP APP LAUNCH INTENTS (WITH PHONETIC ALIASES)
    // ============================================
    const appMap = {
      'notepad': 'notepad',
      'note pad': 'notepad',
      'not pad': 'notepad',
      'road paid': 'notepad',
      'calculator': 'calculator',
      'calc': 'calculator',
      'vscode': 'vscode',
      'vs code': 'vscode',
      'code': 'vscode',
      'explorer': 'explorer',
      'file explorer': 'explorer',
      'chrome': 'chrome',
      'browser': 'chrome',
      'task manager': 'task manager',
      'cmd': 'cmd',
      'command prompt': 'cmd',
      'powershell': 'powershell',
      'paint': 'paint',
      'snipping tool': 'snipping tool'
    };

    // Check if query contains any app keyword
    for (const [key, appName] of Object.entries(appMap)) {
      if (q.includes(key)) {
        console.log(`⚡ Launching Desktop App: "${appName}"`);
        await this.openDesktopApp(appName);
        
        // If query ALSO asked to write an essay
        const isAlsoEssay = q.match(/\b(essay|paper|article|story|asse)\b/i);
        if (isAlsoEssay) {
          const topic = extractSearchQuery(raw.replace(new RegExp(`.*?\\b(${key})\\b`, 'i'), ''), 'essay') || "Iron Man";
          let essayContent = '';
          if (fetchGroqResponseFn) {
            essayContent = await fetchGroqResponseFn(`Write a comprehensive 4-paragraph essay on "${topic}".`);
          }
          if (!essayContent) essayContent = `# Essay: ${topic}\n\n${topic} represents an iconic subject in modern engineering and science.`;
          
          const fileName = `Essay_${topic.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
          await this.saveOrDownloadFile(fileName, essayContent);
          return `Launching ${appName.toUpperCase()} and saving the essay on "${topic}" to your Desktop, Boss!`;
        }

        return `Right away, Boss. Launching ${appName.toUpperCase()} on your Windows desktop.`;
      }
    }

    // ============================================
    // B. ESSAY GENERATION & DESKTOP SAVE
    // ============================================
    const isEssayOnly = q.match(/\b(essay|paper|article|story|asse|essaye)\b/i);
    if (isEssayOnly) {
      const topicMatch = raw.replace(/.*?\b(essay|paper|article|story|asse|essaye)\b[,\s]*/i, '').replace(/^(on|about)[,\s]*/i, '').trim();
      const topic = topicMatch || 'Iron Man';

      let essayContent = '';
      if (fetchGroqResponseFn) {
        const prompt = `Write a comprehensive, well-structured 4-paragraph essay on: "${topic}". Include a Title, Introduction, Body, and Conclusion.`;
        essayContent = await fetchGroqResponseFn(prompt);
      }

      if (!essayContent) {
        essayContent = `# Essay: ${topic}\n\n${topic} represents one of the most important areas in modern science and technology...\n\nIn conclusion, ${topic} will continue shaping our future.`;
      }

      const fileName = `Essay_${topic.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      await this.saveOrDownloadFile(fileName, essayContent);

      return `I've composed the essay on "${topic}" and saved it to your computer as ${fileName}, Boss!`;
    }

    // ============================================
    // C. WEB APP INTENTS (SMART SEARCH & YOUTUBE FILTERING)
    // ============================================

    // 1. YouTube Search (Supports "play latest video", specific channels/topics)
    if (q.includes('youtube')) {
      const wantsLatest = q.includes('latest') || q.includes('newest');
      const cleanSearch = extractSearchQuery(raw, 'youtube');
      
      let url = 'https://www.youtube.com/';
      if (cleanSearch.length > 0) {
        // If user asked for the latest video, add upload date filter sp=CAI%253D
        url = wantsLatest
          ? `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanSearch)}&sp=CAI%253D`
          : `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanSearch)}`;
      }

      this.openWebApp(url);
      
      if (cleanSearch.length > 0) {
        return wantsLatest
          ? `Opening YouTube and showing the latest video for "${cleanSearch}", Boss.`
          : `Opening YouTube and searching for "${cleanSearch}", Boss.`;
      }
      return `Opening YouTube, Boss.`;
    }

    // 2. Instagram
    if (q.includes('instagram')) {
      this.openWebApp('https://www.instagram.com/');
      return `Opening Instagram, Boss.`;
    }

    // 3. Spotify
    if (q.includes('spotify')) {
      const cleanSearch = extractSearchQuery(raw, 'spotify');
      const url = cleanSearch.length > 0
        ? `https://open.spotify.com/search/${encodeURIComponent(cleanSearch)}`
        : 'https://open.spotify.com/';
      this.openWebApp(url);
      return cleanSearch.length > 0
        ? `Opening Spotify and searching for "${cleanSearch}", Boss.`
        : `Opening Spotify, Boss.`;
    }

    // 4. GitHub
    if (q.includes('github')) {
      const cleanSearch = extractSearchQuery(raw, 'github');
      const url = cleanSearch.length > 0
        ? `https://github.com/search?q=${encodeURIComponent(cleanSearch)}`
        : 'https://github.com/';
      this.openWebApp(url);
      return cleanSearch.length > 0
        ? `Opening GitHub and searching for "${cleanSearch}", Boss.`
        : `Opening GitHub, Boss.`;
    }

    // 5. Twitter / X
    if (q.includes('twitter') || q.includes(' x ')) {
      this.openWebApp('https://x.com/');
      return `Opening X, Boss.`;
    }

    // 6. Reddit
    if (q.includes('reddit')) {
      const cleanSearch = extractSearchQuery(raw, 'reddit');
      const url = cleanSearch.length > 0
        ? `https://www.reddit.com/search/?q=${encodeURIComponent(cleanSearch)}`
        : 'https://www.reddit.com/';
      this.openWebApp(url);
      return cleanSearch.length > 0
        ? `Searching Reddit for "${cleanSearch}", Boss.`
        : `Opening Reddit, Boss.`;
    }

    // 7. WhatsApp
    if (q.includes('whatsapp')) {
      this.openWebApp('https://web.whatsapp.com/');
      return `Opening WhatsApp Web, Boss.`;
    }

    // 8. Google Maps
    if (q.includes('maps') || q.includes('directions to')) {
      const cleanSearch = extractSearchQuery(raw, 'maps');
      const url = cleanSearch.length > 0
        ? `https://www.google.com/maps/search/${encodeURIComponent(cleanSearch)}`
        : 'https://maps.google.com/';
      this.openWebApp(url);
      return cleanSearch.length > 0
        ? `Opening Google Maps for "${cleanSearch}", Boss.`
        : `Opening Google Maps, Boss.`;
    }

    // 9. Google Search
    if (q.startsWith('google') || q.includes('search google') || q.includes('google search')) {
      const cleanSearch = extractSearchQuery(raw, 'google');
      const url = cleanSearch.length > 0
        ? `https://www.google.com/search?q=${encodeURIComponent(cleanSearch)}`
        : 'https://www.google.com/';
      this.openWebApp(url);
      return cleanSearch.length > 0
        ? `Searching Google for "${cleanSearch}", Boss.`
        : `Opening Google, Boss.`;
    }

    // ============================================
    // D. VOLUME CONTROL
    // ============================================
    const setVolMatch = q.match(/(?:set|change|make).*?volume.*?(?:to|at)\s*(\d+)/i) || q.match(/volume.*?(?:to|at)\s*(\d+)/i);
    const upVolMatch = q.match(/(?:increase|raise).*?volume.*?(?:by)?\s*(\d+)/i) || q.match(/volume up(?: by)?\s*(\d+)/i);
    const downVolMatch = q.match(/(?:decrease|lower|reduce|turn down).*?volume.*?(?:by)?\s*(\d+)/i) || q.match(/volume down(?: by)?\s*(\d+)/i);

    if (setVolMatch) {
      try {
        const amount = parseInt(setVolMatch[1], 10);
        await fetch(`${SERVER_URL}/api/system-volume`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'volume-set', amount })
        });
        return `System volume set to ${amount} percent, Boss.`;
      } catch (e) {}
    } else if (upVolMatch) {
      try {
        const amount = parseInt(upVolMatch[1], 10);
        await fetch(`${SERVER_URL}/api/system-volume`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'volume-up', amount })
        });
        return `System volume increased by ${amount} percent, Boss.`;
      } catch (e) {}
    } else if (downVolMatch) {
      try {
        const amount = parseInt(downVolMatch[1], 10);
        await fetch(`${SERVER_URL}/api/system-volume`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'volume-down', amount })
        });
        return `System volume decreased by ${amount} percent, Boss.`;
      } catch (e) {}
    } else if (q.includes('volume up') || q.includes('increase volume') || q.includes('turn it up') || q.includes('make it louder')) {
      try {
        await fetch(`${SERVER_URL}/api/system-volume`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'volume-up', amount: 10 })
        });
        return `System volume increased, Boss.`;
      } catch (e) {}
    } else if (q.includes('volume down') || q.includes('lower volume') || q.includes('turn it down') || q.includes('make it quieter')) {
      try {
        await fetch(`${SERVER_URL}/api/system-volume`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'volume-down', amount: 10 })
        });
        return `System volume lowered, Boss.`;
      } catch (e) {}
    } else if (q.includes('mute audio') || q.includes('mute volume') || q === 'mute' || q.includes('silence')) {
      try {
        await fetch(`${SERVER_URL}/api/system-volume`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mute' })
        });
        return `Audio muted, Boss.`;
      } catch (e) {}
    }

    // ============================================
    // E. GENERIC OPEN APP/URL FALLBACK
    // ============================================
    const genericOpenMatch = q.match(/^(open|launch|go to)\s+(.+)$/i);
    if (genericOpenMatch) {
      const target = genericOpenMatch[2].trim();
      // If it has a dot and no spaces (like youtube.com), treat as url
      if (target.includes('.') && !target.includes(' ')) {
        this.executeMacro([{ type: 'url', target }]);
        return `Opening ${target}, Boss.`;
      } else {
        // Assume it's a desktop app
        this.executeMacro([{ type: 'app', target }]);
        return `Attempting to launch ${target}, Boss.`;
      }
    }

    return null; // Not an OS intent -> fallback to Gemini AI
  }
}

export const osBridge = new OSBridge();
