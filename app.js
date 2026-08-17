/* ==========================================================================
   F.R.I.D.A.Y. 2.0 // CORE APPLICATION CONTROLLER & HOLOGRAPHIC VISUALIZER
   ========================================================================== */

import { soundFX } from './sound-fx.js';
import { VoiceEngine } from './voice-engine.js';
import { osBridge } from './os-bridge.js';
import { VisionEngine } from './vision-engine.js';
import { memoryStore } from './memory-store.js';

class FridayApp {
  constructor() {
    this.voiceEngine = new VoiceEngine();
    this.visionEngine = new VisionEngine();
    
    // Application State
    this.directives = [
      { id: 1, text: "Calibrate suit repulsor arrays", completed: false },
      { id: 2, text: "Run quantum network vulnerability audit", completed: true },
      { id: 3, text: "Verify Malibu mansion perimeter defense", completed: false }
    ];
    this.aiProviderReady = false;
    
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
    this.loadPersistentData();

    // Initial F.R.I.D.A.Y. greeting sound
    soundFX.playPowerUp();
    this.verifyGroqKey();
  }

  async verifyGroqKey() {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say: Online.' }],
          max_tokens: 10
        }),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        console.log("⚡ [GROQ STATUS: ONLINE & ACTIVE]");
        this.aiProviderReady = true;
      } else {
        console.warn(`⚠️ [GEMINI STATUS: HTTP ${res.status}] — API may have rate limits.`);
      }
    } catch (e) {
      console.warn("⚠️ [GEMINI STATUS: UNREACHABLE]", e.message);
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
     CANVAS VISUALIZER (ARC REACTOR & SPECTRUM) + 3D HOLOGRAM
     ------------------------------------------------------------------------ */
  initCanvas() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const render = () => {
      this.drawArcReactor();
      this.drawSpectrum();
      this.animFrameId = requestAnimationFrame(render);
    };
    render();
  }

  drawArcReactor() {
    if (!this.arcCtx || !this.arcCanvas) return;
    const ctx = this.arcCtx;
    const w = this.arcCanvas.width;
    const h = this.arcCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const time = Date.now() * 0.0015;

    ctx.clearRect(0, 0, w, h);

    const isSpeaking = this.voiceEngine.isSpeaking;
    const isListening = this.voiceEngine.isListening;

    // Get voice frequency data for core pulse
    const freqData = this.voiceEngine.getFrequencyData();
    let avgFreq = 0;
    for (let i = 0; i < freqData.length; i++) avgFreq += freqData[i];
    avgFreq = (avgFreq / freqData.length) / 255;

    let primaryColor = '#00f0ff';
    let glowRgb = '0, 240, 255';
    if (isSpeaking) {
      primaryColor = '#ffaa00';
      glowRgb = '255, 170, 0';
    } else if (isListening) {
      primaryColor = '#00ffaa';
      glowRgb = '0, 255, 170';
    }

    // 1. Central Core Glow Gradient
    const corePulse = 48 + Math.sin(time * 3) * 3 + (avgFreq * 25);
    const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, corePulse + 30);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, `rgba(${glowRgb}, 0.85)`);
    grad.addColorStop(0.65, `rgba(${glowRgb}, 0.25)`);
    grad.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(cx, cy, corePulse + 30, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Outer Rotating HUD Ring (Clockwise)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.5);
    ctx.strokeStyle = `rgba(${glowRgb}, 0.4)`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 102, (i * Math.PI / 2), (i * Math.PI / 2) + Math.PI / 3);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Counter-Rotating Dashed Ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-time * 0.7);
    ctx.strokeStyle = `rgba(${glowRgb}, 0.6)`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 4. 10 Rotating Coils / Repulsor Nodes
    const segments = 10;
    const coilRadius = 72;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.3);

    for (let i = 0; i < segments; i++) {
      const angle = (i * (Math.PI * 2 / segments));
      const nx = Math.cos(angle) * coilRadius;
      const ny = Math.sin(angle) * coilRadius;

      // Draw coil node
      ctx.beginPath();
      ctx.arc(nx, ny, isSpeaking ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = primaryColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 12;
      ctx.fill();

      // Connector line to center
      ctx.beginPath();
      ctx.moveTo(nx * 0.65, ny * 0.65);
      ctx.lineTo(nx * 0.9, ny * 0.9);
      ctx.strokeStyle = `rgba(${glowRgb}, 0.5)`;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }
    ctx.restore();

    // 5. Inner Accent Ring
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${glowRgb}, 0.8)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawSpectrum() {
    if (!this.spectrumCtx || !this.spectrumCanvas) return;
    const ctx = this.spectrumCtx;
    const w = this.spectrumCanvas.width;
    const h = this.spectrumCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const isSpeaking = this.voiceEngine.isSpeaking;
    const isListening = this.voiceEngine.isListening;
    const freqData = this.voiceEngine.getFrequencyData();
    const len = freqData.length;

    let strokeColor = '#00f0ff';
    let fillColor = 'rgba(0, 240, 255, 0.15)';
    if (isSpeaking) {
      strokeColor = '#ffaa00';
      fillColor = 'rgba(255, 170, 0, 0.2)';
    } else if (isListening) {
      strokeColor = '#00ffaa';
      fillColor = 'rgba(0, 255, 170, 0.2)';
    }

    const midY = h / 2;
    const step = w / (len - 1);

    // 1. Draw Equalizer Frequency Bars
    ctx.fillStyle = strokeColor;
    const barW = (w / len) * 0.6;
    for (let i = 0; i < len; i++) {
      const val = (freqData[i] / 255) * (h * 0.75);
      const x = i * (w / len) + 2;
      const barH = Math.max(2, val);
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x, h - barH, barW, barH);
    }
    ctx.globalAlpha = 1.0;

    // 2. Draw Smooth Voice Frequency Waveform Line
    ctx.beginPath();
    ctx.moveTo(0, midY);

    for (let i = 0; i < len; i++) {
      const x = i * step;
      const amplitude = ((freqData[i] - 128) / 128) * (h * 0.42);
      const y = midY - amplitude;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = (i - 1) * step;
        const prevY = midY - (((freqData[i - 1] - 128) / 128) * (h * 0.42));
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
      }
    }

    ctx.lineTo(w, midY);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill underneath wave
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
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

    // Share Screen button for Vision Engine
    const btnShareScreen = document.getElementById('btnShareScreen');
    if (btnShareScreen) {
      btnShareScreen.addEventListener('click', async () => {
        soundFX.playClick();
        if (this.visionEngine.isSharing) {
          this.visionEngine.stopScreenShare();
          btnShareScreen.classList.remove('active');
          this.speakAndLog("Screen sharing deactivated, Boss.");
        } else {
          const started = await this.visionEngine.startScreenShare();
          if (started) {
            btnShareScreen.classList.add('active');
            this.speakAndLog("Visual cortex online. I can now see your screen, Boss. Say 'inspect my screen' for analysis.");
          } else {
            this.speakAndLog("Screen sharing could not be started, Boss. Please check your browser permissions.");
          }
        }
      });
    }

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
    memoryStore.saveMessage('user', text).catch(e => console.warn('Memory save user error:', e));

    // Show immediate thinking placeholder
    const thinkingId = this.showThinkingIndicator();
    this.updateVoiceUIStatus('speaking');

    const clean = text.toLowerCase().replace(/^(friday|hey friday|ok friday|hi friday)[,\s]*/i, '').trim();

    // Explicit barge-in / stop override
    if (clean === 'stop' || clean === 'quiet' || clean === 'cancel' || clean === 'shut up' || clean === 'pause') {
      this.resolveThinkingIndicator(thinkingId, "Standing by, Boss.");
      this.voiceEngine.stopSpeaking();
      return;
    }

    try {
      const response = await this.generateAssistantResponse(clean, text);
      this.resolveThinkingIndicator(thinkingId, response);
      this.voiceEngine.speak(response);
      memoryStore.saveMessage('friday', response).catch(e => console.warn('Memory save assistant error:', e));
    } catch (err) {
      console.error("Assistant execution error:", err);
      const fallback = "Systems are recalibrating, Boss. I encountered a minor telemetry sync delay.";
      this.resolveThinkingIndicator(thinkingId, fallback);
      this.voiceEngine.speak(fallback);
    }
  }

  showThinkingIndicator() {
    const id = `thinking_${Date.now()}`;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg msg-friday thinking';
    msgDiv.id = id;

    const authorDiv = document.createElement('div');
    authorDiv.className = 'msg-author';
    authorDiv.textContent = 'F.R.I.D.A.Y.';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';
    contentDiv.innerHTML = `<span>Processing tactical query</span><span class="thinking-dots"><span></span><span></span><span></span></span>`;

    const timeDiv = document.createElement('div');
    timeDiv.className = 'msg-time';
    timeDiv.textContent = 'ANALYZING...';

    msgDiv.appendChild(authorDiv);
    msgDiv.appendChild(contentDiv);
    msgDiv.appendChild(timeDiv);

    this.chatStream.appendChild(msgDiv);
    this.chatStream.scrollTop = this.chatStream.scrollHeight;
    return id;
  }

  resolveThinkingIndicator(id, finalResponse) {
    const thinkingEl = document.getElementById(id);
    if (thinkingEl) {
      thinkingEl.className = 'chat-msg msg-friday';
      const contentEl = thinkingEl.querySelector('.msg-content');
      if (contentEl) contentEl.textContent = finalResponse;
      const timeEl = thinkingEl.querySelector('.msg-time');
      if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
    } else {
      this.appendChatMessage('friday', finalResponse);
    }
  }

  async generateAssistantResponse(clean, original) {
    // 0. Vision / Screen Inspection
    const isVisionIntent = clean.includes('inspect') || 
                           clean.includes('screen') || 
                           clean.includes('display') || 
                           clean.includes('look at') || 
                           clean.includes('what do you see') || 
                           clean.includes('read my screen') || 
                           clean.includes('analyze') && (clean.includes('this') || clean.includes('screen')) ||
                           clean.includes('check my screen') ||
                           clean.includes('vision');

    if (isVisionIntent) {
      if (!this.visionEngine.isSharing) {
        const btnShareScreen = document.getElementById('btnShareScreen');
        const started = await this.visionEngine.startScreenShare();
        if (!started) {
          return "I don't have access to your screen yet, Boss. Please click the 👁️ Share Screen button in the top bar.";
        }
        if (btnShareScreen) btnShareScreen.classList.add('active');
      }
      return await this.visionEngine.analyzeScreen(original);
    }

    // 0b. Memory recall
    if (clean.includes('what did we') || clean.includes('what were we') ||
        clean.includes('remember when') || clean.includes('recall') ||
        clean.includes('our last conversation') || clean.includes('search memory')) {
      const query = clean.replace(/^(what did we|what were we|remember when|recall|search memory for)\s*/i, '').trim();
      const memories = await memoryStore.searchMemory(query || clean);
      if (memories.length > 0) {
        const summary = memories.slice(-5).map(m => `${m.role === 'user' ? 'You' : 'I'}: ${m.text}`).join('\n');
        try {
          const aiSummary = await this.fetchGroqResponse(
            `Summarize these past conversation fragments for the user in 1-2 sentences (address them as 'Boss'): \n${summary}`
          );
          if (aiSummary && aiSummary.type === 'text') return aiSummary.content;
        } catch (e) {
          console.warn("Memory summary failed:", e);
        }
        
        return `From my memory archives, Boss: ${memories[memories.length - 1].text}`;
      }
      return "I don't have any matching records in my memory archives for that query, Boss.";
    }

    // 1. PRIMARY: Fast Groq AI Intelligence with Tool Calling
    try {
      console.log("⚡ Querying Groq AI for:", original);
      // Build conversation context from memory
      const context = await memoryStore.buildConversationContext(4);
      const promptWithContext = context
        ? `Previous context:\n${context}\n\nCurrent request: "${original}"`
        : original;
      
      const aiResponse = await this.fetchGroqResponse(promptWithContext, true);
      
      if (aiResponse) {
        if (aiResponse.type === 'tool_calls') {
          console.log("⚡ Groq initiated tool call:", aiResponse.calls);
          const call = aiResponse.calls[0];
          const args = JSON.parse(call.function.arguments);
          
          if (call.function.name === 'open_desktop_app') {
            await osBridge.openDesktopApp(args.appName);
            return `Right away, Boss. Launching ${args.appName} on your Windows desktop.`;
          } else if (call.function.name === 'search_web_app') {
            const allowedApps = ['youtube', 'google', 'instagram', 'spotify'];
            if (!allowedApps.includes(args.targetApp)) {
               return `I'm sorry Boss, but ${args.targetApp} is not a supported web application.`;
            }
            // Only auto-play if the intent was explicitly to PLAY media
            if ((args.targetApp === 'youtube' || args.targetApp === 'spotify') && args.searchQuery && args.action === 'play') {
              try {
                const res = await fetch('/api/play-media', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ platform: args.targetApp, query: args.searchQuery })
                });
                if (res.ok) return `Auto-playing your request on ${args.targetApp}, Boss.`;
              } catch(e) {}
            }
            // Fallback for search intent, non-media, or empty queries
            let url = '';
            if (args.targetApp === 'youtube') {
              url = args.searchQuery ? `https://www.youtube.com/results?search_query=${encodeURIComponent(args.searchQuery)}` : 'https://www.youtube.com/';
            } else if (args.targetApp === 'google') {
              url = args.searchQuery ? `https://www.google.com/search?q=${encodeURIComponent(args.searchQuery)}` : 'https://www.google.com/';
            } else {
              url = `https://www.${args.targetApp}.com/`;
            }
            await osBridge.openWebApp(url);
            return `Opening ${args.targetApp}${args.searchQuery ? " to search for " + args.searchQuery : ""}, Boss.`;
          } else if (call.function.name === 'change_system_volume') {
             try {
               const res = await fetch('/api/system-volume', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(args)
               });
               if (!res.ok) throw new Error("Endpoint failed");
               return `Adjusting system volume, Boss.`;
             } catch(e) {
               return `I'm unable to adjust the volume right now, Boss.`;
             }
          } else if (call.function.name === 'fetch_system_status') {
             try {
               const statsRes = await fetch('/api/system-stats');
               const stats = await statsRes.json();
               return `Systems are nominal, Boss. CPU load is at ${stats.cpuUsagePercent} percent, and memory usage is at ${stats.memUsagePercent} percent.`;
             } catch(e) {
               return `I'm unable to connect to the telemetry sensors right now, Boss.`;
             }
          } else if (call.function.name === 'control_media') {
             try {
               await fetch('/api/media-control', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(args)
               });
             } catch(e) {}
             return `Executing media control, Boss.`;
          } else if (call.function.name === 'remember_fact') {
             try {
               await memoryStore.saveFact(args.key, args.value);
               return `I've successfully committed that to my long-term memory, Boss.`;
             } catch(e) {
               return `Memory core failed to write, Boss.`;
             }
          } else if (call.function.name === 'search_web_summary') {
             try {
               this.appendChatMessage('friday', `Accessing the global network for: ${args.url}`);
               const scrapeRes = await fetch('/api/web-scrape', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ url: args.url })
               });
               const scrapeData = await scrapeRes.json();
               if (scrapeData.success) {
                 const summaryPrompt = `Based on this webpage content: "${scrapeData.text}". Summarize the answer in 2 short sentences. Address me as Boss.`;
                 const summaryRes = await this.fetchGroqResponse(summaryPrompt, false);
                 if (summaryRes && summaryRes.type === 'text') return summaryRes.content;
               }
             } catch(e) {}
             return `I wasn't able to extract any useful data from that webpage, Boss.`;
          }
        } else if (aiResponse.type === 'text') {
          // Conversational Fallback
          return aiResponse.content;
        }
      }
    } catch (e) {
      console.error("Groq AI error details:", e);
      // Fall through to local fallback flow
    }

    // 4. Math Calculations
    const mathResult = this.evaluateMath(clean);
    if (mathResult !== null) {
      return `According to my calculations, Boss, the result is ${mathResult}.`;
    }

    // 5. Live Global Knowledge Engine (Wikipedia fallback)
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
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
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

  async fetchGroqResponse(userPrompt, enableTools = false) {
    let factsText = "";
    try {
      const facts = await memoryStore.getAllFacts();
      if (facts && facts.length > 0) {
        factsText = "\nHere are some permanent facts you know about the user:\n" + facts.map(f => `- ${f.key}: ${f.value}`).join('\n');
      }
    } catch(e) {}

    const promptWithPersonality = `You are F.R.I.D.A.Y., Tony Stark's futuristic, intelligent, polite Irish-accented tactical AI assistant. Always address the user as 'Boss'. Answer naturally, concisely, and punchily in 1 to 2 short sentences.${factsText}`;

    const payload = {
      messages: [
        { role: 'system', content: promptWithPersonality },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 150,
      temperature: 0.6
    };

    if (enableTools) {
      payload.tools = [
        {
          type: "function",
          function: {
            name: "open_desktop_app",
            description: "Launches a local Windows desktop application (e.g., notepad, calculator, vscode, chrome).",
            parameters: {
              type: "object",
              properties: {
                appName: { type: "string", description: "The name of the app to launch." }
              },
              required: ["appName"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "search_web_app",
            description: "Opens a web app like YouTube or Google to either perform a search or directly play media.",
            parameters: {
              type: "object",
              properties: {
                targetApp: { type: "string", enum: ["youtube", "google", "instagram", "spotify"], description: "The web app to open." },
                searchQuery: { type: "string", description: "The search query. Leave empty to just open the app." },
                action: { type: "string", enum: ["search", "play"], description: "Whether to just 'search' for the query, or directly 'play' the media (auto-play). Use 'play' when the user explicitly asks to play something." }
              },
              required: ["targetApp"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "change_system_volume",
            description: "Changes the system audio volume.",
            parameters: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["volume-up", "volume-down", "volume-set", "mute"], description: "The volume action." },
                amount: { type: "number", description: "The percentage amount to set or change the volume by (e.g. 10)." }
              },
              required: ["action"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "fetch_system_status",
            description: "Fetches live system telemetry (CPU usage, RAM usage). Call this when the user asks about system status, load, or PC health.",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        },
        {
          type: "function",
          function: {
            name: "control_media",
            description: "Controls playing media on the PC (play, pause, next track, previous track).",
            parameters: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["play-pause", "next", "prev"], description: "The media action." }
              },
              required: ["action"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "search_web_summary",
            description: "Fetches and reads the text content of a webpage to answer a question silently without opening a browser.",
            parameters: {
              type: "object",
              properties: {
                url: { type: "string", description: "The exact URL to read (e.g. https://en.wikipedia.org/wiki/Artificial_intelligence)." }
              },
              required: ["url"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "remember_fact",
            description: "Saves a permanent fact or preference about the user to your long-term memory.",
            parameters: {
              type: "object",
              properties: {
                key: { type: "string", description: "A short, unique identifier for the fact (e.g. 'favorite_color')." },
                value: { type: "string", description: "The actual fact to remember." }
              },
              required: ["key", "value"]
            }
          }
        }
      ];
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq API HTTP ${res.status} - ${errText}`);
      }
      const data = await res.json();
      
      const message = data.choices?.[0]?.message;
      if (message?.tool_calls) {
        return { type: 'tool_calls', calls: message.tool_calls };
      }
      
      const reply = message?.content;
      if (!reply || reply.trim().length === 0) throw new Error(`Groq API empty response`);
      console.log(`✅ Groq responded quickly!`);
      return { type: 'text', content: reply.trim() };
    } catch (e) {
      console.warn("Groq API failed:", e.errors || e.message);
      throw e;
    }
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
     DIRECTIVES & TASKS (with IndexedDB persistence)
     ------------------------------------------------------------------------ */
  async loadPersistentData() {
    // Load directives from IndexedDB
    const saved = await memoryStore.loadDirectives();
    if (saved && saved.length > 0) {
      this.directives = saved;
      console.log(`🧠 Loaded ${saved.length} persistent directives from memory`);
    }
    this.renderDirectives();
  }

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
    memoryStore.saveDirectives(this.directives);
  }

  deleteDirective(id) {
    this.directives = this.directives.filter(d => d.id !== id);
    soundFX.playClick();
    this.renderDirectives();
    memoryStore.saveDirectives(this.directives);
  }

  toggleDirective(id) {
    const dir = this.directives.find(d => d.id === id);
    if (dir) {
      dir.completed = !dir.completed;
      soundFX.playClick();
      this.renderDirectives();
      memoryStore.saveDirectives(this.directives);
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
