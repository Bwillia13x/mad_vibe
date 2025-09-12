import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface BusinessChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateBusinessResponse(messages: BusinessChatMessage[]): Promise<string> {
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

  // List of models to try in order of preference
  const modelsToTry = ["gpt-5", "gpt-4o", "gpt-4-turbo", "gpt-4"];

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting non-streaming with model: ${model}`);
      
      const response = await openai.chat.completions.create({
        model: model,
        messages: allMessages,
        max_completion_tokens: 500,
      });

      const content = response.choices[0].message.content;
      if (content) {
        console.log(`Non-streaming successful with model: ${model}`);
        return content;
      }
    } catch (error: any) {
      console.error(`OpenAI API error with model ${model}:`, error?.message || error);
      
      // If this is an organization verification error and we have more models to try, continue
      if (error?.message?.includes("organization") && model !== modelsToTry[modelsToTry.length - 1]) {
        console.log(`Organization verification issue with ${model}, trying next model...`);
        continue;
      }
      
      // If we've exhausted all models or it's a different error, break
      break;
    }
  }

  // Fallback response if all models fail
  console.log("All non-streaming models failed, providing fallback response");
  return "I'm ready to help you with your business management needs! I can assist with scheduling, inventory, staff coordination, analytics, and more. What would you like to work on today?";
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
    });

    return response.choices[0].message.content || "Unable to analyze the data at this time.";
  } catch (error) {
    console.error("Business analysis error:", error);
    return "I'm having trouble analyzing the data right now. Please try again.";
  }
}