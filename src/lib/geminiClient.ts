// src/lib/geminiClient.ts
import OpenAI from 'openai';

export const genAI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});
