'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface WebSocketContextType {
  connected: boolean
  lastMessage: string | null
  sendMessage: (message: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const [socket, setSocket] = useState<WebSocket | null>(null)

  useEffect(() => {
    // Don't auto-connect WebSocket during build or in smoke mode
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
      return
    }

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
        const wsUrl = `${protocol}//${window.location.host}/ws`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          setConnected(true)
          console.log('WebSocket connected')
        }

        ws.onmessage = (event) => {
          setLastMessage(event.data)
        }

        ws.onclose = () => {
          setConnected(false)
          console.log('WebSocket disconnected')
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setConnected(false)
        }

        setSocket(ws)
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
      }
    }

    // Only attempt connection if not in build mode
    if (process.env.NODE_ENV === 'development') {
      connectWebSocket()
    }

    return () => {
      if (socket) {
        socket.close()
      }
    }
  }, [])

  const sendMessage = (message: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message)
    } else {
      console.warn('WebSocket not connected')
    }
  }

  return (
    <WebSocketContext.Provider value={{ connected, lastMessage, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  )
}
