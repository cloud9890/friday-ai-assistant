/* ==========================================================================
   F.R.I.D.A.Y. // CONSISTENT VOICE ENGINE (ELEVENLABS + LOCKED WEBSPEECH)
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

    // Fixed ElevenLabs API Configuration (Bella Voice - EXAVITQu4vr4xnSDxMaL)
    this.elevenLabsApiKey = import.meta.env?.VITE_ELEVENLABS_API_KEY || '';
    this.elevenLabsVoiceId = import.meta.env?.VITE_ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

    this.currentAudio = null;
    this.wakeTimeout = null;

    this.voices = [];
    this.selectedVoice = null;
    this.pitch = 1.05;
    this.rate = 1.0;

    // Callbacks
    this.onWakeWordCallback = null;
    this.onStatusChangeCallback = null;
    this.onSpeechStartCallback = null;
    this.onSpeechEndCallback = null;

    this.initRecognition();
    this.loadVoices();
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

      console.log("Speech Result Heard:", transcript, "| Awake State:", this.isAwake);
      const lower = transcript.toLowerCase();
      const wakeWordMatch = lower.match(/\b(friday|hey friday|ok friday|hi friday|hello friday|stark)\b/i);

      if (wakeWordMatch) {
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
      } else if (this.isAwake) {
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
      // Lock strictly to ONE fixed consistent female voice
      this.selectedVoice = this.voices.find(v => 
        v.name.includes("Google UK English Female") || 
        v.name.includes("Microsoft Zira") ||
        v.name.includes("Hazel") ||
        (v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
      ) || this.voices[0];
      console.log("🔒 Locked Fallback Voice:", this.selectedVoice?.name);
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
    if (!this.voiceOutputEnabled) return;

    const wasListening = this.isListening;
    if (this.recognition && this.isListening) {
      try { this.recognition.stop(); } catch(e) {}
    }

    // 1. Exclusively use ElevenLabs AI Voice (Bella - EXAVITQu4vr4xnSDxMaL)
    if (this.elevenLabsApiKey && this.elevenLabsVoiceId) {
      await this.speakElevenLabs(text);
    } else {
      console.warn("ElevenLabs API Key not configured in .env. Falling back only if necessary.");
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
    }, 200);
  }

  async speakElevenLabs(text) {
    try {
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.elevenLabsVoiceId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': this.elevenLabsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.85
          }
        })
      });

      if (!response.ok) {
        console.warn("ElevenLabs API HTTP Error:", response.status, response.statusText);
        return false;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      this.currentAudio = new Audio(audioUrl);

      this.currentAudio.onplay = () => {
        this.isSpeaking = true;
        if (this.onSpeechStartCallback) this.onSpeechStartCallback();
        if (this.onStatusChangeCallback) this.onStatusChangeCallback('speaking');
      };

      this.currentAudio.onended = () => {
        this.isSpeaking = false;
        this.resetWakeState();
        if (this.onSpeechEndCallback) this.onSpeechEndCallback();
      };

      this.currentAudio.onerror = (e) => {
        console.warn("ElevenLabs Audio Playback Error:", e);
        this.isSpeaking = false;
        this.resetWakeState();
        if (this.onSpeechEndCallback) this.onSpeechEndCallback();
      };

      await this.currentAudio.play();
      return true;
    } catch (e) {
      console.warn("ElevenLabs TTS Exception:", e);
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
      console.warn("Speech Synthesis Error:", e);
      this.isSpeaking = false;
      this.resetWakeState();
      if (this.onSpeechEndCallback) this.onSpeechEndCallback();
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.isSpeaking = false;
    this.resetWakeState();
  }
}
