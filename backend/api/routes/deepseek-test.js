// In your routes/deepseek-test.js file
const express = require('express');
const router = express.Router();
const { OpenAI } = require("openai"); // Using CommonJS syntax for consistency

// Initialize the DeepSeek API client with your env variables
const openai = new OpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/**
 * @route   GET /api/deepseek-test
 * @desc    Test the DeepSeek reasoning API
 * @access  Public
 */
router.get('/deepseek-test', async (req, res) => {
  try {
    const messages = [{ role: "user", content: "9.11 and 9.8, which is greater?" }];
    const response = await openai.chat.completions.create({
      model: "deepseek-reasoner", // using reasoning model (r1) as per your key
      messages,
    });

    const reasoningContent = response.choices[0].message.reasoning_content;
    const finalContent = response.choices[0].message.content;

    res.json({
      reasoningContent,
      finalContent
    });
  } catch (error) {
    console.error("DeepSeek API test error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
