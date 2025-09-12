import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface BusinessChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateBusinessResponse(messages: BusinessChatMessage[]): Promise<string> {
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

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: allMessages,
      max_completion_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I apologize, I'm having trouble processing your request right now. Please try again.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "I'm experiencing some technical difficulties right now. Please try again in a moment.";
  }
}

export async function analyzeBusinessData(data: string, analysisType: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a business analytics expert. Analyze the provided data and provide insights for ${analysisType}. Focus on actionable recommendations and key metrics.`
        },
        {
          role: "user",
          content: `Please analyze this business data for ${analysisType}:\n\n${data}`
        }
      ],
      max_completion_tokens: 400,
      temperature: 0.3,
    });

    return response.choices[0].message.content || "Unable to analyze the data at this time.";
  } catch (error) {
    console.error("Business analysis error:", error);
    return "I'm having trouble analyzing the data right now. Please try again.";
  }
}