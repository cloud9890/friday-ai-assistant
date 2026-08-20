export class UIManager {
  constructor() {
    this.chatStream = document.getElementById('chatStream');
    this.btnShareScreen = document.getElementById('btnShareScreen');
    
    // Voice Status Elements
    this.btnMic = document.getElementById('btnMic');
    this.voicePulsar = document.getElementById('voicePulsar');
    this.reactorState = document.getElementById('reactorState');
    this.statusText = document.getElementById('statusText');
    this.voiceBannerText = document.getElementById('voiceBannerText');
  }

  appendChatMessage(author, text) {
    if (!this.chatStream) return;
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

  showThinkingIndicator() {
    if (!this.chatStream) return null;
    const id = `thinking_${crypto.randomUUID()}`;
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

  updateVoiceUIStatus(status) {
    if (this.btnMic) this.btnMic.classList.toggle('listening', status === 'awake' || status === 'speaking');
    if (this.voicePulsar) this.voicePulsar.className = 'voice-indicator-pulsar ' + status;

    if (status === 'awake') {
      if (this.reactorState) this.reactorState.textContent = 'AWAKE';
      if (this.statusText) this.statusText.textContent = 'F.R.I.D.A.Y. AWAKE';
      if (this.voiceBannerText) this.voiceBannerText.textContent = '⚡ F.R.I.D.A.Y. WOKE UP // Processing your command, Boss...';
    } else if (status === 'speaking') {
      if (this.reactorState) this.reactorState.textContent = 'RESPONDING';
      if (this.statusText) this.statusText.textContent = 'F.R.I.D.A.Y. SPEAKING';
      if (this.voiceBannerText) this.voiceBannerText.textContent = 'F.R.I.D.A.Y. responding...';
    } else if (status === 'denied') {
      if (this.reactorState) this.reactorState.textContent = 'MIC BLOCKED';
      if (this.statusText) this.statusText.textContent = 'MIC PERMISSION DENIED';
      if (this.voiceBannerText) this.voiceBannerText.textContent = '⚠️ Microphone blocked by browser. Click "Allow" in browser address bar.';
    } else {
      if (this.reactorState) this.reactorState.textContent = 'STANDBY';
      if (this.statusText) this.statusText.textContent = 'F.R.I.D.A.Y. STANDBY';
      if (this.voiceBannerText) this.voiceBannerText.textContent = '🤫 PASSIVE STANDBY // Say "Friday" or "Hey Friday" to wake me up!';
    }
  }

  activateScreenShareBtn() {
    if (this.btnShareScreen) this.btnShareScreen.classList.add('active');
  }

  deactivateScreenShareBtn() {
    if (this.btnShareScreen) this.btnShareScreen.classList.remove('active');
  }
}
