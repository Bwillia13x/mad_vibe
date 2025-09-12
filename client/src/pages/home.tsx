import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to Andreas Vibe Business Management! I'm your AI business assistant. I can help you with scheduling, inventory management, staff coordination, analytics, and more. What would you like to work on today?",
      timestamp: new Date(),
      id: 0
    }
  ]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = {
      role: "user" as const,
      content: message,
      timestamp: new Date(),
      id: Date.now() - 1
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");

    // Add a placeholder for the streaming AI response
    const aiMessageId = Date.now();
    const placeholderAiMessage = {
      role: "assistant" as const,
      content: "",
      timestamp: new Date(),
      id: aiMessageId
    };
    
    setMessages(prev => [...prev, placeholderAiMessage]);

    try {
      // Send message to OpenAI via our backend with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages.filter(m => m.role !== 'assistant' || m.content !== "Welcome to Andreas Vibe Business Management! I'm your AI business assistant. I can help you with scheduling, inventory management, staff coordination, analytics, and more. What would you like to work on today?"), userMessage].map(({ role, content }) => ({ role, content })),
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  // Update the AI message in real-time
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  ));
                }
              } catch (e) {
                // Ignore JSON parse errors for partial chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: "I'm having trouble connecting right now. Please try again in a moment." }
          : msg
      ));
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white" data-testid="heading-main">
              Andreas Vibe Business Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Human/AI Business Management System</p>
          </div>
          <div className="text-sm text-gray-500">
            [ready]
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`message-${msg.role}-${index}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Prompts */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Click and try one of these prompts:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <Button
            variant="outline"
            className="text-left justify-start h-auto p-3"
            onClick={() => setMessage("Show me today's schedule and upcoming appointments")}
            data-testid="prompt-schedule"
          >
            <div>
              <div className="font-medium text-sm">Show me today's schedule and upcoming appointments</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="text-left justify-start h-auto p-3"
            onClick={() => setMessage("What inventory items are running low?")}
            data-testid="prompt-inventory"
          >
            <div>
              <div className="font-medium text-sm">What inventory items are running low?</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="text-left justify-start h-auto p-3"
            onClick={() => setMessage("Generate a staff performance report for this month")}
            data-testid="prompt-staff"
          >
            <div>
              <div className="font-medium text-sm">Generate a staff performance report for this month</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="text-left justify-start h-auto p-3"
            onClick={() => setMessage("Show me revenue analytics and business insights")}
            data-testid="prompt-analytics"
          >
            <div>
              <div className="font-medium text-sm">Show me revenue analytics and business insights</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            data-testid="input-message"
          />
          <Button type="submit" disabled={!message.trim()} data-testid="button-send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </>
  );
}