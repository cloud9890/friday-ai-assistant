# ⚡ F.R.I.D.A.Y. // Stark Tactical AI Assistant & OS Automation

> ⚠️ **PROJECT STATUS: UNFINISHED & UNDER ACTIVE DEVELOPMENT (WIP)**  
> This project is currently an experimental prototype under active development. Features, API interfaces, OS automation hooks, and voice capabilities are continuously evolving and may undergo major changes.

---

A futuristic, high-tech tactical AI desktop assistant inspired by Tony Stark's **F.R.I.D.A.Y.** (Female Replacement Intelligent Digital Assistant Youth), featuring:
- **Always-On Passive Wake Word Activation** (*"Friday"* / *"Hey Friday"*)
- **Voice Intelligence powered by ElevenLabs & Gemini 2.5 Flash AI**
- **Autonomous OS & Web Automation** (Open desktop apps, search YouTube/Google with filters, download essays, control system volume)
- **Iron Man Arc Reactor Canvas Visualizer & HUD Sound FX (Web Audio API Synthesizer)**
- **Real-Time Windows Hardware Telemetry** (CPU, RAM, Ping)

---

## 🚧 Development Roadmap (In Progress)
- [x] Passive background wake-word listener (*"Friday"*)
- [x] ElevenLabs voice synthesis with Web Speech fallback
- [x] Gemini 2.5 Flash conversational intelligence
- [x] Web app navigation (YouTube latest video filters, Instagram, Spotify, Google Maps, GitHub)
- [x] Automatic essay generator & desktop file saver
- [x] System volume control & real-time hardware telemetry
- [ ] Multi-window workspace management & macro scripts
- [ ] Computer vision screen inspection via multimodal Gemini
- [ ] Cross-platform Linux/macOS support

---

## 🚀 Key Features

### 1. 🎙️ Passive Voice Activation
- Runs a continuous, non-intrusive wake-word listener in the background.
- Activates and records when you say **"Friday"** or **"Hey Friday"**.
- Consistent **ElevenLabs Female Irish Tactical Voice** (with automatic Web Speech fallback).

### 2. ⚡ Autonomous OS & Web Control
- **Desktop Apps**: Automatically launches Windows desktop apps (`Notepad`, `Calculator`, `VS Code`, `Task Manager`, `Paint`, `File Explorer`).
- **Web Navigation & Search**: 
  - *"Friday, open YouTube and search for BBS and play the latest video"*
  - *"Friday, open Instagram"*
  - *"Friday, search Google for quantum mechanics"*
  - *"Friday, open Spotify and search for AC DC"*
- **Essay & Paper Generator**: Automatically generates well-structured essays using Gemini AI and downloads them to your machine.
- **System Audio**: Control master volume (*"Friday, volume up"*, *"Friday, mute audio"*).

### 3. 🛡️ Stark Tactical HUD & Visualizer
- Dynamic animated Canvas **Arc Reactor** with audio waveform reactivity.
- Stark OS Sound FX synthesized in real time with Web Audio API.
- Live directives & task manager with audio confirmation.

---

## 🛠️ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/cloud9890/friday-ai-assistant.git
cd friday-ai-assistant
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start F.R.I.D.A.Y.
```bash
npm run dev
```
Open **`http://127.0.0.1:5173/`** in your browser (Chrome or Edge recommended).

---

## ⚙️ Environment Variables (Optional)
Create a `.env` file in the root directory (see `.env.example`):
```env
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

## 🏗️ Tech Stack
- **Frontend**: Vite, Vanilla JavaScript, Canvas 2D API, Web Audio API, Web Speech API
- **AI Models**: Google Gemini 2.5 Flash, ElevenLabs Voice Synthesis
- **OS Automation**: Vite Custom Middleware, Node.js OS Telemetry, Windows Task Scheduler API
