import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/log'

export async function GET(request: NextRequest) {
  // In smoke mode, allow access without admin token
  if (process.env.SMOKE_MODE === '1') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  const adminToken = process.env.ADMIN_TOKEN
  
  if (!adminToken) {
    log('Admin access attempted without ADMIN_TOKEN configured', { ip: request.ip })
    
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admin Access Required</title>
          <style>
            body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
            .error { background: #fee; border: 1px solid #fcc; padding: 1rem; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Admin Access Required</h1>
          <div class="error">
            <p><strong>Error:</strong> ADMIN_TOKEN environment variable is not configured.</p>
            <p>Please set the ADMIN_TOKEN environment variable to access the admin interface.</p>
          </div>
          <h2>Setup Instructions:</h2>
          <ol>
            <li>Set the <code>ADMIN_TOKEN</code> environment variable with a secure token</li>
            <li>Restart the application</li>
            <li>Access the admin interface with proper authentication</li>
          </ol>
        </body>
      </html>
      `,
      { 
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }

  // In a real implementation, this would show a login form
  // For now, we'll redirect back to admin (assuming token validation happens elsewhere)
  return NextResponse.redirect(new URL('/admin', request.url))
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    const adminToken = process.env.ADMIN_TOKEN
    
    if (!adminToken) {
      return NextResponse.json(
        { error: 'Admin token not configured' },
        { status: 500 }
      )
    }

    if (token === adminToken) {
      log('Admin authentication successful', { timestamp: new Date().toISOString() })
      
      return NextResponse.json({ 
        success: true,
        redirectUrl: '/admin'
      })
    } else {
      log('Admin authentication failed', { ip: request.ip })
      
      return NextResponse.json(
        { error: 'Invalid admin token' },
        { status: 401 }
      )
    }
  } catch (error) {
    log('Admin auth error', { error: error instanceof Error ? error.message : 'Unknown error' })
    
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
