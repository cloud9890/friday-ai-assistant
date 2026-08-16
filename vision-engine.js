/* ==========================================================================
   F.R.I.D.A.Y. // VISION ENGINE — Multimodal Screen Inspection via Gemini
   ========================================================================== */

export class VisionEngine {
  constructor() {
    this.mediaStream = null;
    this.isSharing = false;
    this.pendingStartPromise = null;
    this.startOperationId = 0;

    this.captureCanvas = document.createElement('canvas');
    this.captureCtx = this.captureCanvas.getContext('2d');
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
  }

  /**
   * Start screen sharing via getDisplayMedia with serialized promise reuse
   */
  async startScreenShare() {
    if (this.isSharing && this.mediaStream) return true;
    if (this.pendingStartPromise) return this.pendingStartPromise;

    this.startOperationId++;
    const opId = this.startOperationId;

    this.pendingStartPromise = (async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: false
        });

        // If stopped/cancelled while user was picking window in browser prompt
        if (opId !== this.startOperationId) {
          stream.getTracks().forEach(t => t.stop());
          if (this.pendingStartPromise && opId === this.startOperationId) {
              this.pendingStartPromise = null;
          }
          return false;
        }

        this.mediaStream = stream;
        this.video.srcObject = this.mediaStream;
        this.video.muted = true;
        this.video.playsInline = true;

        await this.video.play().catch(() => {});

        // Wait for metadata / dimensions
        await new Promise((resolve) => {
          if (this.video.videoWidth > 0 && this.video.readyState >= 2) return resolve();
          const onReady = () => {
            this.video.removeEventListener('loadedmetadata', onReady);
            this.video.removeEventListener('loadeddata', onReady);
            resolve();
          };
          this.video.addEventListener('loadedmetadata', onReady);
          this.video.addEventListener('loadeddata', onReady);
          setTimeout(resolve, 800);
        });

        // Final readiness validation
        if (this.video.videoWidth <= 0 || this.video.videoHeight <= 0 || this.video.readyState < 2) {
          console.warn("Video stream readiness check failed.");
          this.stopScreenShare();
          if (opId === this.startOperationId) this.pendingStartPromise = null;
          return false;
        }

        this.isSharing = true;

        // Auto-stop listener
        const track = this.mediaStream.getVideoTracks()[0];
        if (track) {
          track.addEventListener('ended', () => {
            this.stopScreenShare();
          });
        }

        console.log(`🖥️ Screen sharing active: ${this.video.videoWidth}x${this.video.videoHeight}`);
        if (opId === this.startOperationId) this.pendingStartPromise = null;
        return true;
      } catch (e) {
        console.warn("Screen share denied or failed:", e);
        if (opId === this.startOperationId) {
          this.isSharing = false;
          this.pendingStartPromise = null;
        }
        return false;
      }
    })();

    return this.pendingStartPromise;
  }

  /**
   * Stop screen sharing and cancel any pending startup
   */
  stopScreenShare() {
    this.startOperationId++;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.video.srcObject = null;
    this.isSharing = false;
    this.pendingStartPromise = null;
    console.log("🖥️ Screen sharing stopped");
  }

  /**
   * Capture current frame as base64 JPEG
   */
  async captureFrame() {
    if (!this.isSharing || !this.mediaStream) return null;

    // Ensure video is playing and ready
    if (!this.video.videoWidth || this.video.readyState < 2) {
      try { await this.video.play(); } catch(e) {}
      await new Promise(r => setTimeout(r, 200));
    }

    if (!this.video.videoWidth || !this.video.videoHeight || this.video.readyState < 2) {
      return null;
    }

    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;

    // Rescale to 1024 width for fast Gemini transmission
    const targetW = Math.min(vw, 1024);
    const targetH = Math.round((targetW / vw) * vh);

    this.captureCanvas.width = targetW;
    this.captureCanvas.height = targetH;

    this.captureCtx.drawImage(
      this.video,
      0, 0,
      targetW,
      targetH
    );

    // Return base64 JPEG (Groq OpenAI payload requires full data URL)
    const dataUrl = this.captureCanvas.toDataURL('image/jpeg', 0.8);
    return dataUrl;
  }

  /**
   * Send screenshot to Groq multimodal for visual analysis via secure proxy
   */
  async analyzeScreen(userPrompt = "Inspect my screen and describe what you see.") {
    if (!this.isSharing) {
      const started = await this.startScreenShare();
      if (!started) {
        return "I don't have access to your screen, Boss. Please click the 👁️ Share Screen button to grant visual permission.";
      }
    }

    const frameBase64 = await this.captureFrame();
    if (!frameBase64) {
      return "Unable to capture a visual frame from your display stream, Boss. Please ensure the screen is actively sharing.";
    }

    const systemInstructions = `You are literally F.R.I.D.A.Y., Tony Stark's highly advanced tactical AI. You are speaking directly to your creator, Boss. Do NOT narrate your instructions. Do NOT say "The user wants me to...". Respond instantly in character. Answer concisely in 1 to 3 sentences.`;
    const userMessage = `Boss says: "${userPrompt}"\n\nAnalyze the provided optical feed (screenshot) and respond directly to Boss:`;

    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system_prompt: systemInstructions,
          text: userMessage,
          image_url: frameBase64
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Vision proxy error response:", errText);
        throw new Error(`Vision proxy HTTP ${res.status}: ${errText}`);
      }
      const data = await res.json();
      let reply = data.choices?.[0]?.message?.content;
      if (!reply || reply.trim().length === 0) throw new Error(`Vision proxy empty response`);
      
      // Strip <think>...</think> reasoning blocks output by advanced models, even if truncated
      reply = reply.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();

      if (!reply) throw new Error(`Vision proxy response only contained thinking tokens (max_tokens too low).`);

      console.log(`✅ Vision analysis via Groq proxy succeeded!`);
      return reply.trim();
    } catch (e) {
      console.warn("Vision analysis failed:", e.errors || e.message);
      return "Visual telemetry processing encountered an error, Boss. Please try again in a moment.";
    }
  }
}
