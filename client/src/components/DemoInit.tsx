import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export default function DemoInit() {
  const qc = useQueryClient()
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    try {
      const url = new URL(window.location.href)
      const scenario = url.searchParams.get('scenario')
      const freeze = url.searchParams.get('freeze')
      const seedStr = url.searchParams.get('seed')
      const seed = seedStr ? parseInt(seedStr, 10) : undefined
      ;(async () => {
        try {
          if (scenario || seedStr) {
            const qs = new URLSearchParams()
            if (scenario) qs.set('scenario', scenario)
            if (seedStr) qs.set('seed', seedStr)
            await fetch(`/api/demo/seed?${qs.toString()}`, { method: 'POST' })
          }
          if (freeze) {
            await fetch(`/api/demo/time?date=${encodeURIComponent(freeze)}`, { method: 'POST' })
          }
          if (scenario || seedStr || freeze) {
            await qc.invalidateQueries({ queryKey: ['/api/health'] })
          }
        } catch {}
      })()
    } catch {}
  }, [qc])
  return null
}
