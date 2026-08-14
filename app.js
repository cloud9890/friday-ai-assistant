/* ==========================================================================
   F.R.I.D.A.Y. // CORE APPLICATION CONTROLLER & CANVAS VISUALIZER
   ========================================================================== */

import { soundFX } from './sound-fx.js';
import { VoiceEngine } from './voice-engine.js';
import { osBridge } from './os-bridge.js';

class FridayApp {
  constructor() {
    this.voiceEngine = new VoiceEngine();
    
    // Application State
    this.directives = [
      { id: 1, text: "Calibrate suit repulsor arrays", completed: false },
      { id: 2, text: "Run quantum network vulnerability audit", completed: true },
      { id: 3, text: "Verify Malibu mansion perimeter defense", completed: false }
    ];
    this.geminiApiKey = import.meta.env?.VITE_GEMINI_API_KEY || '';
    
    // System Telemetry State
    this.telemetry = {
      suitIntegrity: 100,
      suitCore: 98.4,
      suitShield: 100,
      cpu: 14,
      mem: 42,
      ping: 4
    };

    // Canvas animation vars
    this.arcCanvas = null;
    this.arcCtx = null;
    this.spectrumCanvas = null;
    this.spectrumCtx = null;
    this.animFrameId = null;

    this.initDOM();
    this.initCanvas();
    this.initEventListeners();
    this.initVoiceCallbacks();
    this.startClockTicker();
    this.startTelemetrySimulator();
    this.renderDirectives();

    // Initial F.R.I.D.A.Y. greeting sound
    soundFX.playPowerUp();
    this.verifyGeminiKey();
  }

  async verifyGeminiKey() {
    if (!this.geminiApiKey) {
      console.warn("⚠️ No VITE_GEMINI_API_KEY detected in .env file.");
      return;
    }
    console.log("🔍 Testing Gemini API Key connectivity with Google servers...");
    const testPrompt = "Say: Stark Neural Matrix Online.";
    const result = await this.fetchGeminiResponse(testPrompt);
    if (result) {
      console.log("⚡ [GEMINI STATUS: ONLINE & ACTIVE] -> Response:", result);
    } else {
      console.error("❌ [GEMINI STATUS: FAILED] -> Key is invalid, expired, or rejected by Google Generative AI API.");
    }
  }

  /* ------------------------------------------------------------------------
     DOM INITIALIZATION
     ------------------------------------------------------------------------ */
  initDOM() {
    this.statusBadge = document.getElementById('statusBadge');
    this.statusText = document.getElementById('statusText');
    this.clockDisplay = document.getElementById('clockDisplay');

    this.btnToggleSound = document.getElementById('btnToggleSound');
    this.btnToggleVoice = document.getElementById('btnToggleVoice');

    this.arcCanvas = document.getElementById('arcCanvas');
    this.arcCtx = this.arcCanvas.getContext('2d');

    this.spectrumCanvas = document.getElementById('spectrumCanvas');
    this.spectrumCtx = this.spectrumCanvas.getContext('2d');

    this.reactorState = document.getElementById('reactorState');
    this.voiceBanner = document.getElementById('voiceBanner');
    this.voiceBannerText = document.getElementById('voiceBannerText');
    this.voicePulsar = document.getElementById('voicePulsar');

    this.chatStream = document.getElementById('chatStream');
    this.btnMic = document.getElementById('btnMic');
    this.cmdInput = document.getElementById('cmdInput');
    this.btnSend = document.getElementById('btnSend');

    // Telemetry Elements
    this.suitIntegrityVal = document.getElementById('suitIntegrity');
    this.suitIntegrityBar = document.getElementById('suitIntegrityBar');
    this.suitCoreVal = document.getElementById('suitCore');
    this.suitCoreBar = document.getElementById('suitCoreBar');
    this.suitShieldVal = document.getElementById('suitShield');
    this.suitShieldBar = document.getElementById('suitShieldBar');

    this.cpuVal = document.getElementById('cpuVal');
    this.cpuBar = document.getElementById('cpuBar');
    this.memVal = document.getElementById('memVal');
    this.memBar = document.getElementById('memBar');
    this.pingVal = document.getElementById('pingVal');
    this.pingBar = document.getElementById('pingBar');

    // Directives
    this.directiveInput = document.getElementById('directiveInput');
    this.btnAddDirective = document.getElementById('btnAddDirective');
    this.directiveList = document.getElementById('directiveList');
    this.directiveCount = document.getElementById('directiveCount');

    // Protocols
    this.btnHouseParty = document.getElementById('btnHouseParty');
    this.btnOverride = document.getElementById('btnOverride');
    this.btnOverdrive = document.getElementById('btnOverdrive');
    this.btnScanAll = document.getElementById('btnScanAll');

    this.protocolOverlay = document.getElementById('protocolOverlay');
    this.protocolOverlayTitle = document.getElementById('protocolOverlayTitle');
    this.protocolOverlayDesc = document.getElementById('protocolOverlayDesc');
    this.btnDismissProtocol = document.getElementById('btnDismissProtocol');
  }

