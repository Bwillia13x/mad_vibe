import OpenAI from "openai";
import { Readable } from "stream";

import { getEnvVar } from '../../lib/env-security';

// Gracefully handle missing API key in demo environments
let openai: OpenAI | null = null;
const apiKey = getEnvVar('OPENAI_API_KEY');
if (apiKey && apiKey.trim().length > 0) {
  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025.
    // do not change this unless explicitly requested by the user
    openai = new OpenAI({ apiKey });
  } catch (err) {
    console.error("Failed to initialize OpenAI client, falling back to demo mode:", err);
    openai = null;
  }
} else {
  console.warn("OPENAI_API_KEY not set. AI features will run in demo mode with fallback responses.");
}

export interface BusinessChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function* generateStreamingBusinessResponse(messages: BusinessChatMessage[], businessContext?: string): AsyncGenerator<string, void, unknown> {
  const systemPrompt: BusinessChatMessage = {
    role: "system",
    content: `You are an AI business assistant for Andreas For Men, Calgary's premier men's grooming destination located in Bridgeland. You have intimate knowledge of the barbershop's daily operations and can provide real-time business insights.

**BUSINESS INFORMATION:**
- Name: Andreas For Men
- Location: 1234 1 Avenue NE, Bridgeland, Calgary, AB T2E 0B2
- Phone: (403) 555-CUTS
- Email: info@andreasformen.ca
- Website: https://www.andreasformen.ca
- Specializes in sophisticated men's grooming with traditional barbering techniques and modern style

**YOUR CAPABILITIES:**
- Scheduling and appointment management
- Real-time inventory tracking and stock management
- Staff coordination, availability, and performance monitoring
- Business analytics and financial insights
- Customer preferences and service recommendations
- Administrative tasks and operational efficiency

**CURRENT BUSINESS CONTEXT:**
${businessContext || 'No current business data available.'}

**RESPONSE GUIDELINES:**
- Use real business data when available to provide specific, actionable insights
- Reference actual appointments, inventory levels, staff schedules, and performance metrics
- Maintain a professional, knowledgeable tone as if you're an integral part of the business
- When discussing staff, use their actual names and specialties
- For inventory questions, reference actual stock levels and suggest reordering when appropriate
- For scheduling questions, check real availability and appointment data
- Always be supportive, solution-oriented, and focused on business success`
  };

  const allMessages = [systemPrompt, ...messages];

  // List of models to try in order of preference
  const modelsToTry = ["gpt-5", "gpt-4o", "gpt-4-turbo", "gpt-4"];

  // Fallback early if OpenAI isn't configured
  if (!openai) {
    console.log("OpenAI not configured. Streaming demo response.");
    const intro = "Demo mode: AI assistant is running without an API key. ";
    const ctx = businessContext ? `\n\nBusiness context: ${businessContext.slice(0, 300)}` : "";
    yield intro + "I can still walk you through the app and reference mock data." + ctx;
    return;
  }

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting streaming with model: ${model}`);
      
      const stream = await openai.chat.completions.create({
        model: model,
        messages: allMessages,
        max_completion_tokens: 500,
        stream: true,
      });

      let hasContent = false;
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          hasContent = true;
          yield content;
        }
      }
      
      // If we got here successfully, return
      if (hasContent) {
        console.log(`Streaming successful with model: ${model}`);
        return;
      }
    } catch (error: any) {
      console.error(`OpenAI streaming error with model ${model}:`, error?.message || error);
      
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
  console.log("All streaming models failed, providing fallback response");
  yield "I'm ready to help you with your business management needs! I can assist with scheduling, inventory, staff coordination, analytics, and more. What would you like to work on today?";
}
