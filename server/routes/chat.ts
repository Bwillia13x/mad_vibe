import { Router } from "express";
import { generateBusinessResponse, type BusinessChatMessage } from "../lib/openai";
import { generateStreamingBusinessResponse } from "../lib/streaming-openai";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { messages, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    // Validate message format
    const validMessages: BusinessChatMessage[] = messages.map((msg: any) => ({
      role: msg.role === "user" || msg.role === "assistant" ? msg.role : "user",
      content: String(msg.content || "")
    }));

    if (stream) {
      // Set up Server-Sent Events for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      try {
        for await (const chunk of generateStreamingBusinessResponse(validMessages)) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (error) {
        console.error("Streaming error:", error);
        res.write(`data: ${JSON.stringify({ error: "Streaming error occurred" })}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming response (fallback)
      const response = await generateBusinessResponse(validMessages);
      res.json({ 
        message: response,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;