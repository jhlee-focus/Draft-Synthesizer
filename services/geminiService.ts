
import { GoogleGenAI } from "@google/genai";

export const polishManuscript = async (text: string): Promise<string> => {
  // Fix: Initialized GoogleGenAI strictly using process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `다음 원고를 더 매끄럽고 전문적인 문체로 다듬어줘. 문맥을 유지하면서 문장 구조와 어휘를 개선해줘:\n\n${text}`,
      config: {
        temperature: 0.7,
      },
    });
    return response.text || text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return text;
  }
};

export const suggestSynthesis = async (drafts: string[]): Promise<string> => {
    // Fix: Initialized GoogleGenAI strictly using process.env.API_KEY as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `다음 3가지 초안을 하나로 통합하여 가장 완성도 높은 최종 원고를 작성해줘. 각 초안의 장점을 살려서 자연스럽게 연결해줘.\n\n초안 1:\n${drafts[0]}\n\n초안 2:\n${drafts[1]}\n\n초안 3:\n${drafts[2]}`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      return response.text || "AI 통합본을 생성하지 못했습니다.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "오류가 발생했습니다.";
    }
};
