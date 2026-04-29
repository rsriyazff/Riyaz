import { GoogleGenAI, VideoGenerationReferenceType, VideoGenerationReferenceImage } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    // Initial apiKey if available in process.env (for general Gemini tasks)
    this.apiKey = process.env.GEMINI_API_KEY || null;
  }

  private async ensureAi() {
    // For Veo tasks, we prefer the user-selected API key if available
    const userApiKey = localStorage.getItem('ZOYA_USER_API_KEY');
    const selectedKey = (userApiKey && userApiKey !== '')
      ? userApiKey
      : ((process.env.API_KEY && process.env.API_KEY !== 'MY_GEMINI_API_KEY') 
        ? process.env.API_KEY 
        : ((process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') ? process.env.GEMINI_API_KEY : ''));

    if (!selectedKey) {
      throw new Error("No API key available. Please add GEMINI_API_KEY to Secrets in AI Studio or provide one in Zoya settings.");
    }
    
    // Always recreate the AI instance to use the most up-to-date key
    this.ai = new GoogleGenAI({ apiKey: selectedKey });
    this.apiKey = selectedKey;
    return this.ai;
  }

  async generateCinematicVideo(imagePart: { data: string; mimeType: string }, prompt: string) {
    const ai = await this.ensureAi();
    
    try {
      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: prompt,
        image: {
          imageBytes: imagePart.data,
          mimeType: imagePart.mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      return operation;
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        // Trigger re-selection if key is invalid
        if (typeof window !== 'undefined' && (window as any).aistudio?.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
        }
      }
      throw error;
    }
  }

  async getOperationStatus(operation: any) {
    const ai = await this.ensureAi();
    return await ai.operations.getVideosOperation({ operation });
  }

  async fetchVideoBlob(uri: string) {
    if (!this.apiKey) await this.ensureAi();
    
    const response = await fetch(uri, {
      method: 'GET',
      headers: {
        'x-goog-api-key': this.apiKey!,
      },
    });

    if (!response.ok) throw new Error("Failed to download video");
    return await response.blob();
  }

  async describeImage(imageData: string, mimeType: string) {
    const ai = await this.ensureAi();
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: imageData, mimeType } },
          { text: "Describe this image in detail as if you are a cinematic director planning a scene. Focus on lighting, composition, and potential motion. Keep it concise but atmospheric." }
        ]
      }
    });

    return result.text;
  }
}

export const geminiService = new GeminiService();
