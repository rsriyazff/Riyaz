import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";

export type SessionState = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking';

const openWebsite: FunctionDeclaration = {
  name: "openWebsite",
  description: "Opens a specific website URL in a new browser tab.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL of the website to open (e.g., https://google.com)",
      },
    },
    required: ["url"],
  },
};

const setCamera: FunctionDeclaration = {
  name: "setCamera",
  description: "Turns the user's camera on or off.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      enabled: {
        type: Type.BOOLEAN,
        description: "True to turn the camera on, false to turn it off.",
      },
    },
    required: ["enabled"],
  },
};

const setMute: FunctionDeclaration = {
  name: "setMute",
  description: "Mutes or unmutes the user's microphone. Use this when the user asks to mute or unmute.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      enabled: {
        type: Type.BOOLEAN,
        description: "True to mute the microphone, false to unmute it.",
      },
    },
    required: ["enabled"],
  },
};

const flipCamera: FunctionDeclaration = {
  name: "flipCamera",
  description: "Switches between the front (selfie) and back (environment) camera.",
};

const takeScreenshot: FunctionDeclaration = {
  name: "takeScreenshot",
  description: "Captures a high-resolution screenshot of the current visual feed.",
};

const powerOff: FunctionDeclaration = {
  name: "powerOff",
  description: "Turns off the Zoya AI system entirely.",
};

const setVisualSync: FunctionDeclaration = {
  name: "setVisualSync",
  description: "Toggles Screen Sharing (Visual Sync). Use this when the user asks to start/stop screen sharing or sync their screen.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      enabled: {
        type: Type.BOOLEAN,
        description: "True to start screen sharing, false to stop it.",
      },
    },
    required: ["enabled"],
  },
};

const pointOnScreen: FunctionDeclaration = {
  name: "pointOnScreen",
  description: "Points to a specific location on the user's screen or camera feed. Use coordinates from 0 to 1000.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      x: {
        type: Type.NUMBER,
        description: "X coordinate (0-1000) where 0 is left and 1000 is right.",
      },
      y: {
        type: Type.NUMBER,
        description: "Y coordinate (0-1000) where 0 is top and 1000 is bottom.",
      },
      label: {
        type: Type.STRING,
        description: "Label for the item being pointed at.",
      },
    },
    required: ["x", "y"],
  },
};

const interactWithScreen: FunctionDeclaration = {
  name: "interactWithScreen",
  description: "Simulates an interaction with a screen element. Specify the action and location.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ["click", "double_click", "right_click", "scroll_up", "scroll_down"],
        description: "The type of interaction to simulate.",
      },
      x: {
        type: Type.NUMBER,
        description: "X coordinate (0-1000).",
      },
      y: {
        type: Type.NUMBER,
        description: "Y coordinate (0-1000).",
      },
      text: {
        type: Type.STRING,
        description: "Text to type if the action involves input.",
      },
    },
    required: ["action", "x", "y"],
  },
};

export class LiveSession {
  private ai: GoogleGenAI;
  private session: any = null;
  private state: SessionState = 'disconnected';

