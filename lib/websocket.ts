import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { log } from './log'

interface WebSocketStatus {
  running: boolean
  port: number
  connections: number
  uptime: number
}

let wsServer: WebSocketServer | null = null
let httpServer: ReturnType<typeof createServer> | null = null
let startTime: Date | null = null

export async function startWebSocketServer(): Promise<void> {
  if (wsServer) {
    log('WebSocket server already running', { port: getPort() })
    return
  }
  
  const port = getPort()
  
  try {
    // Create HTTP server for WebSocket
    httpServer = createServer()
    
    // Create WebSocket server
    wsServer = new WebSocketServer({ 
      server: httpServer,
      path: '/ws'
    })
    
    wsServer.on('connection', (ws: WebSocket) => {
      log('WebSocket client connected', { connections: wsServer?.clients.size || 0 })
      
      ws.on('message', (data) => {
        log('WebSocket message received', { message: data.toString() })
        
        // Echo message to all clients
        wsServer?.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(`Echo: ${data.toString()}`)
          }
        })
      })
      
      ws.on('close', () => {
        log('WebSocket client disconnected', { connections: wsServer?.clients.size || 0 })
      })
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to Andreas Vibe WebSocket',
        timestamp: new Date().toISOString()
      }))
    })
    
    // Start HTTP server
    await new Promise<void>((resolve, reject) => {
      httpServer!.listen(port, '0.0.0.0', (error?: Error) => {
        if (error) {
          reject(error)
          return
        }
        
        startTime = new Date()
        log('WebSocket server started', { port, timestamp: startTime.toISOString() })
        resolve()
      })
    })
    
  } catch (error) {
    log('Failed to start WebSocket server', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      port 
    })
    throw error
  }
}

export function stopWebSocketServer(): void {
  if (wsServer) {
    wsServer.close()
    wsServer = null
  }
  
  if (httpServer) {
    httpServer.close()
    httpServer = null
  }
  
  startTime = null
  log('WebSocket server stopped')
}

export function getWebSocketStatus(): WebSocketStatus {
  return {
    running: wsServer !== null,
    port: getPort(),
    connections: wsServer?.clients.size || 0,
    uptime: startTime ? Date.now() - startTime.getTime() : 0
  }
}

function getPort(): number {
  return parseInt(process.env.OPERATIONS_WS_PORT || '8080', 10)
}

// Broadcast message to all connected clients
export function broadcastMessage(message: string | object): void {
  if (!wsServer) {
    log('Cannot broadcast: WebSocket server not running')
    return
  }
  
  const data = typeof message === 'string' ? message : JSON.stringify(message)
  
  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
  
  log('Message broadcast to WebSocket clients', { 
    message: typeof message,
    clients: wsServer.clients.size 
  })
}
