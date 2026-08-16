/* ==========================================================================
   F.R.I.D.A.Y. // ULTRA-LOW LATENCY VOICE ENGINE (ELEVENLABS + WEBSPEECH)
   ========================================================================== */

import { soundFX } from './sound-fx.js';

export class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis || null;
    
    this.isListening = false;
    this.isAwake = false;
    this.isSpeaking = false;
    this.voiceOutputEnabled = true;
    this.micPermissionGranted = false;
    this.debug = false;

    // Fixed ElevenLabs API Configuration (Bella Voice - EXAVITQu4vr4xnSDxMaL)
    this.elevenLabsVoiceId = import.meta.env?.VITE_ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

    this.currentAudio = null;
    this.currentAudioUrl = null;
    this.wakeTimeout = null;
    this.speakRequestId = 0;
    this.currentAbortController = null;

    this.voices = [];
    this.selectedVoice = null;
    this.pitch = 1.05;
    this.rate = 1.05;

    // Callbacks
    this.onWakeWordCallback = null;
    this.onStatusChangeCallback = null;
    this.onSpeechStartCallback = null;
    this.onSpeechEndCallback = null;

    // Web Audio API Frequency Analyser for real-time Voice Wave Spectrum
    this.audioCtx = null;
    this.analyser = null;
    this.freqData = new Uint8Array(64);
    this.initAudioAnalyser();

    this.initRecognition();
    this.loadVoices();
  }

  initAudioAnalyser() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 128;
        this.analyser.smoothingTimeConstant = 0.8;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      }
    } catch(e) {
      console.warn("AudioContext setup failed:", e);
    }
  }

  attachAudioSource(audioElement) {
    if (!this.audioCtx || !this.analyser || !audioElement) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const source = this.audioCtx.createMediaElementSource(audioElement);
      source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    } catch(e) {
      // Elements might already be connected or CORS restricted
    }
  }

  getFrequencyData() {
    if (this.analyser && this.isSpeaking) {
      this.analyser.getByteFrequencyData(this.freqData);
      let sum = 0;
      for (let i = 0; i < this.freqData.length; i++) sum += this.freqData[i];
      if (sum > 0) return this.freqData;
    }

    // Dynamic voice frequency generator when speaking or listening
    const time = Date.now() * 0.008;
    const count = 32;
    const synthData = new Uint8Array(count);
    const intensity = this.isSpeaking ? 1.0 : (this.isListening ? 0.35 : 0.05);

    for (let i = 0; i < count; i++) {
      if (intensity < 0.1) {
        synthData[i] = Math.max(0, Math.sin(time + i * 0.2) * 8 + 4);
      } else {
        const formant1 = Math.sin(i * 0.4 + time * 3) * 0.5 + 0.5;
        const formant2 = Math.cos(i * 0.7 - time * 5) * 0.5 + 0.5;
        const harmonic = (formant1 * 0.6 + formant2 * 0.4) * 200 * intensity;
        const noise = Math.random() * 40 * intensity;
        synthData[i] = Math.min(255, Math.max(10, harmonic + noise));
      }
    }
    return synthData;
  }

  async requestMicrophonePermission() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        this.micPermissionGranted = true;
        return true;
      }
    } catch (err) {
      console.warn("Microphone access denied:", err);
      this.micPermissionGranted = false;
      return false;
    }
    return false;
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API is not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback(this.isAwake ? 'awake' : 'standby');
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.isListening = false;
        if (this.onStatusChangeCallback) this.onStatusChangeCallback('denied');
        return;
      }
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      this.isListening = false;
      if (this.onStatusChangeCallback) this.onStatusChangeCallback('standby');
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        setTimeout(() => {
          try {
            if (this.isListening) this.recognition.start();
          } catch (e) {}
        }, 150);
      } else {
        if (this.onStatusChangeCallback) this.onStatusChangeCallback('standby');
      }
    };

    this.recognition.onresult = (event) => {
      const lastIdx = event.results.length - 1;
      const transcript = event.results[lastIdx][0].transcript.trim();
      if (!transcript) return;

      if (this.debug) {
        console.log("Speech Result Heard | Awake State:", this.isAwake, "| Speaking:", this.isSpeaking);
      }
      const lower = transcript.toLowerCase();
      const wakeWordMatch = lower.match(/\b(friday|hey friday|ok friday|hi friday|hello friday|stark)\b/i);

      if (wakeWordMatch) {
        // BARGE-IN: If speaking, immediately stop and process new command
        if (this.isSpeaking) {
          if (this.debug) console.log("⚡ BARGE-IN DETECTED — Interrupting speech");
          this.stopSpeaking();
        }

        const matchedWord = wakeWordMatch[0];
        const wordIndex = lower.indexOf(matchedWord);
        const commandAfterWakeWord = transcript.substring(wordIndex + matchedWord.length).replace(/^[,\s]+/, '').trim();

        soundFX.playScan();
        this.isAwake = true;
        if (this.onStatusChangeCallback) this.onStatusChangeCallback('awake');

        if (commandAfterWakeWord.length > 0) {
          if (this.onWakeWordCallback) {
            this.onWakeWordCallback(commandAfterWakeWord);
          }
          this.resetWakeState();
        } else {
          clearTimeout(this.wakeTimeout);
          this.wakeTimeout = setTimeout(() => this.resetWakeState(), 6000);
        }
      } else if (this.isAwake || (this.isSpeaking && lower.match(/\b(stop|quiet|cancel|shut up|pause)\b/))) {
        if (this.isSpeaking) {
          if (this.debug) console.log("⚡ BARGE-IN DETECTED (No Wake Word) — Interrupting speech");
          this.stopSpeaking();
        }
        if (this.onWakeWordCallback) {
          this.onWakeWordCallback(transcript);
        }
        this.resetWakeState();
      }
    };
  }

  resetWakeState() {
    clearTimeout(this.wakeTimeout);
    this.isAwake = false;
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback('standby');
    }
  }

  loadVoices() {
    if (!this.synthesis) return;

    const lockVoice = () => {
      this.voices = this.synthesis.getVoices();
      this.selectedVoice = this.voices.find(v => 
        v.name.includes("Google UK English Female") || 
        v.name.includes("Microsoft Zira") ||
        v.name.includes("Hazel") ||
        (v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
      ) || this.voices[0];
    };

    lockVoice();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = lockVoice;
    }
  }

  async startListening() {
    if (!this.recognition) return false;

    if (!this.micPermissionGranted) {
      await this.requestMicrophonePermission();
    }

    this.isListening = true;
    try {
      this.recognition.start();
      return true;
    } catch (e) {
      return true;
    }
  }

  stopListening() {
    if (!this.recognition) return;
    this.isListening = false;
    this.resetWakeState();
    try {
      this.recognition.stop();
    } catch (e) {}
  }

  async toggleListening() {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return await this.startListening();
    }
  }

  async speak(text) {
    if (!this.voiceOutputEnabled || !text) return;

    // Interrupt any current speech
    this.stopSpeaking();

    const wasListening = this.isListening;
    if (this.recognition && this.isListening) {
      try { this.recognition.stop(); } catch(e) {}
    }

    let played = false;
    this.speakRequestId++;
    const reqId = this.speakRequestId;

    // 1. ElevenLabs AI Voice via secure server endpoint
    if (this.elevenLabsVoiceId) {
      played = await this.speakElevenLabs(text, reqId);
    }

    // 2. If ElevenLabs failed or wasn't available, instant WebSpeech fallback
    if (!played) {
      this.speakWebSpeech(text);
    }

    const checkEnded = setInterval(() => {
      if (!this.isSpeaking) {
        clearInterval(checkEnded);
        this.resetWakeState();
        if (wasListening && !this.isListening) {
          this.startListening();
        } else if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback('standby');
        }
      }
    }, 150);
  }

  async speakElevenLabs(text, reqId) {
    try {
      if (this.currentAbortController) {
        this.currentAbortController.abort();
      }
      this.currentAbortController = new AbortController();

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          voiceId: this.elevenLabsVoiceId
        }),
        signal: this.currentAbortController.signal
      });

      if (!response.ok) {
        console.warn("ElevenLabs API HTTP Error:", response.status);
        return false;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      this.currentAudioUrl = audioUrl;
      this.currentAudio = new Audio(audioUrl);
      this.attachAudioSource(this.currentAudio);

      const cleanupAudioUrl = () => {
        if (this.currentAudioUrl && this.currentAudioUrl === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          this.currentAudioUrl = null;
        }
      };

      this.currentAudio.onplay = () => {
        this.isSpeaking = true;
        if (this.onSpeechStartCallback) this.onSpeechStartCallback();
        if (this.onStatusChangeCallback) this.onStatusChangeCallback('speaking');
      };

      this.currentAudio.onended = () => {
        cleanupAudioUrl();
        this.isSpeaking = false;
        this.resetWakeState();
        if (this.onSpeechEndCallback) this.onSpeechEndCallback();
      };

      this.currentAudio.onerror = (e) => {
        cleanupAudioUrl();
        console.warn("ElevenLabs Audio Error:", e);
        this.isSpeaking = false;
        this.resetWakeState();
        if (this.onSpeechEndCallback) this.onSpeechEndCallback();
      };

      await this.currentAudio.play();
      if (reqId !== this.speakRequestId) {
        this.currentAudio.pause();
        return false;
      }
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
      console.warn("ElevenLabs TTS Timeout/Error -> Falling back to browser speech:", e.message);
      return false;
    }
  }

  speakWebSpeech(text) {
    if (!this.synthesis) return;
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.pitch = this.pitch;
    utterance.rate = this.rate;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onSpeechStartCallback) this.onSpeechStartCallback();
      if (this.onStatusChangeCallback) this.onStatusChangeCallback('speaking');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.resetWakeState();
      if (this.onSpeechEndCallback) this.onSpeechEndCallback();
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.resetWakeState();
      if (this.onSpeechEndCallback) this.onSpeechEndCallback();
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    this.speakRequestId++;
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.isSpeaking = false;
    this.resetWakeState();
  }
}
