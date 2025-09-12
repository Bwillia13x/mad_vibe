import { Router } from "express";
import { generateBusinessResponse, type BusinessChatMessage } from "../lib/openai";
import { generateStreamingBusinessResponse } from "../lib/streaming-openai";
import { getBusinessContext, getSpecificContext } from "../lib/business-context";

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

    // Generate business context based on the user's message
    console.log('Generating business context for AI assistant...');
    let businessContext: string;
    try {
      // Check if the user is asking about something specific
      const lastUserMessage = validMessages.filter(m => m.role === 'user').pop()?.content.toLowerCase() || '';
      
      if (lastUserMessage.includes('appointment') || lastUserMessage.includes('schedule') || lastUserMessage.includes('booking')) {
        businessContext = await getSpecificContext('appointments');
      } else if (lastUserMessage.includes('inventory') || lastUserMessage.includes('stock') || lastUserMessage.includes('supply')) {
        businessContext = await getSpecificContext('inventory');
      } else if (lastUserMessage.includes('staff') || lastUserMessage.includes('barber') || lastUserMessage.includes('employee')) {
        businessContext = await getSpecificContext('staff');
      } else if (lastUserMessage.includes('analytics') || lastUserMessage.includes('performance') || lastUserMessage.includes('revenue') || lastUserMessage.includes('business')) {
        businessContext = await getSpecificContext('analytics');
      } else {
        // General business context for other queries
        businessContext = await getBusinessContext();
      }
      console.log('Business context generated successfully');
    } catch (error) {
      console.error('Error generating business context:', error);
      businessContext = 'Unable to fetch current business data. Operating with basic business information only.';
    }

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
        for await (const chunk of generateStreamingBusinessResponse(validMessages, businessContext)) {
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
      const response = await generateBusinessResponse(validMessages, businessContext);
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