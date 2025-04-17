import dotenv from 'dotenv';
dotenv.config();

// Ensure the OpenAI key is set for the SDK
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;

import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.OPENAI_API_KEY,
});

async function testDeepSeek() {
  try {
    const messages = [{ role: "user", content: "9.11 and 9.8, which is greater?" }];
    const response = await openai.chat.completions.create({
      model: "deepseek-reasoner",
      messages,
    });

    const reasoningContent = response.choices[0].message.reasoning_content;
    const finalContent = response.choices[0].message.content;
    console.log("Chain of Thought:", reasoningContent);
    console.log("Final Answer:", finalContent);
  } catch (error) {
    console.error("DeepSeek API test error:", error);
  }
}

testDeepSeek();
