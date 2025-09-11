import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../client/src/index.css'
import { WebSocketProvider } from '@/components/WebSocketProvider'
import { ThemeProvider } from 'next-themes'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Andreas Vibe - Business Management Platform',
  description: 'Production-ready business management system with AI scheduling, inventory management, and operational analytics.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
