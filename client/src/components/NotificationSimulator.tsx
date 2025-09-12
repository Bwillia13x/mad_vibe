import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

const messages = [
  'Customer checked in: Daniel Smith',
  'Inventory alert: Feather blades low',
  'New booking: 3:30 PM with Marcus',
  'Positive review received: 5/5 stars',
  'Reminder: Order supplies from PBS Co.'
]

export default function NotificationSimulator() {
  const { toast } = useToast()
  useEffect(() => {
    let cancelled = false
    let timer: any
    function schedule() {
      const delay = 15000 + Math.random() * 30000 // 15–45s
      timer = setTimeout(() => {
        if (cancelled) return
        const msg = messages[Math.floor(Math.random() * messages.length)]
        toast({ description: msg })
        schedule()
      }, delay)
    }
    schedule()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [toast])
  return null
}