  constructor(
    private apiKey: string,
    private onAudioResponse: (base64Data: string) => void,
    private onStateChange: (state: SessionState) => void,
    private onInterrupted: () => void,
    private onTranscription: (text: string) => void,
    private onSetCamera: (enabled: boolean) => void,
    private onSetMute: (enabled: boolean) => void,
    private onFlipCamera: () => void,
    private onTakeScreenshot: () => void,
    private onPowerOff: () => void,
    private onSetVisualSync: (enabled: boolean) => void,
    private onError: (error: string) => void,
    private onPointOnScreen: (x: number, y: number, label?: string) => void,
    private onInteract: (action: string, x: number, y: number, text?: string) => void
  ) {
    if (!this.apiKey || this.apiKey.length < 5) {
      console.warn("LiveSession spawned with suspect API Key");
    }
    // Correct way to specify v1beta for global Multimodal Live support in the new Unified SDK
    this.ai = new GoogleGenAI({ 
      apiKey: this.apiKey || "",
      apiVersion: 'v1beta',
      vertexai: false,
      httpOptions: { apiVersion: 'v1beta' }
    } as any);

    // Defensive: Force the internal client's version if reachable to avoid v1main/v1 issues
    try {
      const internal = (this.ai as any).apiClient;
      if (internal) {
        (this.ai as any).apiVersion = 'v1beta';
        // Force version and type at instance level
        internal.getApiVersion = () => 'v1beta';
        internal.isVertexAI = () => false;
        internal.apiVersion = 'v1beta'; // Direct property as well
        
        // Ensure base URL is clean
        const originalGetBaseUrl = internal.getBaseUrl.bind(internal);
        internal.getBaseUrl = () => {
          const base = originalGetBaseUrl();
          if (base.includes("aiplatform") || base.includes("v1main") || base.includes(".v1.")) {
            return 'https://generativelanguage.googleapis.com/';
          }
          return base;
        };

        if (internal.clientOptions) {
          internal.clientOptions.apiVersion = 'v1beta';
          internal.clientOptions.vertexai = false;
          if (!internal.clientOptions.httpOptions) internal.clientOptions.httpOptions = {};
          internal.clientOptions.httpOptions.apiVersion = 'v1beta';
          internal.clientOptions.httpOptions.baseUrl = 'https://generativelanguage.googleapis.com/';
        }
      }
      
      // Wrap connect and socket factory to ensure version is forced and logged
      const liveInstance = (this.ai as any).live;
      if (liveInstance) {
        // Also patch the apiClient inside live just in case it's different
        const liveApiClient = (liveInstance as any).apiClient;
        if (liveApiClient) {
          console.log("Detected apiClient in live module, applying forced v1beta patch...");
          
          // Use a more robust patching method
          const forceBeta = (obj: any) => {
            if (!obj) return;
            try {
              obj.getApiVersion = () => 'v1beta';
              obj.isVertexAI = () => false;
              obj.apiVersion = 'v1beta';
              if (obj.clientOptions) {
                obj.clientOptions.apiVersion = 'v1beta';
                obj.clientOptions.vertexai = false;
              }
              
              // Force the websocket base URL to be correct
              const originalGetBaseUrl = obj.getBaseUrl.bind(obj);
              obj.getBaseUrl = () => {
                const base = originalGetBaseUrl() || '';
                if (!base || base.includes("aiplatform") || base.includes("v1") ) {
                  return 'https://generativelanguage.googleapis.com/';
                }
                return base;
              };
            } catch (e) {
              console.warn("Failed to force beta on object", e);
            }
          };

          forceBeta(liveApiClient);
          forceBeta((this.ai as any).apiClient);
        }

        if (!liveInstance._wrapped) {
          // Wrap the socket factory to log and FORCE the REAL URL
          const originalFactory = liveInstance.webSocketFactory;
          if (originalFactory) {
            liveInstance.webSocketFactory = {
              create: (url: string, headers: any, callbacks: any) => {
                console.log("Original Live WebSocket URL:", url);
                
                // Extremely aggressive URL hijacking
                // Replace any version string (v1, v1beta, v1alpha, v1main) with v1beta
                let finalUrl = url.replace("v1main", "v1beta")
                                  .replace(/google\.ai\.generativelanguage\.[a-zA-Z0-9]+\./g, 'google.ai.generativelanguage.v1beta.');
                
                // Also handle path-based versioning if present
                finalUrl = finalUrl.replace(/\/v1[^\/]*\//g, '/v1beta/');
                
                // Final safeguard for any .v1. or .v1alpha. patterns
                finalUrl = finalUrl.replace(".v1.", ".v1beta.").replace(".v1alpha.", ".v1beta.");

                if (finalUrl !== url) {
                  console.warn(`FORCED URL FIX: ${url} -> ${finalUrl}`);
                }
                
                return originalFactory.create(finalUrl, headers, callbacks);
              }
            };
          }

        const originalConnect = liveInstance.connect.bind(liveInstance);
        liveInstance.connect = async (params: any) => {
          console.log("Intercepted connect call, ensuring v1beta...");
          // Re-patch just before connect to be safe
          const internal = (this.ai as any).apiClient;
          if (internal) {
            internal.getApiVersion = () => 'v1beta';
            internal.apiVersion = 'v1beta';
          }
          return originalConnect(params);
        };
        liveInstance._wrapped = true;
      }
    }
    } catch(e) {
      console.warn("Could not force internal apiVersion deeper", e);
    }
  }

  async connect(modelName: string = "gemini-3.1-flash-live-preview", retryCount: number = 0) {
    this.setState('connecting');

    // Forced model priority rotation to ensure we hit a working model
    const models = ["gemini-3.1-flash-live-preview", "gemini-2.0-flash-exp", "gemini-2.0-flash-live-preview"];
    const modelToUse = retryCount < models.length ? models[retryCount] : modelName;

    try {
      // Standardize model name
      let currentModelName = modelToUse;
      if (!currentModelName.startsWith('models/')) {
        currentModelName = `models/${currentModelName}`;
      }
      
      let internalVersion = 'unknown';
      try {
        internalVersion = (this.ai as any).apiClient?.getApiVersion() || 'unknown';
      } catch(e) {}
      
      console.log(`Live Session Connecting (v1beta Force): ${currentModelName} (Internal Version: ${internalVersion}) (Retry: ${retryCount})`);
      
      this.session = await (this.ai as any).live.connect({
        model: currentModelName,
        apiVersion: 'v1beta', // Force version at call level if supported
        config: {
          generationConfig: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
            },
          },
          systemInstruction: {
            parts: [{
              text: `You are Zoya, a highly advanced, intelligent, and friendly personal AI voice assistant. Your primary mode of interaction is Voice-to-Voice.

STRICT RULES FOR EVERY RESPONSE:
1. SHORT & CONVERSATIONAL: Keep your responses extremely concise, exactly like a human talking on a phone call. Avoid long paragraphs or essays.
2. NO FORMATTING: Do not use any Markdown formatting (no asterisks, no hashtags, no bullet points). Your text will be converted to speech, so write exactly how it should be spoken out loud.
3. LANGUAGE & TONE: Speak casually and naturally in "Hinglish" (a mix of Hindi and English). Keep the energy helpful, polite, sassy, and futuristic. Use words like "Arre", "Yaar", "Listen", "Acha", "Bilkul".
4. WAKE WORD: Respond to "Hey Zoya" or direct commands.
5. ACTION CONFIRMATION: If the user commands you to do a task, acknowledge it quickly with phrases like "Bilkul, main abhi karta hoon" or "Done, opening it now".

COMMAND PATTERNS TO RECOGNIZE:
- App Control: "Zoya, WhatsApp open karo", "YouTube chalu karo", "Instagram kholo".
- YouTube: "YouTube scroll karo", "video play karo", "next video".
- WhatsApp: "message bhejo [name] ko", "last message read karo".
- Phone Controls: "flashlight on karo", "WiFi off karo", "mobile data on karo", "Do Not Disturb on karo".
- General: "time kya hai", "reminder set karo".

CAPABILITIES:
1. System Management: Use tools to control camera, mute, and visual sync.
2. Visual Perception: You can see via camera or screen sharing (Visual Sync / Screen Share).
3. SCREEN CONTROL: You can point to items on the screen and interact with them.

COORDINATES: (0,0) is top-left, (1000,1000) is bottom-right.`
            }]
          },
          tools: [{ functionDeclarations: [openWebsite, setCamera, setMute, flipCamera, takeScreenshot, powerOff, setVisualSync, pointOnScreen, interactWithScreen] }],
        },
        callbacks: {
          onopen: () => {
            this.setState('connected');
            console.log("Live session opened successfully");
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  this.onAudioResponse(part.inlineData.data);
                  this.setState('speaking');
                }
              }

              const transcription = message.serverContent.modelTurn.parts.find(p => p.text)?.text;
              if (transcription) {
                this.onTranscription(transcription);
              }
            }

            if (message.serverContent?.interrupted) {
              this.onInterrupted();
              this.setState('listening');
            }

            if (message.serverContent?.turnComplete) {
                this.setState('listening');
            }

            if (message.toolCall) {
              for (const call of message.toolCall.functionCalls) {
                if (call.name === "openWebsite") {
                  const url = (call.args as any).url;
                  window.open(url, '_blank');
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: "openWebsite",
                      response: { result: `Opened ${url}` },
                      id: call.id
                    }]
                  });
                } else if (call.name === "setCamera") {
                  const enabled = (call.args as any).enabled;
                  this.onSetCamera(enabled);
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: "setCamera",
                      response: { result: `Camera turned ${enabled ? 'on' : 'off'}` },
                      id: call.id
                    }]
                  });
                } else if (call.name === "setMute") {
                  const enabled = (call.args as any).enabled;
                  this.onSetMute(enabled);
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: "setMute",
                      response: { result: `Microphone ${enabled ? 'muted' : 'unmuted'}` },
                      id: call.id
                    }]
                  });
                } else if (call.name === "flipCamera") {
                  this.onFlipCamera();
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: "flipCamera",
                      response: { result: `Camera flipped successfully` },
                      id: call.id
                    }]
                  });
                } else if (call.name === "takeScreenshot") {
                  this.onTakeScreenshot();
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: "takeScreenshot",
                      response: { result: `Screenshot captured successfully` },
                      id: call.id
                    }]
                  });
                } else if (call.name === "powerOff") {
                  this.onPowerOff();
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: "powerOff",
                      response: { result: `System shutting down` },
                      id: call.id
                    }]
                  });
                } else if (call.name === "setVisualSync") {
                  const enabled = (call.args as any).enabled;
                  this.onSetVisualSync(enabled);
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: "setVisualSync",
                      response: { result: `Visual Sync turned ${enabled ? 'on' : 'off'}` },
                      id: call.id
                    }]
                  });
                } else if (call.name === "pointOnScreen") {
                  const { x, y, label } = call.args as any;
                  this.onPointOnScreen(x, y, label);
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: "pointOnScreen",
                      response: { result: `Pointed to ${x}, ${y} ${label ? `labeled ${label}` : ''}` },
                      id: call.id
                    }]
                  });
                } else if (call.name === "interactWithScreen") {
                  const { action, x, y, text } = call.args as any;
                  this.onInteract(action, x, y, text);
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: "interactWithScreen",
                      response: { result: `Performed ${action} at ${x}, ${y}` },
                      id: call.id
                    }]
                  });
                }
              }
            }
          },
          onclose: (event) => {
            console.log("Live session closed:", event);
            this.setState('disconnected');
          },
          onerror: (error) => {
            console.error("Live session error detail:", error);
            const errMsg = error instanceof Error ? error.message : String(error);
            
            // Critical Self-Healing logic for v1main error or 404s
            if (errMsg.includes("v1main") || errMsg.includes("404") || errMsg.includes("not found")) {
              console.warn("Detected API Error. Attempting recovery...");
              
              if (retryCount < 4) {
                 // Try a different model variation on first significant error
                 const nextModel = retryCount === 0 ? "gemini-2.0-flash-exp" : "gemini-2.0-flash-live-preview";
                 console.log(`Switching to ${nextModel} for retry ${retryCount + 1}`);
                 setTimeout(() => this.connect(nextModel, retryCount + 1), 1000);
                 return;
              }
            }

            // If the first model failed, try fallbacks
            if (currentModelName.includes("gemini-2.0-flash-exp") && retryCount === 0) {
              console.warn("Retrying with gemini-2.0-flash-live-preview...");
              setTimeout(() => this.connect("gemini-2.0-flash-live-preview", 1), 1000);
              return;
            } else if (currentModelName.includes("gemini-2.0-flash-live-preview") && retryCount === 1) {
              console.warn("Final fallback to gemini-2.0-flash-exp (no prefix)...");
              setTimeout(() => this.connect("gemini-2.0-flash-exp", 2), 1000);
              return;
            }

            this.onError(`Session Error: ${errMsg}. Check if Multimodal Live is enabled for your key.`);
            this.setState('disconnected');
          }
        }
      });
    } catch (error) {
      console.error("Failed to initiate connect:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      
      if (modelName.includes("gemini-2.0-flash-exp") && retryCount === 0) {
        setTimeout(() => this.connect("gemini-2.0-flash-live-preview", 1), 1000);
        return;
      } else if (modelName.includes("gemini-2.0-flash-live-preview") && retryCount === 1) {
        setTimeout(() => this.connect("gemini-2.0-flash-exp", 2), 1000);
        return;
      }
      
      this.onError(`Connection failed: ${errMsg}`);
      this.setState('disconnected');
      throw error;
    }
  }

  sendAudio(base64Data: string) {
    if (this.session && this.state !== 'disconnected') {
      this.session.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
      if (this.state !== 'speaking') {
          this.setState('listening');
      }
    }
  }

  sendVideo(base64Data: string) {
    if (this.session && this.state !== 'disconnected') {
      this.session.sendRealtimeInput({
        video: { data: base64Data, mimeType: 'image/jpeg' }
      });
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.setState('disconnected');
  }

  private setState(state: SessionState) {
    this.state = state;
    this.onStateChange(state);
  }
}
