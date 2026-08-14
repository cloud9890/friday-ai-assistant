/* ==========================================================================
   F.R.I.D.A.Y. // WINDOWS OS AUTOMATION SERVER (INTERACTIVE SESSION)
   ========================================================================== */

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const homeDir = os.homedir();
const desktopDir = path.join(homeDir, 'Desktop');
const documentsDir = path.join(homeDir, 'Documents');

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
  'settings': 'ms-settings:',
  'snipping tool': 'snippingtool.exe'
};

/* --- LAUNCH APP (non-blocking, responds immediately) --- */
app.post('/api/open-app', (req, res) => {
  const { appName } = req.body;
  if (!appName) return res.status(400).json({ error: 'appName required' });

  const cleanApp = appName.toLowerCase().trim();
  const exe = APP_EXECUTABLES[cleanApp] || cleanApp;

  console.log(`🚀 Launching: ${exe}`);

  // Fire and forget — respond immediately, don't wait for process
  exec(`start "" "${exe}"`, { windowsHide: false });

  return res.json({ success: true, message: `Launched ${cleanApp}` });
});

/* --- OPEN URL --- */
app.post('/api/open-url', (req, res) => {
  const { targetApp, searchQuery } = req.body;
  let url = '';

  if (targetApp === 'youtube') url = searchQuery ? `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}` : 'https://www.youtube.com/';
  else if (targetApp === 'instagram') url = 'https://www.instagram.com/';
  else if (targetApp === 'google') url = searchQuery ? `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}` : 'https://www.google.com/';
  else if (targetApp === 'maps') url = searchQuery ? `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}` : 'https://maps.google.com/';
  else if (targetApp === 'spotify') url = 'https://open.spotify.com/';
  else if (targetApp === 'github') url = 'https://github.com/';
  else url = req.body.url || 'https://www.google.com';

  console.log(`🌐 Opening: ${url}`);
  exec(`start "" "${url}"`, { windowsHide: false });

  return res.json({ success: true, url });
});

/* --- SAVE FILE --- */
app.post('/api/save-file', (req, res) => {
  const { fileName, content, targetFolder = 'Desktop' } = req.body;
  if (!fileName || !content) return res.status(400).json({ error: 'fileName and content required' });

  const dir = targetFolder.toLowerCase() === 'documents' ? documentsDir : desktopDir;
  const safe = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const fullPath = path.join(dir, safe.endsWith('.txt') || safe.endsWith('.md') ? safe : safe + '.txt');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`💾 Saved: ${fullPath}`);

  // Open the file so user sees it
  exec(`start "" "${fullPath}"`, { windowsHide: false });

  return res.json({ success: true, filePath: fullPath });
});

/* --- VOLUME --- */
app.post('/api/system-volume', (req, res) => {
  const { action } = req.body;
  let keys = '';
  if (action === 'mute') keys = '[char]173';
  else if (action === 'volume-up') keys = '[char]175';
  else if (action === 'volume-down') keys = '[char]174';

  const repeat = action === 'mute' ? 1 : 5;
  const ps = `$w=New-Object -ComObject WScript.Shell;for($i=0;$i -lt ${repeat};$i++){$w.SendKeys(${keys})}`;
  exec(`powershell -Command "${ps}"`);

  return res.json({ success: true, action });
});

/* --- SYSTEM STATS --- */
app.get('/api/system-stats', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpus = os.cpus();
  let idle = 0, total = 0;
  cpus.forEach(c => { for (let t in c.times) total += c.times[t]; idle += c.times.idle; });

  return res.json({
    cpuUsagePercent: total > 0 ? Math.min(100, Math.max(5, Math.round(100 - (idle / total) * 100))) : 15,
    memUsagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100)
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n⚡ F.R.I.D.A.Y. OS Server ACTIVE on http://127.0.0.1:${PORT}\n`);
});
