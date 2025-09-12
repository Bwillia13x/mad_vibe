import { useState } from "react";
import { Send, Calendar, Package, Users, BarChart3, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to Andreas Vibe Business Management! I'm your AI business assistant. I can help you with scheduling, inventory management, staff coordination, analytics, and more. What would you like to work on today?",
      timestamp: new Date()
    }
  ]);
  const [isBusinessPanelOpen, setIsBusinessPanelOpen] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = {
      role: "user" as const,
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");

    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const aiResponse = {
        role: "assistant" as const,
        content: `I understand you want to work on: "${message}". Let me help you with that business task. Which specific area would you like me to assist with?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const businessTools = [
    { name: "Scheduling", icon: Calendar, description: "Manage appointments", href: "/admin/scheduling" },
    { name: "Inventory", icon: Package, description: "Track products", href: "/admin/inventory" },
    { name: "Staff", icon: Users, description: "Manage team", href: "/admin/staff" },
    { name: "Analytics", icon: BarChart3, description: "View insights", href: "/admin/analytics" },
    { name: "Settings", icon: Settings, description: "Configure system", href: "/admin/settings" }
  ];

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Business Tools Sidebar */}
      <div className={`${isBusinessPanelOpen ? 'w-80' : 'w-16'} transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsBusinessPanelOpen(!isBusinessPanelOpen)}
              data-testid="button-toggle-sidebar"
            >
              {isBusinessPanelOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            {isBusinessPanelOpen && (
              <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Business Tools</h2>
            )}
          </div>
        </div>

        {/* Business Tools */}
        <div className="flex-1 p-2">
          {businessTools.map((tool) => (
            <Button
              key={tool.name}
              variant="ghost"
              className={`w-full justify-start mb-2 ${isBusinessPanelOpen ? 'h-auto p-3' : 'h-12 p-0'}`}
              data-testid={`button-tool-${tool.name.toLowerCase()}`}
            >
              <tool.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              {isBusinessPanelOpen && (
                <div className="text-left">
                  <div className="font-medium text-sm">{tool.name}</div>
                  <div className="text-xs text-gray-500">{tool.description}</div>
                </div>
              )}
            </Button>
          ))}
        </div>

        {/* System Status */}
        {isBusinessPanelOpen && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 dark:text-green-400">System Online</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
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
      </div>
    </div>
  );
}