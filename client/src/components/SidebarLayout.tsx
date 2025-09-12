import { useState } from "react";
import { Calendar, Package, Users, BarChart3, Menu, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const [isBusinessPanelOpen, setIsBusinessPanelOpen] = useState(false);
  const [location] = useLocation();

  const businessTools = [
    { name: "Chat", icon: MessageSquare, description: "AI Assistant", href: "/" },
    { name: "Scheduling", icon: Calendar, description: "Manage appointments", href: "/scheduling" },
    { name: "Inventory", icon: Package, description: "Track products", href: "/inventory" },
    { name: "Staff", icon: Users, description: "Manage team", href: "/staff" },
    { name: "Analytics", icon: BarChart3, description: "View insights", href: "/analytics" }
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
            <Link key={tool.name} href={tool.href}>
              <Button
                variant="ghost"
                className={`w-full justify-start mb-2 ${isBusinessPanelOpen ? 'h-auto p-3' : 'h-12 p-0'} ${
                  location === tool.href ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : ''
                }`}
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
            </Link>
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}