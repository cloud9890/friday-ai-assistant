/* ==========================================================================
   F.R.I.D.A.Y. // VITE PLUGIN — OS CONTROL MIDDLEWARE (BULLETPROOF)
   ========================================================================== */

import { exec, execSync, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const homeDir = os.homedir();
// Support both standard Desktop and OneDrive Desktop paths
let desktopDir = path.join(homeDir, 'Desktop');
if (!fs.existsSync(desktopDir) && fs.existsSync(path.join(homeDir, 'OneDrive', 'Desktop'))) {
  desktopDir = path.join(homeDir, 'OneDrive', 'Desktop');
}
let documentsDir = path.join(homeDir, 'Documents');
if (!fs.existsSync(documentsDir) && fs.existsSync(path.join(homeDir, 'OneDrive', 'Documents'))) {
  documentsDir = path.join(homeDir, 'OneDrive', 'Documents');
}

const APP_EXECUTABLES = {
  'notepad': 'notepad.exe',
  'calculator': 'calc.exe',
  'calc': 'calc.exe',
  'vscode': 'code',
  'vs code': 'code',
  'code': 'code',
  'explorer': 'explorer.exe',
  'file explorer': 'explorer.exe',
  'chrome': 'chrome.exe',
  'browser': 'chrome.exe',
  'task manager': 'taskmgr.exe',
  'cmd': 'cmd.exe',
  'command prompt': 'cmd.exe',
  'powershell': 'powershell.exe',
  'paint': 'mspaint.exe',
  'word': 'winword.exe',
  'excel': 'excel.exe',
  'snipping tool': 'snippingtool.exe'
};

let taskCounter = 0;

function findAppShortcut(appName) {
  const pathsToSearch = [
    path.join(homeDir, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(homeDir, 'Desktop'),
    path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop')
  ];

  function searchDir(dirPath) {
    if (!fs.existsSync(dirPath)) return null;
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) {
          const res = searchDir(path.join(dirPath, file.name));
          if (res) return res;
        } else if (file.name.toLowerCase().includes(appName.toLowerCase()) && file.name.toLowerCase().endsWith('.lnk')) {
          return path.join(dirPath, file.name);
        }
      }
    } catch(e) {}
    return null;
  }

  for (const dir of pathsToSearch) {
    const match = searchDir(dir);
    if (match) return match;
  }
  return null;
}

function launchInInteractiveSession(target) {
  return new Promise((resolve) => {
    const cmd = 'powershell.exe';
    const args = ['-Command', `Start-Process '${target.replace(/'/g, "''")}'`];
    
    execFile(cmd, args, { timeout: 10000 }, (err) => {
      if (err) {
        console.warn(`  ❌ Launch failed for "${target}":`, err.message);
        exec(`start "" "${target.replace(/"/g, '""')}"`, (err2) => {
          resolve(!err2);
        });
      } else {
        console.log(`  ✅ Launched: "${target}"`);
        resolve(true);
      }
    });
  });
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { resolve({}); }
    });
  });
}

