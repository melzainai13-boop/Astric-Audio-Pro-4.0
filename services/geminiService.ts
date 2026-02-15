
import { GoogleGenAI } from "@google/genai";

export const geminiService = {
  async generateSRT(mediaData: string, mimeType: string): Promise<{ srt: string, txt: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: mediaData, mimeType } },
          { text: "Transcribe this media. Output two parts: 1) A standard SRT file content. 2) A clean, plain text transcript without timestamps. Separate them with a clear '---DIVIDER---' line." }
        ]
      },
    });

    const fullText = response.text || "";
    if (!fullText.includes("---DIVIDER---")) {
      return { srt: fullText, txt: fullText.replace(/[\d:,> \n-]{10,}/g, '\n').trim() };
    }
    const [srt, txt] = fullText.split("---DIVIDER---");
    return { srt: srt.trim(), txt: txt.trim() };
  },

  async processText(text: string, mode: string): Promise<{ translation?: string, summary?: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let prompt = "";

    switch (mode) {
      case 'AR_TO_EN':
        prompt = `Translate the following text into fluent English. Output ONLY the translation:\n\n${text}`;
        break;
      case 'EN_TO_AR':
        prompt = `Translate the following text into fluent Arabic (Modern Standard or professional Sudanese). Output ONLY the translation:\n\n${text}`;
        break;
      case 'SUMMARY_ONLY':
        // Updated to summarize in the same language as input
        prompt = `Provide a concise summary and key points for the following text. IMPORTANT: Use the same language as the original text for the summary. If the text is Arabic, summarize in Arabic. If English, summarize in English:\n\n${text}`;
        break;
      case 'TRANS_AND_SUM_AR_EN':
        prompt = `Perform two tasks on this text: 1) Translate it to English. 2) Provide a summary in English. Separate with '---DIVIDER---':\n\n${text}`;
        break;
      case 'TRANS_AND_SUM_EN_AR':
        prompt = `Perform two tasks on this text: 1) Translate it to Arabic. 2) Provide a summary in Arabic. Separate with '---DIVIDER---':\n\n${text}`;
        break;
      default:
        prompt = `Analyze this text:\n\n${text}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const output = response.text || "";
    if (output.includes("---DIVIDER---")) {
      const parts = output.split("---DIVIDER---");
      return { translation: parts[0].trim(), summary: parts[1].trim() };
    }

    if (mode.includes('SUMMARY')) return { summary: output.trim() };
    return { translation: output.trim() };
  }
};
