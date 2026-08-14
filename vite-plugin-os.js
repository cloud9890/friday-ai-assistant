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
      exec(`explorer.exe "${target}"`);
      return true;
    } catch (e2) {
      return false;
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
        const { action } = await parseBody(req);
        let keys = '[char]173';
        let repeat = 1;
        if (action === 'volume-up') { keys = '[char]175'; repeat = 5; }
        else if (action === 'volume-down') { keys = '[char]174'; repeat = 5; }

        const ps = `$w=New-Object -ComObject WScript.Shell;for($i=0;$i -lt ${repeat};$i++){$w.SendKeys(${keys})}`;
        exec(`powershell -Command "${ps}"`);

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

      // --- HEALTH CHECK ---
      server.middlewares.use('/api/health', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok' }));
      });

      console.log('\n🔧 F.R.I.D.A.Y. OS Control Plugin loaded into Vite dev server\n');
    }
  };
}
