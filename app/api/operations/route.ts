import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/log'
import { startWebSocketServer, getWebSocketStatus } from '@/lib/websocket'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'start':
        try {
          await startWebSocketServer()
          log('WebSocket server started', { port: process.env.OPERATIONS_WS_PORT || '8080' })
          
          return NextResponse.json({
            status: 'success',
            message: 'WebSocket server started',
            port: parseInt(process.env.OPERATIONS_WS_PORT || '8080', 10)
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to start WebSocket server'
          log('Failed to start WebSocket server', { error: message })
          
          return NextResponse.json(
            { status: 'error', message },
            { status: 500 }
          )
        }

      case 'status':
        const status = getWebSocketStatus()
        
        return NextResponse.json({
          connected: status.running,
          port: status.port,
          connections: status.connections,
          uptime: status.uptime
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use ?action=start or ?action=status' },
          { status: 400 }
        )
    }
  } catch (error) {
    log('Operations endpoint error', { error: error instanceof Error ? error.message : 'Unknown error' })
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
