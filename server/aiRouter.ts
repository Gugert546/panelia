import express from "express";
import dotenv from "dotenv";
dotenv.config();

import {OpenAI} from "openai";

export const aiRouter = express.Router();

// Load your OpenAI API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

aiRouter.post("/chat", async (req, res) => {
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: "Missing userInput" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1", // Replace with the model you want to use
      messages: [{ role: "user", content: userInput }],
    });

    res.json({ output: response.choices[0].message?.content });
  } catch (error) {
    console.error("OpenAI API error:", error);
    res.status(500).json({ error: "Failed to communicate with OpenAI API" });
  }
});