export default function fridayOSPlugin() {
  return {
    name: 'friday-os-control',
    configureServer(server) {
      // --- OPEN DESKTOP APP ---
      server.middlewares.use('/api/open-app', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const { appName } = await parseBody(req);
        if (!appName) { res.statusCode = 400; res.end(JSON.stringify({ error: 'appName required' })); return; }

        const cleanApp = appName.toLowerCase().trim();
        const exe = APP_EXECUTABLES[cleanApp] || cleanApp;
        console.log(`🚀 F.R.I.D.A.Y. Launching: ${exe}`);

        launchInInteractiveSession(exe);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ success: true, message: `Launched ${cleanApp}` }));
      });

      // --- OPEN URL ---
      server.middlewares.use('/api/open-url', async (req, res) => {
        if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*'); res.statusCode = 200; res.end(); return; }
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const { targetApp, searchQuery } = await parseBody(req);
        let url = '';
        if (targetApp === 'youtube') url = searchQuery ? `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}` : 'https://www.youtube.com/';
        else if (targetApp === 'instagram') url = 'https://www.instagram.com/';
        else if (targetApp === 'google') url = searchQuery ? `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}` : 'https://www.google.com/';
        else url = 'https://www.google.com';

        launchInInteractiveSession(url);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ success: true, url }));
      });

      // --- SAVE FILE ---
      server.middlewares.use('/api/save-file', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const { fileName, content, targetFolder = 'Desktop', format = 'txt' } = await parseBody(req);
          if (!fileName || !content) { res.statusCode = 400; res.end(JSON.stringify({ error: 'fileName and content required' })); return; }

          let dir = targetFolder.toLowerCase() === 'documents' ? documentsDir : desktopDir;
          if (!fs.existsSync(dir)) {
            try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { dir = homeDir; }
          }

          const safe = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
          let fullPath = path.join(dir, safe);

          if (format === 'docx') {
            if (!fullPath.endsWith('.docx')) fullPath += '.docx';
            const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
            
            const paragraphs = content.split('\n').filter(l => l.trim().length > 0).map(line => {
              if (line.startsWith('# ')) return new Paragraph({ text: line.replace('# ', ''), heading: HeadingLevel.HEADING_1 });
              if (line.startsWith('## ')) return new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_2 });
              if (line.startsWith('### ')) return new Paragraph({ text: line.replace('### ', ''), heading: HeadingLevel.HEADING_3 });
              
              // Handle bolding **text** simply
              const parts = line.split(/(\*\*.*?\*\*)/g);
              const children = parts.map(part => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return new TextRun({ text: part.slice(2, -2), bold: true });
                }
                return new TextRun(part);
              });
              return new Paragraph({ children });
            });
            
            const doc = new Document({
              sections: [{ properties: {}, children: paragraphs }]
            });
            const buffer = await Packer.toBuffer(doc);
            fs.writeFileSync(fullPath, buffer);
          } else {
            if (!fullPath.endsWith('.txt') && !fullPath.endsWith('.md')) fullPath += '.txt';
            fs.writeFileSync(fullPath, content, 'utf8');
          }

          console.log(`💾 Saved: ${fullPath}`);
          launchInInteractiveSession(fullPath);

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ success: true, filePath: fullPath }));
        } catch (err) {
          console.error("Save file error:", err);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });

      // --- VOLUME ---
      server.middlewares.use('/api/system-volume', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const { action, amount = 10 } = await parseBody(req);
        
        let arg = 'mute';
        if (action === 'volume-up') arg = 'up';
        else if (action === 'volume-down') arg = 'down';
        else if (action === 'volume-set') arg = 'set';

        const scriptPath = path.join(process.cwd(), 'volume.ps1');
        exec(`powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "${scriptPath}" ${arg} ${amount}`);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ success: true, action }));
      });

      // --- MEDIA CONTROL ---
      server.middlewares.use('/api/media-control', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const { action } = await parseBody(req);
        
        // Use native OS Virtual-Key Codes for global media control
        // 0xB3 (179) = Play/Pause, 0xB0 (176) = Next, 0xB1 (177) = Prev
        let vkCode = 179;
        if (action === 'next') vkCode = 176;
        else if (action === 'prev') vkCode = 177;
        
        const psScript = `
          $code = @"
          using System.Runtime.InteropServices;
          public class Keyboard {
              [DllImport("user32.dll")]
              public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
          }
"@
          Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
          [Keyboard]::keybd_event(${vkCode}, 0, 0, 0)
          [Keyboard]::keybd_event(${vkCode}, 0, 2, 0)
        `;
        
        // Save the script to a temporary file to execute it safely without quoting issues
        const tempScriptPath = path.join(os.tmpdir(), 'media_control.ps1');
        fs.writeFileSync(tempScriptPath, psScript);
        exec(`powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "${tempScriptPath}"`);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ success: true, action }));
      });

      // --- WEB AGENT ---
      server.middlewares.use('/api/web-agent', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const { action, url, elementId, text } = await parseBody(req);
          
          // Import dynamically since web-agent is ESM
          const { navigate, click, type, getSimplifiedDOM } = await import('./web-agent.js');
          
          let result = "";
          if (action === 'navigate') {
            result = await navigate(url);
          } else if (action === 'click') {
            result = await click(elementId);
          } else if (action === 'type') {
            result = await type(elementId, text);
          } else if (action === 'getDOM') {
            result = await getSimplifiedDOM();
          }
          
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ success: true, dom: result }));
        } catch (err) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });

      // --- SYSTEM STATS ---
      server.middlewares.use('/api/system-stats', (req, res) => {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const cpus = os.cpus();
        let idle = 0, total = 0;
        cpus.forEach(c => { for (let t in c.times) total += c.times[t]; idle += c.times.idle; });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({
          cpuUsagePercent: total > 0 ? Math.min(100, Math.max(5, Math.round(100 - (idle / total) * 100))) : 15,
          memUsagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100)
        }));
      });

      // --- WEB SCRAPE / RESEARCH ---
      server.middlewares.use('/api/web-scrape', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const { url } = await parseBody(req);
        try {
           const fetchRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
           let html = await fetchRes.text();
           let text = html.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '')
                          .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, '')
                          .replace(/<\/?[^>]+(>|$)/g, " ")
                          .replace(/\s+/g, " ")
                          .trim();
           text = text.substring(0, 3000);
           res.setHeader('Content-Type', 'application/json');
           res.setHeader('Access-Control-Allow-Origin', '*');
           res.end(JSON.stringify({ success: true, text }));
        } catch(e) {
           res.setHeader('Content-Type', 'application/json');
           res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });

      // --- AUTO-PLAY MEDIA (YOUTUBE SCRAPER) ---
      server.middlewares.use('/api/play-media', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const { query, platform } = await parseBody(req);
        try {
           let finalUrl = '';
           if (platform === 'youtube') {
             // Scrape YouTube search results for the first video ID
             const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
             const fetchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
             const html = await fetchRes.text();
             // Find first video ID
             const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
             if (match && match[1]) {
               finalUrl = `https://www.youtube.com/watch?v=${match[1]}`;
             } else {
               finalUrl = searchUrl; // fallback to search page
             }
           } else if (platform === 'spotify') {
             finalUrl = `spotify:search:${encodeURIComponent(query)}`;
           }
           
           if (finalUrl) {
             const command = process.platform === 'win32' ? `start "" "${finalUrl}"` : process.platform === 'darwin' ? `open "${finalUrl}"` : `xdg-open "${finalUrl}"`;
             exec(command);
           }
           
           res.setHeader('Content-Type', 'application/json');
           res.setHeader('Access-Control-Allow-Origin', '*');
           res.end(JSON.stringify({ success: true, url: finalUrl }));
        } catch(e) {
           res.setHeader('Content-Type', 'application/json');
           res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });

      // --- SECURE TTS PROXY ---
      server.middlewares.use('/api/tts', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const { text, voiceId } = await parseBody(req);
        if (!text || !voiceId) { res.statusCode = 400; res.end(JSON.stringify({ error: 'text and voiceId required' })); return; }
        
        // Read key dynamically (works in Vite plugin context)
        let apiKey = process.env.ELEVENLABS_API_KEY || process.env.VITE_ELEVENLABS_API_KEY;
        if (!apiKey) {
          try {
            const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
            const match = envContent.match(/(?:^|\n)ELEVENLABS_API_KEY=(.*)/);
            if (match) apiKey = match[1].trim();
          } catch(e) {}
        }
        
        if (!apiKey) { res.statusCode = 500; res.end(JSON.stringify({ error: 'Server missing ElevenLabs API key' })); return; }

        try {
          const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=4&output_format=mp3_22050_32`;
          // Use dynamic import for node-fetch if native fetch isn't fully available in all node versions, but Node 18+ has native fetch
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'xi-api-key': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_turbo_v2_5',
              voice_settings: { stability: 0.5, similarity_boost: 0.8 }
            }),
            signal: AbortSignal.timeout(3500)
          });
          
          if (!response.ok) { res.statusCode = response.status; res.end(await response.text()); return; }
          
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Access-Control-Allow-Origin', '*');
          const arrayBuffer = await response.arrayBuffer();
          res.end(Buffer.from(arrayBuffer));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // --- SECURE CHAT PROXY (GROQ) ---
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const { messages, max_tokens, temperature, tools } = await parseBody(req);
        
        let apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          try {
            const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
            const match = envContent.match(/(?:^|\n)GROQ_API_KEY=(.*)/);
            if (match) apiKey = match[1].trim();
          } catch(e) {}
        }
        
        if (!apiKey) { res.statusCode = 500; res.end(JSON.stringify({ error: 'Server missing Groq API key' })); return; }

        try {
          // Automated Tool-Calling Probe (Zero Guesswork)
          let validModel = 'mixtral-8x7b-32768'; // absolute worst-case fallback
          if (!global.cachedValidModel) {
            console.log("⏳ F.R.I.D.A.Y. is aggressively testing all your Groq models for tool-calling support...");
            try {
              const modelsRes = await fetch('https://api.groq.com/openai/v1/models', { 
                headers: { 'Authorization': `Bearer ${apiKey}` },
                signal: AbortSignal.timeout(8000)
              });
              if (!modelsRes.ok) throw new Error("API error");
              const modelsData = await modelsRes.json();
              if (!modelsData || !Array.isArray(modelsData.data)) throw new Error("Invalid response format");
              const availableModels = modelsData.data.map(m => m.id);
            
            for (const model of availableModels) {
              if (model.includes('whisper') || model.includes('vision') || model.includes('guard')) continue;
              
              const testRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: model,
                  messages: [{ role: 'user', content: 'test' }],
                  max_tokens: 10,
                  tools: [{ type: "function", function: { name: "test", description: "test", parameters: { type: "object", properties: {}, required: [] } } }]
                })
              });
              
               if (testRes.ok) {
                 global.cachedValidModel = model;
                 console.log(`✅ SUCCESS! Found compatible tool-calling model: ${model}`);
                 break;
               }
             }
             if (!global.cachedValidModel) {
                console.error("❌ CRITICAL: NO models on your Groq account support tool calling!");
             }
            } catch(e) {
               console.warn("❌ CRITICAL: Models validation failed:", e.message);
            }
          }
          
          validModel = global.cachedValidModel || validModel;

          const payload = {
            model: validModel,
            messages: messages || [],
            max_tokens: max_tokens || 150,
            temperature: temperature || 0.6
          };

          if (tools && tools.length > 0) {
            payload.tools = tools;
            payload.tool_choice = "auto";
          }

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000)
          });
          
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          
          if (!response.ok) { res.statusCode = response.status; res.end(await response.text()); return; }
          const data = await response.json();
          res.end(JSON.stringify(data));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // --- GROQ MODELS DEBUG ROUTE ---
      server.middlewares.use('/api/test-models', async (req, res) => {
        let apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          try {
            const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
            const match = envContent.match(/(?:^|\n)GROQ_API_KEY=(.*)/);
            if (match) apiKey = match[1].trim();
          } catch(e) {}
        }
        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Server missing Groq API key' }));
          return;
        }

        try {
          const mRes = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(8000)
          });
          
          if (!mRes.ok) {
            res.statusCode = mRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(await mRes.text());
            return;
          }

          const mData = await mRes.json();
          if (!mData || !Array.isArray(mData.data)) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid response shape from Groq' }));
            return;
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(mData.data.map(m => m.id)));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // --- SECURE VISION PROXY (GROQ) ---
      server.middlewares.use('/api/vision', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const { image_url, text, system_prompt } = await parseBody(req);
        
        let apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          try {
            const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
            const match = envContent.match(/(?:^|\n)GROQ_API_KEY=(.*)/);
            if (match) apiKey = match[1].trim();
          } catch(e) {}
        }
        
        if (!apiKey) { res.statusCode = 500; res.end(JSON.stringify({ error: 'Server missing Groq API key' })); return; }

        try {
          const targetModel = 'qwen/qwen3.6-27b';

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: targetModel,
              messages: [
                {
                  role: "system",
                  content: system_prompt || "You are a helpful AI assistant."
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: text || "Analyze this screenshot." },
                    { type: "image_url", image_url: { url: image_url } }
                  ]
                }
              ],
              temperature: 0.3,
              max_tokens: 2048
            }),
            signal: AbortSignal.timeout(12000)
          });
          
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          
          if (!response.ok) { res.statusCode = response.status; res.end(await response.text()); return; }
          const data = await response.json();
          res.end(JSON.stringify(data));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // --- SEARCH FILES ---
      server.middlewares.use('/api/search-files', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const { query, folder = 'all' } = await parseBody(req);
        if (typeof query !== 'string' || !query.trim()) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'query required' }));
          return;
        }

        const searchDirs = folder === 'desktop' ? [desktopDir] :
                          folder === 'documents' ? [documentsDir] :
                          [desktopDir, documentsDir, homeDir];

        const matches = [];
        const cleanQ = query.toLowerCase();

        for (const dir of searchDirs) {
          try {
            if (!fs.existsSync(dir)) continue;
            const files = fs.readdirSync(dir);
            for (const f of files) {
              if (f.toLowerCase().includes(cleanQ)) {
                const fullPath = path.join(dir, f);
                const stat = fs.statSync(fullPath);
                matches.push({
                  name: f,
                  path: fullPath,
                  isDir: stat.isDirectory(),
                  sizeBytes: stat.size,
                  modified: stat.mtime
                });
                if (matches.length >= 15) break; // cap results
              }
            }
          } catch (e) {}
          if (matches.length >= 15) break;
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ success: true, count: matches.length, files: matches }));
      });

      // --- EXECUTE MACRO ---
      server.middlewares.use('/api/execute-macro', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const { steps } = await parseBody(req);

        if (!Array.isArray(steps) || steps.length === 0 || steps.length > 20) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'steps must be a non-empty array with at most 20 items' }));
          return;
        }

        let cumulativeDelay = 0;
        for (const step of steps) {
          if (!step || typeof step !== 'object') {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid step object' }));
            return;
          }
          if (step.type === 'app') {
            if (typeof step.target !== 'string' || !step.target.trim()) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'app step requires non-empty string target' }));
              return;
            }
          } else if (step.type === 'url') {
            if (typeof step.target !== 'string' || !step.target.trim()) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'url step requires non-empty string target' }));
              return;
            }
          } else if (step.type === 'delay') {
            const ms = Number(step.ms) || 1000;
            if (ms < 0 || ms > 10000) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'delay ms must be between 0 and 10000' }));
              return;
            }
            cumulativeDelay += ms;
            if (cumulativeDelay > 30000) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'cumulative delay cannot exceed 30000ms' }));
              return;
            }
          } else {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'unknown step type' }));
            return;
          }
        }

        console.log(`🤖 Executing Macro with ${steps.length} steps`);

        const results = [];
        for (const step of steps) {
          if (step.type === 'app') {
            let exe = APP_EXECUTABLES[step.target.toLowerCase()];
            if (exe) {
              launchInInteractiveSession(exe);
              results.push(`Launched ${step.target}`);
            } else {
              const shortcut = findAppShortcut(step.target);
              if (shortcut) {
                launchInInteractiveSession(shortcut);
                results.push(`Launched ${step.target} via shortcut`);
              } else {
                // Silently try powershell hidden start to avoid CMD flash and error dialogs
                try {
                  execSync(`powershell.exe -WindowStyle Hidden -Command "Start-Process '${step.target.replace(/'/g, "''")}' -ErrorAction Stop"`, { stdio: 'ignore', timeout: 5000 });
                  results.push(`Launched ${step.target} via powershell`);
                } catch(e) {
                  results.push(`Failed to launch ${step.target}`);
                }
              }
            }
          } else if (step.type === 'url') {
            let url = step.target.startsWith('http') ? step.target : `https://${step.target}`;
            launchInInteractiveSession(url);
            results.push(`Opened ${url}`);
          } else if (step.type === 'delay') {
            const ms = Number(step.ms) || 1000;
            await new Promise(r => setTimeout(r, ms));
          }
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ success: true, stepsExecuted: results.length, log: results }));
      });

      // --- HEALTH CHECK ---
      server.middlewares.use('/api/health', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok' }));
      });

      console.log('\n🔧 F.R.I.D.A.Y. OS Control Plugin loaded into Vite dev server\n');
    }
  };
}
