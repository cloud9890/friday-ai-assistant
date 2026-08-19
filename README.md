# ⚡ F.R.I.D.A.Y. // Stark Tactical AI Assistant & OS Automation

> ⚠️ **PROJECT STATUS: UNFINISHED & UNDER ACTIVE DEVELOPMENT (WIP)**  
> This project is currently an experimental prototype under active development. Features, API interfaces, OS automation hooks, and voice capabilities are continuously evolving and may undergo major changes.

---

A futuristic, high-tech tactical AI desktop assistant inspired by Tony Stark's **F.R.I.D.A.Y.** (Female Replacement Intelligent Digital Assistant Youth), featuring:
- **Always-On Passive Wake Word Activation** (*"Friday"* / *"Hey Friday"*)
- **Voice Intelligence powered by ElevenLabs & Groq AI**
- **Autonomous OS & Web Automation** (Open desktop apps, search YouTube/Google with filters, download essays, control system volume)
- **Real-Time Windows Hardware Telemetry** (CPU, RAM) & **Media Controls** (Play/Pause)
- **Long-Term Persona Memory** (IndexedDB powered permanent facts)

---

## 🛠️ Development Roadmap (In Progress)
- [x] Passive background wake-word listener (*"Friday"*)
- [x] ElevenLabs voice synthesis with Web Speech fallback
- [x] Multi-Turn Agentic ReAct Loop (Groq OpenAI Tool Calling)
- [x] Web app navigation (YouTube, Google) via PowerShell OS hooks
- [x] Automatic long-form document generator (.docx)
- [x] Advanced System volume control & Media playback control
- [x] Real-time system telemetry (CPU/RAM sensors)
- [x] Long-Term Persona Memory (IndexedDB)
- [x] Native local file search
- [ ] Computer vision screen inspection via multimodal models
- [ ] Multi-window workspace management & macro scripts
- [ ] Cross-platform Linux/macOS support

---

## ⚡ Key Features

### 1. 🎙️ Passive Voice Activation
- Runs a continuous, non-intrusive wake-word listener in the background.
- Activates and records when you say **"Friday"** or **"Hey Friday"**.
- Consistent **ElevenLabs Female Irish Tactical Voice** (with automatic Web Speech fallback).

### 2. 🧠 Agentic ReAct Tool Calling (NLU)
- Fully decoupled NLU using Groq's high-speed reasoning models.
- **Multi-Step Execution**: Friday can chain multiple tools organically. For example, she can search the web, store the key facts in memory, and generate a `.docx` summary document—all in a single thought loop.
- **Available Native Tools**:
  - `open_desktop_app`, `search_web_app`, `change_system_volume`, `fetch_system_status`, `search_local_files`, `create_document`, `remember_fact`, `search_conversation_memory`, `analyze_screen`

### 3. 🌐 Autonomous OS & Web Control
- **Desktop Apps**: Automatically launches Windows desktop apps (`Notepad`, `Calculator`, `VS Code`, `Task Manager`).
- **Web Navigation**: Opens and searches browsers seamlessly.
- **Media & System Telemetry**: 
  - *"Friday, pause the music"* (Hardware-level Virtual Key injection)
  - *"Friday, how are our systems holding up?"* (Reads real-time Windows RAM/CPU usage)
- **System Audio**: Control master volume (*"Friday, volume up"*, *"Friday, mute audio"*).

### 4. 💾 Long-Term Persona Memory
- Give her permanent facts: *"Friday, remember that my favorite color is crimson red."*
- She stores this in a local IndexedDB memory core and automatically injects it into her system prompt for all future conversations.

### 5. 🎯 Stark Tactical HUD & Visualizer
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
ELEVENLABS_API_KEY=your_elevenlabs_api_key
GROQ_API_KEY=your_groq_api_key
```

---

## 🏗️ Tech Stack
- **Frontend**: Vite, Vanilla JavaScript, Canvas 2D API, Web Audio API, Web Speech API, IndexedDB
- **AI Models**: Groq (Llama 3.1 70B / Mixtral 8x7B), ElevenLabs Voice Synthesis
- **OS Automation**: Vite Custom Middleware, Node.js OS Telemetry, PowerShell Scripts, System C# P/Invoke APIs
