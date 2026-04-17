import { GoogleGenAI } from '@google/genai';

async function test() {
  console.log('API Key type:', typeof process.env.GEMINI_API_KEY, 'length:', process.env.GEMINI_API_KEY?.length);
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Hello'
    });
    console.log('Success:', response.text);
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

test();
