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
    
    // Check various locations for the API key safely
    let selectedKey = userApiKey || '';
    
    if (!selectedKey || selectedKey === 'undefined') {
      try {
        // @ts-ignore
        const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
        if (envKey && envKey !== 'MY_GEMINI_API_KEY' && envKey !== 'undefined') {
          selectedKey = envKey;
        }
      } catch (e) {}
    }

    if (!selectedKey || selectedKey === 'undefined') {
      throw new Error("No API key available. Please add GEMINI_API_KEY to Secrets in AI Studio or provide one in Zoya settings.");
    }
    
    // Always recreate the AI instance to use the most up-to-date key
    this.ai = new GoogleGenAI({ apiKey: selectedKey });
    this.apiKey = selectedKey;
    return this.ai;
  }

  async generateCinematicVideo(
    prompt: string,
    imagePart?: { data: string; mimeType: string } | null,
    aspectRatio: string = '16:9',
    resolution: string = '1080p'
  ) {
    const ai = await this.ensureAi();
    
    try {
      const payload: any = {
        model: 'veo-3.1-lite-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: resolution,
          aspectRatio: aspectRatio
        }
      };

      if (imagePart && imagePart.data) {
        payload.image = {
          imageBytes: imagePart.data,
          mimeType: imagePart.mimeType,
        };
      }

      const operation = await (ai as any).models.generateVideos(payload);
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
    return await (ai as any).operations.getVideosOperation({ operation });
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
      model: "gemini-2.0-flash-exp", // Correcting futuristic placeholder to actual experimental flash model
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
