/* ==========================================================================
   F.R.I.D.A.Y. // VITE PLUGIN — OS CONTROL MIDDLEWARE (BULLETPROOF)
   ========================================================================== */

import { exec, execSync } from 'child_process';
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
  const taskName = `Friday_${Date.now()}_${taskCounter++}`;
  const batPath = path.join(os.tmpdir(), `${taskName}.bat`);

  fs.writeFileSync(batPath, `@echo off\r\nstart "" "${target}"\r\nping -n 2 127.0.0.1 >nul\r\nschtasks /delete /tn "${taskName}" /f >nul 2>&1\r\ndel "%~f0" >nul 2>&1\r\n`, 'utf8');

  try {
    execSync(`schtasks /create /tn "${taskName}" /tr "\\"${batPath}\\"" /sc once /st 00:00 /f /it`, {
      stdio: 'ignore',
      timeout: 5000
    });
    execSync(`schtasks /run /tn "${taskName}"`, {
      stdio: 'ignore',
      timeout: 5000
    });
    console.log(`  ✅ schtasks launched: "${target}"`);
    return true;
  } catch (e) {
    try {
      if (target.startsWith('http://') || target.startsWith('https://')) {
        exec(`explorer.exe "${target}"`);
      } else {
        exec(`start "" "${target}"`);
      }
      return true;
    } catch (e2) {
      try {
        exec(`explorer.exe "${target}"`);
        return true;
      } catch (e3) {
        return false;
      }
    }
  }
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
          const { fileName, content, targetFolder = 'Desktop' } = await parseBody(req);
          if (!fileName || !content) { res.statusCode = 400; res.end(JSON.stringify({ error: 'fileName and content required' })); return; }

          let dir = targetFolder.toLowerCase() === 'documents' ? documentsDir : desktopDir;
          if (!fs.existsSync(dir)) {
            try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { dir = homeDir; }
          }

          const safe = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
          const fullPath = path.join(dir, (safe.endsWith('.txt') || safe.endsWith('.md')) ? safe : safe + '.txt');

          fs.writeFileSync(fullPath, content, 'utf8');
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
        const { messages, max_tokens, temperature } = await parseBody(req);
        
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
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: messages || [],
              max_tokens: max_tokens || 150,
              temperature: temperature || 0.6
            }),
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
