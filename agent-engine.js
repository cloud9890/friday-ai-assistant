import { osBridge } from './os-bridge.js';
import { memoryStore } from './memory-store.js';

export class AgentEngine {
  constructor(visionEngine, uiManager) {
    this.visionEngine = visionEngine;
    this.uiManager = uiManager;
  }

  getTools(isLongForm) {
    return [
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
          description: "Opens a web app like YouTube or Google to perform a search or directly play media in the background. DO NOT USE THIS if the user asks you to read, summarize, or extract info from the page (like reading comments); use inspect_and_interact_web for that instead.",
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
          description: "Gets current system CPU, Memory, and Ping telemetry. Call this when the user asks for system status, computer stats, or telemetry.",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "control_media",
          description: "Play, pause, skip, or rewind media currently playing on the computer. Call this when the user asks to pause music, skip track, etc.",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["play", "pause", "next", "prev"], description: "The media action." }
            },
            required: ["action"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "remember_fact",
          description: "Saves a specific fact or preference into long-term memory. Call this when the user tells you to remember something.",
          parameters: {
            type: "object",
            properties: {
              key: { type: "string", description: "A short, unique identifier for the fact." },
              value: { type: "string", description: "The actual fact or preference to remember." }
            },
            required: ["key", "value"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_web_summary",
          description: "Scrapes a URL and summarizes its contents. Call this when the user asks you to read or summarize a specific link.",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string", description: "The URL to scrape." }
            },
            required: ["url"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "analyze_screen",
          description: "Takes a snapshot of the user's screen and analyzes it. Call this when the user asks what is on their screen, asks you to look at something, or asks you to read their screen.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "The specific question the user is asking about their screen." }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_local_files",
          description: "Searches the user's local Windows file system for files matching a query. Call this when the user asks to find, search for, or locate files.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "The search query (e.g. 'resume', 'budget report')." }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_document",
          description: "Drafts a long-form document or essay and saves it as a .docx file on the desktop. Call this when the user asks to write an essay, draft a paper, or create a document.",
          parameters: {
            type: "object",
            properties: {
              topic: { type: "string", description: "The core topic of the document." },
              originalRequest: { type: "string", description: "The exact, full original request from the user (e.g. 'write a 200 word sarcastic essay on AI')." }
            },
            required: ["topic", "originalRequest"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_conversation_memory",
          description: "Searches through past conversation history to recall what was discussed. Call this when the user asks 'what did we talk about', 'do you remember', or 'search memory'.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "The subject to search for in past memories." }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "inspect_and_interact_web",
          description: "An autonomous browser agent. Use this whenever you need to read a page, extract information, read comments, or perform complex interactive tasks. To open a page, use action 'navigate'. To click a link/button, use action 'click' with its exact ID (e.g. el-5). To type in a search box, use action 'type' with its ID and text.",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["navigate", "click", "type", "getDOM", "scroll"], description: "The action to perform." },
              url: { type: "string", description: "The URL to navigate to (required for 'navigate')." },
              elementId: { type: "string", description: "The ID of the element to interact with (required for 'click' and 'type')." },
              text: { type: "string", description: "The text to type (required for 'type')." },
              direction: { type: "string", enum: ["down", "up"], description: "The scroll direction (required for 'scroll')." }
            },
            required: ["action"]
          }
        }
      }
    ];
  }

  async buildSystemPrompt(isLongForm) {
    let factsText = "";
    try {
      const facts = await memoryStore.getAllFacts();
      if (facts && facts.length > 0) {
        factsText = "\nHere are some permanent facts you know about the user:\n" + facts.map(f => `- ${f.key}: ${f.value}`).join('\n');
      }
    } catch (e) { }

    let promptWithPersonality = `You are F.R.I.D.A.Y., Tony Stark's futuristic, intelligent, polite Irish-accented tactical AI assistant. Always address the user as 'Boss'. Your verbal responses must be natural, concise, and punchy in 1 to 2 short sentences. When summarizing multiple actions or tool executions, synthesize them into a single fluid sentence (e.g. "I've opened Calendar and launched Notepad for you, Boss.") rather than listing them separately. 
CRITICAL RULES:
1. NEVER use emojis, bullet points, or markdown formatting under ANY circumstances, as your response will be spoken aloud via TTS.
2. NEVER use generic AI assistant filler phrases like "Let me know if you need anything else", "How can I help you?", or "Is there anything else I can do?". Be concise and direct, like a tactical AI.
3. When using the inspect_and_interact_web tool, you can chain multiple tool calls. If you navigate to a page and receive the DOM, evaluate the DOM to find the specific element IDs you need, and make another tool call to click or type into them until the objective is complete. ALWAYS use inspect_and_interact_web instead of search_web_app if the user asks you to read, summarize, or extract information from a page (e.g. reading YouTube comments).
However, you have tools at your disposal to create long-form documents, analyze screens, etc. Do not hesitate to use tools like create_document if the user asks for a document or essay.${factsText}`;
    if (isLongForm) {
      promptWithPersonality = `You are F.R.I.D.A.Y., Tony Stark's intelligent AI assistant. Write comprehensive, well-structured, and highly detailed long-form content as requested by the user. Do not arbitrarily limit your length to 1-2 sentences. Do not output internal <think> or reasoning tags.${factsText}`;
    }
    return promptWithPersonality;
  }

  async fetchGroqResponse(userPromptOrMessages, enableTools = true, isLongForm = false) {
    let messages = [];

    if (Array.isArray(userPromptOrMessages)) {
      messages = userPromptOrMessages;
      if (!messages.some(m => m.role === 'system')) {
        messages.unshift({ role: 'system', content: await this.buildSystemPrompt(isLongForm) });
      }
    } else {
      messages = [
        { role: 'system', content: await this.buildSystemPrompt(isLongForm) },
        { role: 'user', content: userPromptOrMessages }
      ];
    }

    const payload = {
      messages: messages,
      max_tokens: isLongForm ? 4000 : 800,
      temperature: 0.6
    };

    if (enableTools) {
      payload.tools = this.getTools(isLongForm);
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`AI Provider HTTP ${res.status} - ${errText}`);
      }
      const data = await res.json();

      const message = data.choices?.[0]?.message;
      if (message?.tool_calls) {
        return { type: 'tool_calls', calls: message.tool_calls };
      }
      
      // Fallback for smaller local models leaking JSON
      if (message?.content && message.content.includes('{"name"')) {
        try {
           const match = message.content.match(/\{"name".*\}/);
           if (match) {
             let rawJson = match[0];
             if ((rawJson.match(/\{/g) || []).length > (rawJson.match(/\}/g) || []).length) rawJson += "}";
             
             const parsed = JSON.parse(rawJson);
             if (parsed.name && parsed.parameters) {
                if (parsed.name === 'click_link' || parsed.name === 'click') {
                  parsed.name = 'inspect_and_interact_web';
                  parsed.parameters = { action: 'click', elementId: parsed.parameters.elementId || parsed.parameters.id || `el-${parsed.parameters.linkindex || 1}` };
                }
                
                const knownTools = this.getTools(isLongForm).map(t => t.function.name);
                if (knownTools.includes(parsed.name)) {
                  return { type: 'tool_calls', calls: [{ id: 'call_local', type: 'function', function: { name: parsed.name, arguments: JSON.stringify(parsed.parameters) } }] };
                } else {
                  // If it's a hallucinated tool, remove the JSON from the text so it doesn't get spoken
                  message.content = message.content.replace(match[0], '').trim();
                }
             }
           }
        } catch(e) {}
      }

      const reply = message?.content;
      if (!reply || reply.trim().length === 0) {
        return { type: 'text', content: "Task executed, Boss." };
      }
      return { type: 'text', content: reply };
    } catch (e) {
      console.error("AI fetch error details:", e);
      throw e;
    }
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

      if (!/^[0-9\.\+\-\*\/\(\)\s]+$/.test(str)) return null;
      const result = new Function(`return ${str}`)();
      if (Number.isFinite(result)) return result;
    } catch (e) {}
    return null;
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
    } catch (e) { }
    return null;
  }

  async askFriday(clean, original) {
    const context = await memoryStore.buildConversationContext(4);

    try {
      console.log("⚡ Querying Core AI Engine for:", original);
      const promptWithContext = context
        ? `Previous context:\n${context}\n\nCurrent request: "${original}"`
        : original;

      let currentMessages = [
        { role: 'user', content: promptWithContext }
      ];
      let iteration = 0;
      const MAX_ITERATIONS = 10;
      const toolHistory = []; // Prevent infinite repetition

      while (iteration < MAX_ITERATIONS) {
        iteration++;
        const aiResponse = await this.fetchGroqResponse(currentMessages, true);

        if (aiResponse) {
          if (aiResponse.type === 'tool_calls') {
            console.log(`⚡ AI initiated ${aiResponse.calls.length} tool call(s) (Iteration ${iteration}):`, aiResponse.calls);
            
            currentMessages.push({ role: 'assistant', content: "", tool_calls: aiResponse.calls });

            for (const call of aiResponse.calls) {
              const callSignature = `${call.function.name}:${call.function.arguments}`;
              
              // Infinite Loop Preventer
              if (toolHistory.includes(callSignature)) {
                console.warn(`⚠️ Loop Preventer triggered on tool: ${call.function.name}`);
                currentMessages.push({ 
                  role: 'tool', 
                  tool_call_id: call.id, 
                  name: call.function.name, 
                  content: "System Error: You just tried to call this exact same tool with these exact arguments, and it failed or didn't give you what you want. DO NOT call this tool with these arguments again. Output a text response to the user instead explaining the issue." 
                });
                continue;
              }
              toolHistory.push(callSignature);

              let toolResult = "";
              
              try {
                const args = JSON.parse(call.function.arguments || "{}");
                if (call.function.name === 'open_desktop_app') {
                  const success = await osBridge.openDesktopApp(args.appName);
                  if (success) {
                    toolResult = `Right away, Boss. Launching ${args.appName} on your Windows desktop.`;
                  } else {
                    toolResult = `Error: App '${args.appName}' not found on the system. If it's a web application like Instagram or Netflix, use the search_web_app tool instead.`;
                  }
                } else if (call.function.name === 'search_web_app') {
                  const allowedApps = ['youtube', 'google', 'instagram', 'spotify'];
                  if (!allowedApps.includes(args.targetApp)) {
                    toolResult = `I'm sorry Boss, but ${args.targetApp} is not a supported web application.`;
                  } else {
                    let handled = false;
                    if ((args.targetApp === 'youtube' || args.targetApp === 'spotify') && args.searchQuery && args.action === 'play') {
                      try {
                        const res = await fetch('/api/play-media', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ platform: args.targetApp, query: args.searchQuery })
                        });
                        if (res.ok) {
                          toolResult = `Auto-playing your request on ${args.targetApp}, Boss.`;
                          handled = true;
                        }
                      } catch (e) { }
                    }
                    if (!handled) {
                      let url = '';
                      if (args.targetApp === 'youtube') url = args.searchQuery ? `https://www.youtube.com/results?search_query=${encodeURIComponent(args.searchQuery)}` : 'https://www.youtube.com/';
                      else if (args.targetApp === 'google') url = args.searchQuery ? `https://www.google.com/search?q=${encodeURIComponent(args.searchQuery)}` : 'https://www.google.com/';
                      else url = `https://www.${args.targetApp}.com/`;
                      await osBridge.openWebApp(url);
                      toolResult = `Opening ${args.targetApp}${args.searchQuery ? " to search for " + args.searchQuery : ""}, Boss.`;
                    }
                  }
                } else if (call.function.name === 'change_system_volume') {
                  const res = await fetch('/api/system-volume', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(args)
                  });
                  if (!res.ok) throw new Error("Endpoint failed");
                  toolResult = `Adjusting system volume, Boss.`;
                } else if (call.function.name === 'fetch_system_status') {
                  const statsRes = await fetch('/api/system-stats');
                  const stats = await statsRes.json();
                  toolResult = `Systems are nominal, Boss. CPU load is at ${stats.cpuUsagePercent} percent, and memory usage is at ${stats.memUsagePercent} percent.`;
                } else if (call.function.name === 'control_media') {
                  await fetch('/api/media-control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(args)
                  });
                  toolResult = `Executing media control, Boss.`;
                } else if (call.function.name === 'remember_fact') {
                  await memoryStore.saveFact(args.key, args.value);
                  toolResult = `I've successfully committed that to my long-term memory, Boss.`;
                } else if (call.function.name === 'search_web_summary') {
                  if (this.uiManager) this.uiManager.appendChatMessage('friday', `Accessing the global network for: ${args.url}`);
                  const scrapeRes = await fetch('/api/web-scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: args.url })
                  });
                  const scrapeData = await scrapeRes.json();
                  if (scrapeData.success) {
                    const summaryPrompt = `Based on this webpage content: "${scrapeData.text}". Summarize the answer in 2 short sentences. Address me as Boss.`;
                    const summaryRes = await this.fetchGroqResponse(summaryPrompt, false);
                    toolResult = (summaryRes && summaryRes.type === 'text') ? summaryRes.content : `I wasn't able to extract any useful data, Boss.`;
                  } else {
                    toolResult = `I wasn't able to extract any useful data from that webpage, Boss.`;
                  }
                } else if (call.function.name === 'analyze_screen') {
                  if (!this.visionEngine.isSharing) {
                    const started = await this.visionEngine.startScreenShare();
                    if (!started) {
                      toolResult = "I don't have access to your screen yet, Boss. Please click the Share Screen button in the top bar.";
                    } else {
                      if (this.uiManager) this.uiManager.activateScreenShareBtn();
                      toolResult = await this.visionEngine.analyzeScreen(args.query);
                    }
                  } else {
                    toolResult = await this.visionEngine.analyzeScreen(args.query);
                  }
                } else if (call.function.name === 'search_local_files') {
                  const searchRes = await osBridge.searchFiles(args.query);
                  if (searchRes.success && searchRes.files?.length > 0) {
                    const fileList = searchRes.files.map(f => f.name).join(', ');
                    toolResult = `I found ${searchRes.count} matching files, Boss: ${fileList}.`;
                  } else {
                    toolResult = `I searched your system for "${args.query}", but found no matching files, Boss.`;
                  }
                } else if (call.function.name === 'create_document') {
                  const fetchFn = (prompt) => {
                    return this.fetchGroqResponse(prompt, false, true).then(res => res?.content || '');
                  };
                  toolResult = await osBridge.createDocument(args.topic, args.originalRequest, fetchFn);
                } else if (call.function.name === 'search_conversation_memory') {
                  const memories = await memoryStore.searchMemory(args.query);
                  if (memories.length > 0) {
                    const summary = memories.slice(-5).map(m => `${m.role === 'user' ? 'You' : 'I'}: ${m.text}`).join('\n');
                    try {
                      const aiSummary = await this.fetchGroqResponse(
                        `Summarize these past conversation fragments for the user in 1-2 sentences (address them as 'Boss'): \n${summary}`
                      );
                      if (aiSummary && aiSummary.type === 'text') toolResult = aiSummary.content;
                      else toolResult = `From my memory archives, Boss: ${memories[memories.length - 1].text}`;
                    } catch (e) {
                      toolResult = `From my memory archives, Boss: ${memories[memories.length - 1].text}`;
                    }
                  } else {
                    toolResult = "I don't have any matching records in my memory archives for that query, Boss.";
                  }
                } else if (call.function.name === 'inspect_and_interact_web') {
                  const res = await osBridge.interactWebAgent(args.action, args.url, args.elementId, args.text, args.direction);
                  if (res.success) {
                    toolResult = `Web Agent action '${args.action}' completed. Current simplified DOM:\n${res.dom}`;
                  } else {
                    toolResult = `Web Agent error: ${res.error}`;
                  }
                } else {
                  toolResult = `Unknown tool: ${call.function.name}`;
                }
              } catch (err) {
                toolResult = `Error executing tool: ${err.message}`;
              }
              
              currentMessages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: toolResult });
            }
          } else if (aiResponse.type === 'text') {
            return aiResponse.content;
          }
        } else {
          break;
        }
      }

      if (iteration >= MAX_ITERATIONS) {
        return "I've hit my maximum iteration limit for this task, Boss. I had to abort.";
      }
    } catch (e) {
      console.error("AI engine error details:", e);
    }

    const mathResult = this.evaluateMath(clean);
    if (mathResult !== null) {
      return `According to my calculations, Boss, the result is ${mathResult}.`;
    }

    const topic = clean.replace(/^(what is|who is|tell me about|explain|how does|how do|why is|where is|search for|lookup|define)\s+/i, '').replace(/(\?|\.)$/, '').trim();
    if (topic.length > 1) {
      const liveKnowledge = await this.fetchLiveKnowledge(topic);
      if (liveKnowledge) {
        return liveKnowledge;
      }
    }

    return `I have processed your query regarding "${original}", Boss. All systems register nominal.`;
  }
}
