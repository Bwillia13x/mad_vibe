import { Router } from "express";
import { generateBusinessResponse, type BusinessChatMessage } from "../lib/openai";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    // Validate message format
    const validMessages: BusinessChatMessage[] = messages.map((msg: any) => ({
      role: msg.role === "user" || msg.role === "assistant" ? msg.role : "user",
      content: String(msg.content || "")
    }));

    const response = await generateBusinessResponse(validMessages);

    res.json({ 
      message: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;