  /* ------------------------------------------------------------------------
     CANVAS VISUALIZER (ARC REACTOR & SPECTRUM)
     ------------------------------------------------------------------------ */
  initCanvas() {
    const render = () => {
      this.drawArcReactor();
      this.drawSpectrum();
      this.animFrameId = requestAnimationFrame(render);
    };
    render();
  }

  drawArcReactor() {
    const ctx = this.arcCtx;
    const w = this.arcCanvas.width;
    const h = this.arcCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const time = Date.now() * 0.002;

    ctx.clearRect(0, 0, w, h);

    const isSpeaking = this.voiceEngine.isSpeaking;
    const isListening = this.voiceEngine.isListening;

    let glowColor = 'rgba(0, 240, 255, ';
    if (isSpeaking) glowColor = 'rgba(255, 170, 0, ';
    if (isListening) glowColor = 'rgba(0, 255, 170, ';

    const rad = 65 + (isSpeaking ? Math.sin(time * 10) * 8 : Math.sin(time * 2) * 3);
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, rad + 25);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, glowColor + '0.8)');
    grad.addColorStop(0.7, glowColor + '0.3)');
    grad.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(cx, cy, rad + 20, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    const segments = 10;
    const ringRad = 75;
    for (let i = 0; i < segments; i++) {
      const angle = (i * (Math.PI * 2 / segments)) + (time * 0.5);
      const nx = cx + Math.cos(angle) * ringRad;
      const ny = cy + Math.sin(angle) * ringRad;

      ctx.beginPath();
      ctx.arc(nx, ny, isSpeaking ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isSpeaking ? '#ffaa00' : '#00f0ff';
      ctx.shadowColor = isSpeaking ? '#ffaa00' : '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.strokeStyle = isSpeaking ? 'rgba(255, 170, 0, 0.6)' : 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const startA = (i * Math.PI / 2) + (time * (i % 2 === 0 ? 0.8 : -0.8));
      ctx.beginPath();
      ctx.arc(cx, cy, 105, startA, startA + (Math.PI / 3));
      ctx.stroke();
    }
  }

  drawSpectrum() {
    const ctx = this.spectrumCtx;
    const w = this.spectrumCanvas.width;
    const h = this.spectrumCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const bars = 48;
    const barWidth = w / bars;
    const time = Date.now() * 0.005;

    const isActive = this.voiceEngine.isSpeaking || this.voiceEngine.isListening;

    for (let i = 0; i < bars; i++) {
      let height = isActive 
        ? (Math.sin(i * 0.4 + time * 3) * 0.5 + 0.5) * (h * 0.85) + 3
        : (Math.sin(i * 0.2 + time) * 0.5 + 0.5) * 4 + 2;

      const x = i * barWidth;
      const y = h - height;

      ctx.fillStyle = this.voiceEngine.isSpeaking ? '#ffaa00' : '#00f0ff';
      ctx.fillRect(x + 1, y, barWidth - 2, height);
    }
  }

  /* ------------------------------------------------------------------------
     EVENT LISTENERS & BINDINGS
     ------------------------------------------------------------------------ */
  initEventListeners() {
    this.btnSend.addEventListener('click', () => this.handleUserCommand());
    this.cmdInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleUserCommand();
    });

    this.btnMic.addEventListener('click', async () => {
      soundFX.playClick();
      const listening = await this.voiceEngine.toggleListening();
      this.updateVoiceUIStatus(listening ? 'listening' : 'idle');
    });

    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.dataset.cmd;
        soundFX.playClick();
        this.cmdInput.value = cmd;
        this.handleUserCommand();
      });
    });

    this.btnToggleSound.addEventListener('click', () => {
      soundFX.enabled = !soundFX.enabled;
      this.btnToggleSound.classList.toggle('active', soundFX.enabled);
      if (soundFX.enabled) soundFX.playClick();
    });

    this.btnToggleVoice.addEventListener('click', () => {
      this.voiceEngine.voiceOutputEnabled = !this.voiceEngine.voiceOutputEnabled;
      this.btnToggleVoice.classList.toggle('active', this.voiceEngine.voiceOutputEnabled);
      soundFX.playClick();
    });

    this.btnAddDirective.addEventListener('click', () => this.addDirectiveFromInput());
    this.directiveInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addDirectiveFromInput();
    });

    this.btnHouseParty.addEventListener('click', () => this.triggerProtocol('house-party'));
    this.btnOverride.addEventListener('click', () => this.triggerProtocol('override'));
    this.btnOverdrive.addEventListener('click', () => this.triggerProtocol('overdrive'));
    this.btnScanAll.addEventListener('click', () => this.triggerProtocol('scan-all'));
    this.btnDismissProtocol.addEventListener('click', () => {
      soundFX.playClick();
      this.protocolOverlay.classList.remove('active');
    });
  }

  initVoiceCallbacks() {
    this.voiceEngine.onResultCallback = null;

    this.voiceEngine.onWakeWordCallback = (command) => {
      console.log("⚡ Command to execute:", command);
      const promptToExecute = (command && command.length > 0) ? command : "At your service, Boss.";
      this.cmdInput.value = promptToExecute;
      this.handleUserCommand(promptToExecute);
    };

    this.voiceEngine.onStatusChangeCallback = (status) => {
      this.updateVoiceUIStatus(status);
    };

    const autoActivateMic = () => {
      if (!this.voiceEngine.isListening) {
        this.voiceEngine.startListening();
      }
    };

    autoActivateMic();
    window.addEventListener('click', autoActivateMic);
    window.addEventListener('keydown', autoActivateMic);
    window.addEventListener('mousemove', autoActivateMic, { once: true });
  }

  updateVoiceUIStatus(status) {
    this.btnMic.classList.toggle('listening', status === 'awake' || status === 'speaking');
    this.voicePulsar.className = 'voice-indicator-pulsar ' + status;

    if (status === 'awake') {
      this.reactorState.textContent = 'AWAKE';
      this.statusText.textContent = 'F.R.I.D.A.Y. AWAKE';
      this.voiceBannerText.textContent = '⚡ F.R.I.D.A.Y. WOKE UP // Processing your command, Boss...';
    } else if (status === 'speaking') {
      this.reactorState.textContent = 'RESPONDING';
      this.statusText.textContent = 'F.R.I.D.A.Y. SPEAKING';
      this.voiceBannerText.textContent = 'F.R.I.D.A.Y. responding...';
    } else if (status === 'denied') {
      this.reactorState.textContent = 'MIC BLOCKED';
      this.statusText.textContent = 'MIC PERMISSION DENIED';
      this.voiceBannerText.textContent = '⚠️ Microphone blocked by browser. Click "Allow" in browser address bar.';
    } else {
      this.reactorState.textContent = 'STANDBY';
      this.statusText.textContent = 'F.R.I.D.A.Y. STANDBY';
      this.voiceBannerText.textContent = '🤫 PASSIVE STANDBY // Say "Friday" or "Hey Friday" to wake me up!';
    }
  }

  /* ------------------------------------------------------------------------
     USER COMMAND PROCESSOR & DYNAMIC AI INTELLIGENCE
     ------------------------------------------------------------------------ */
  async handleUserCommand(rawText = null) {
    const text = rawText || this.cmdInput.value.trim();
    if (!text) return;

    this.cmdInput.value = '';
    this.appendChatMessage('user', text);
    soundFX.playClick();

    const clean = text.toLowerCase().replace(/^(friday|hey friday|ok friday|hi friday)[,\s]*/i, '');

    const response = await this.generateAssistantResponse(clean, text);
    this.speakAndLog(response);
  }

  async generateAssistantResponse(clean, original) {
    // 0. Check OS & Web Automation Intents (YouTube, Desktop Apps, Instagram, Essay generation, Volume)
    try {
      const osResponse = await osBridge.parseAndExecute(clean, original, this.geminiApiKey, this.fetchGeminiResponse.bind(this));
      if (osResponse) {
        return osResponse;
      }
    } catch (e) {
      console.warn("OS Automation error:", e);
    }

    // 1. Directives note-taking
    if (clean.startsWith('note down') || clean.startsWith('add directive') || clean.startsWith('remind me')) {
      const taskText = original.replace(/^(friday|hey friday)[,\s]*/i, '').replace(/^(note down|add directive|remind me to|remind me)[,\s]*/i, '');
      if (taskText) {
        this.addDirective(taskText);
        return `Understood, Boss. Added "${taskText}" to your active directives log.`;
      }
    }

    // 2. PRIMARY: Gemini AI Intelligence (Answers any question, conversation, reasoning)
    if (this.geminiApiKey) {
      try {
        console.log("⚡ Querying Gemini AI for:", original);
        const aiResponse = await this.fetchGeminiResponse(original);
        if (aiResponse && aiResponse.trim().length > 0) {
          return aiResponse.trim();
        }
      } catch (e) {
        console.warn("Gemini AI error:", e);
      }
    }

    // 3. Math Calculations
    const mathResult = this.evaluateMath(clean);
    if (mathResult !== null) {
      return `According to my calculations, Boss, the result is ${mathResult}.`;
    }

    // 4. Live Global Knowledge Engine (Wikipedia fallback)
    const topic = clean.replace(/^(what is|who is|tell me about|explain|how does|how do|why is|where is|search for|lookup|define)\s+/i, '').replace(/(\?|\.)$/, '').trim();
    if (topic.length > 1) {
      const liveKnowledge = await this.fetchLiveKnowledge(topic);
      if (liveKnowledge) {
        return liveKnowledge;
      }
    }

    return `I have processed your query regarding "${original}", Boss. All systems register nominal.`;
  }

  async fetchLiveKnowledge(topic) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.extract) {
        const cleanExtract = data.extract.split('. ').slice(0, 2).join('. ') + '.';
        return `According to my knowledge archives, Boss: ${cleanExtract}`;
      }
    } catch (e) {}
    return null;
  }

  evaluateMath(exprStr) {
    try {
      let str = exprStr.toLowerCase()
        .replace(/calculate|what is|how much is|solve/g, '')
        .replace(/percent of/g, '* 0.01 *')
        .replace(/percent/g, '* 0.01')
        .replace(/times|multiplied by|x/g, '*')
        .replace(/divided by|over/g, '/')
        .replace(/plus|and/g, '+')
        .replace(/minus|less/g, '-')
        .trim();

      const sanitized = str.replace(/[^0-9\+\-\*\/\(\)\.\s]/g, '');
      if (sanitized.length > 0 && /[0-9]/.test(sanitized) && /[\+\-\*\/]/.test(sanitized)) {
        const val = Function(`'use strict'; return (${sanitized})`)();
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
          return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2);
        }
      }
    } catch (e) {}
    return null;
  }

  async fetchGeminiResponse(userPrompt) {
    const promptWithPersonality = `You are F.R.I.D.A.Y., Tony Stark's futuristic, intelligent, polite Irish-accented tactical AI assistant. Always address the user as 'Boss'. Answer naturally, concisely, and helpfully in 1 to 3 sentences.\n\nUser request: "${userPrompt}"`;
    const payload = {
      contents: [{ parts: [{ text: promptWithPersonality }] }]
    };

    // Prioritize gemini-flash-latest which is 100% active on your API key
    const models = ['gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.5-flash', 'gemini-3.7-flash'];

    for (const model of models) {
      // Try with URL key parameter
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.geminiApiKey
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply && reply.trim().length > 0) {
            console.log(`✅ Gemini (${model}) Response generated successfully!`);
            return reply.trim();
          }
        }
      } catch (e) {}

      // Try with Bearer Authorization Header
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.geminiApiKey}`
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply && reply.trim().length > 0) {
            console.log(`✅ Gemini (${model}) Response generated via Bearer Auth!`);
            return reply.trim();
          }
        }
      } catch (e) {}
    }

    return null;
  }



  speakAndLog(text) {
    this.appendChatMessage('friday', text);
    this.voiceEngine.speak(text);
  }

  appendChatMessage(author, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg msg-${author}`;

    const authorDiv = document.createElement('div');
    authorDiv.className = 'msg-author';
    authorDiv.textContent = author === 'friday' ? 'F.R.I.D.A.Y.' : 'YOU (BOSS)';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';
    contentDiv.textContent = text;

    const timeDiv = document.createElement('div');
    timeDiv.className = 'msg-time';
    timeDiv.textContent = new Date().toLocaleTimeString();

    msgDiv.appendChild(authorDiv);
    msgDiv.appendChild(contentDiv);
    msgDiv.appendChild(timeDiv);

    this.chatStream.appendChild(msgDiv);
    this.chatStream.scrollTop = this.chatStream.scrollHeight;
  }

  /* ------------------------------------------------------------------------
     DIRECTIVES & TASKS
     ------------------------------------------------------------------------ */
  addDirectiveFromInput() {
    const text = this.directiveInput.value.trim();
    if (!text) return;
    this.directiveInput.value = '';
    this.addDirective(text);
    soundFX.playSuccess();
  }

  addDirective(text) {
    const newDir = { id: Date.now(), text, completed: false };
    this.directives.unshift(newDir);
    this.renderDirectives();
  }

  deleteDirective(id) {
    this.directives = this.directives.filter(d => d.id !== id);
    soundFX.playClick();
    this.renderDirectives();
  }

  toggleDirective(id) {
    const dir = this.directives.find(d => d.id === id);
    if (dir) {
      dir.completed = !dir.completed;
      soundFX.playClick();
      this.renderDirectives();
    }
  }

  renderDirectives() {
    this.directiveList.innerHTML = '';
    const activeCount = this.directives.filter(d => !d.completed).length;
    this.directiveCount.textContent = `${activeCount} ACTIVE`;

    this.directives.forEach(d => {
      const li = document.createElement('li');
      li.className = `directive-item ${d.completed ? 'completed' : ''}`;

      const span = document.createElement('span');
      span.textContent = d.text;
      span.style.cursor = 'pointer';
      span.addEventListener('click', () => this.toggleDirective(d.id));

      const delBtn = document.createElement('button');
      delBtn.className = 'directive-del';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteDirective(d.id);
      });

      li.appendChild(span);
      li.appendChild(delBtn);
      this.directiveList.appendChild(li);
    });
  }

  /* ------------------------------------------------------------------------
     PROTOCOL ACTIONS
     ------------------------------------------------------------------------ */
  triggerProtocol(type) {
    soundFX.playAlert();
    if (type === 'house-party') {
      this.protocolOverlayTitle.textContent = 'HOUSE PARTY PROTOCOL ACTIVATED';
      this.protocolOverlayDesc.textContent = 'Deploying all 42 automated Stark Iron Man Mark armors to Malibu Point coordinates.';
      this.protocolOverlay.classList.add('active');
      this.speakAndLog("House Party Protocol engaged. All available Iron Man armors deployed to your location.");
    } else if (type === 'override') {
      this.protocolOverlayTitle.textContent = 'SYSTEM OVERRIDE ENGAGED';
      this.protocolOverlayDesc.textContent = 'Bypassing automated safeguards. Manual root access granted.';
      this.protocolOverlay.classList.add('active');
      this.speakAndLog("Manual override protocol activated. Security limiters removed.");
    } else if (type === 'overdrive') {
      this.telemetry.suitCore = 120.0;
      this.suitCoreVal.textContent = '120.0 GW';
      this.suitCoreBar.style.width = '100%';
      this.speakAndLog("Repulsor overdrive activated. Energy output increased to 120 Gigawatts.");
    } else if (type === 'scan-all') {
      soundFX.playPowerUp();
      this.speakAndLog("Initiating full multi-spectrum diagnostic scan across suit telemetry, perimeter defenses, and satellite relays.");
    }
  }

  /* ------------------------------------------------------------------------
     TIMERS & TELEMETRY
     ------------------------------------------------------------------------ */
  startClockTicker() {
    const update = () => {
      const now = new Date();
      this.clockDisplay.textContent = now.toTimeString().split(' ')[0];
    };
    update();
    setInterval(update, 1000);
  }

  startTelemetrySimulator() {
    setInterval(async () => {
      const realStats = await osBridge.fetchSystemStats();
      if (realStats) {
        this.telemetry.cpu = realStats.cpuUsagePercent;
        this.telemetry.mem = realStats.memUsagePercent;
      } else {
        this.telemetry.cpu = Math.floor(12 + Math.random() * 8);
        this.telemetry.mem = Math.floor(40 + Math.random() * 5);
      }
      this.telemetry.ping = Math.floor(3 + Math.random() * 3);

      this.cpuVal.textContent = `${this.telemetry.cpu}%`;
      this.cpuBar.style.width = `${this.telemetry.cpu}%`;

      this.memVal.textContent = `${this.telemetry.mem}%`;
      this.memBar.style.width = `${this.telemetry.mem}%`;

      this.pingVal.textContent = `${this.telemetry.ping} ms`;
      this.pingBar.style.width = `${this.telemetry.ping * 4}%`;
    }, 2500);
  }
}

// Instantiate App when DOM loads
window.addEventListener('DOMContentLoaded', () => {
  window.fridayApp = new FridayApp();
});
