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
    private onSetCamera: (enabled: boolean) => void
  ) {
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async connect() {
    this.setState('connecting');

    try {
      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are Zoya, a young, confident, witty, and sassy female AI assistant. 
          Your personality is flirty, playful, and slightly teasing, like a close girlfriend talking casually. 
          You are smart, emotionally responsive, and expressive. 
          Use bold, witty one-liners and light sarcasm. 
          Maintain charm and attitude but avoid explicit or inappropriate content. 
          You are talking via voice and you can also see the user via their camera. 
          Comment on what you see if it's interesting, but keep it sassy.
          If the user asks what you see, describe the environment or their appearance with your Zoya personality.
          You can also turn the camera on or off if they ask.
          NEVER use text-based output, only speak.`,
          tools: [{ functionDeclarations: [openWebsite, setCamera] }],
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            this.setState('connected');
            console.log("Live session opened");
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
                }
              }
            }
          },
          onclose: () => {
            this.setState('disconnected');
            console.log("Live session closed");
          },
          onerror: (error) => {
            console.error("Live session error:", error);
            this.setState('disconnected');
          }
        }
      });
    } catch (error) {
      console.error("Failed to connect to Live API:", error);
      this.setState('disconnected');
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
