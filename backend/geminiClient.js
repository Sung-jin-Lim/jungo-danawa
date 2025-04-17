// File: backend/geminiClient.js
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Google Gen AI SDK client (supports Gemini Developer & Vertex AI)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Generates content using Gemini and returns the raw text.
 * @param {string} prompt - The prompt for Gemini to generate from.
 * @returns {Promise<string>} - The generated text.
 */
export async function generateContent(prompt) {
  try {
    // Call the model
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
    });
    // The new SDK returns `response.text` (string)
    return response.text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}