import OpenAI from "openai";
import { Readable } from "stream";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface BusinessChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function* generateStreamingBusinessResponse(messages: BusinessChatMessage[]): AsyncGenerator<string, void, unknown> {
  try {
    const systemPrompt: BusinessChatMessage = {
      role: "system",
      content: `You are an AI business assistant for Andreas Vibe Business Management platform. You help with:

- Scheduling and appointment management
- Inventory tracking and stock management  
- Staff coordination and performance
- Business analytics and insights
- Administrative tasks and settings

Provide helpful, professional responses focused on business management tasks. When users ask about specific business functions, offer actionable advice and suggest relevant tools or data they might need. Keep responses concise but informative.

If asked about technical features, explain them in business terms. Always be supportive and solution-oriented.`
    };

    const allMessages = [systemPrompt, ...messages];

    const stream = await openai.chat.completions.create({
      model: "gpt-5",
      messages: allMessages,
      max_completion_tokens: 500,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error("OpenAI streaming error:", error);
    yield "I'm experiencing some technical difficulties right now. Please try again in a moment.";
  }
}