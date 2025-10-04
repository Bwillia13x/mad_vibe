import { useEffect, useRef, useState } from 'react'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { createArtifact, fetchArtifacts } from '@/lib/workspace-api'
import { useToast } from '@/hooks/use-toast'
import { subscribeToCanvasCards, type CanvasCardPayload } from '@/lib/studio-canvas'

interface CanvasBoardProps {
  className?: string
}

interface CanvasCardPayloadWithPosition extends CanvasCardPayload {
  id: string
  x: number
  y: number
}

function CanvasCard({
  card,
  onDrag,
  onRemove
}: {
  card: CanvasCardPayloadWithPosition
  onDrag: (id: string, x: number, y: number) => void
  onRemove: (id: string) => void
}) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = cardRef.current
    if (!node) return

    let startX = 0
    let startY = 0
    let initialX = card.x
    let initialY = card.y

    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof HTMLElement)) return
      if (!node.contains(event.target)) return
      startX = event.clientX
      startY = event.clientY
      initialX = card.x
      initialY = card.y
      node.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!node.hasPointerCapture(event.pointerId)) return
      const deltaX = event.clientX - startX
      const deltaY = event.clientY - startY
      onDrag(card.id, initialX + deltaX, initialY + deltaY)
    }

    const onPointerUp = (event: PointerEvent) => {
      if (node.hasPointerCapture(event.pointerId)) {
        node.releasePointerCapture(event.pointerId)
      }
    }

    node.addEventListener('pointerdown', onPointerDown)
    node.addEventListener('pointermove', onPointerMove)
    node.addEventListener('pointerup', onPointerUp)
    node.addEventListener('pointercancel', onPointerUp)

    return () => {
      node.removeEventListener('pointerdown', onPointerDown)
      node.removeEventListener('pointermove', onPointerMove)
      node.removeEventListener('pointerup', onPointerUp)
      node.removeEventListener('pointercancel', onPointerUp)
    }
  }, [card.id, card.x, card.y, onDrag])

  useEffect(() => {
    const node = cardRef.current
    if (!node) return
    node.style.setProperty('--card-x', `${card.x}px`)
    node.style.setProperty('--card-y', `${card.y}px`)
  }, [card.x, card.y])

  return (
    <div
      ref={cardRef}
      className="studio-canvas-card absolute max-w-xs cursor-grab active:cursor-grabbing select-none"
      data-left={card.x}
      data-top={card.y}
    >
      <div className="rounded-xl border border-slate-700 bg-slate-950/90 backdrop-blur p-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-100">{card.title}</p>
          <button
            className="text-xs text-slate-500 hover:text-slate-300"
            onClick={() => onRemove(card.id)}
            aria-label="Remove card"
          >
            ×
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
          {card.body.length > 320 ? `${card.body.slice(0, 317)}…` : card.body}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">{card.source}</p>
      </div>
    </div>
  )
}

export function CanvasBoard({ className = '' }: CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#a78bfa') // violet-400
  const [lineWidth, setLineWidth] = useState(2)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [isSaving, setIsSaving] = useState(false)
  const [cards, setCards] = useState<CanvasCardPayloadWithPosition[]>([])
  const { currentWorkspace } = useWorkspaceContext()
  const { toast } = useToast()

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(dpr, dpr)
        ctx.fillStyle = 'rgba(2,6,23,0.6)'
        ctx.fillRect(0, 0, rect.width, rect.height)
      }
    }

    const handler = (e: KeyboardEvent) => {
      const lower = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && lower === 's') {
        e.preventDefault()
        void saveSnapshot()
        return
      }
      if (lower === 'e') {
        setTool('eraser')
        return
      }
      if (lower === 'p') {
        setTool('pen')
        return
      }
      if (e.key === '[') {
        setLineWidth((s) => Math.max(1, s - 1))
        return
      }
      if (e.key === ']') {
        setLineWidth((s) => Math.min(12, s + 1))
        return
      }
      if ((e.shiftKey && lower === 'c') || lower === 'delete') {
        clear()
      }
    }
    // initialize size and observe container
    resize()
    const ro = new ResizeObserver(() => resize())
    ro.observe(container)
    // keyboard shortcuts
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToCanvasCards((payload) => {
      setCards((prev) => {
        const card = {
          ...payload,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          x: 24 + (prev.length % 3) * 16,
          y: 24 + prev.length * 12
        }
        return [card, ...prev].slice(0, 8)
      })
      toast({ title: 'Added to canvas', description: payload.title })
    })
    return unsubscribe
  }, [toast])

  const onCardDrag = (id: string, x: number, y: number) => {
    setCards((prev) => prev.map((card) => (card.id === id ? { ...card, x, y } : card)))
  }

  const removeCard = (id: string) => {
    setCards((prev) => prev.filter((card) => card.id !== id))
  }

  const getCtx = () => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }

  // Draw utility for images with aspect-fit
  const drawImageFit = (img: HTMLImageElement) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = getCtx()
    if (!canvas || !container || !ctx) return
    const rect = container.getBoundingClientRect()
    const cw = rect.width
    const ch = rect.height
    // Clear
    ctx.clearRect(0, 0, cw, ch)
    // Fill background subtly
    ctx.fillStyle = 'rgba(2,6,23,0.6)'
    ctx.fillRect(0, 0, cw, ch)
    // Aspect fit
    const ir = img.width / img.height
    let dw = cw
    let dh = cw / ir
    if (dh > ch) {
      dh = ch
      dw = ch * ir
    }
    const dx = (cw - dw) / 2
    const dy = (ch - dh) / 2
    ctx.drawImage(img, dx, dy, dw, dh)
  }

  // Drag and drop support for images
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Unsupported file', description: 'Please drop an image file.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const src = String(reader.result || '')
      const img = new Image()
      img.onload = () => drawImageFit(img)
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const loadLatestSnapshot = async () => {
    if (!currentWorkspace?.id) {
      toast({
        title: 'No workspace selected',
        description: 'Choose a workspace to load snapshots.'
      })
      return
    }
    try {
      const arts = await fetchArtifacts(currentWorkspace.id, { stageSlug: 'studio', type: 'note' })
      if (Array.isArray(arts) && arts.length > 0) {
        const first = arts[0]
        const imgSrc = (first.data as { image?: string } | null | undefined)?.image
        if (typeof imgSrc === 'string' && imgSrc.length > 0) {
          const img = new Image()
          img.onload = () => drawImageFit(img)
          img.src = imgSrc
          toast({ title: 'Loaded', description: `Loaded latest snapshot: ${first.name}` })
        } else {
          toast({ title: 'No image', description: 'Latest artifact has no image data.' })
        }
      } else {
        toast({
          title: 'No snapshots found',
          description: 'Save a snapshot from the canvas first.'
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast({ title: 'Load failed', description: msg })
    }
  }

  const startDraw = (x: number, y: number) => {
    const ctx = getCtx()
    if (!ctx) return
    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (x: number, y: number) => {
    if (!isDrawing) return
    const ctx = getCtx()
    if (!ctx) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = lineWidth
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
    }
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const endDraw = () => {
    setIsDrawing(false)
  }

  const pointerPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const exportPNG = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `canvas-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function saveSnapshot() {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!currentWorkspace?.id) {
      toast({
        title: 'No workspace selected',
        description: 'Choose a workspace to save the snapshot.'
      })
      return
    }
    try {
      setIsSaving(true)
      // Use JPEG to keep payload under 2MB request limit
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      await createArtifact(currentWorkspace.id, {
        workflowId: currentWorkspace.id,
        stageSlug: 'studio',
        type: 'note',
        name: `Canvas ${new Date().toLocaleString()}`,
        data: { image: dataUrl },
        metadata: {
          tool,
          color,
          lineWidth,
          width: canvas.width,
          height: canvas.height,
          format: 'jpeg'
        }
      })
      toast({ title: 'Saved', description: 'Canvas snapshot saved to Artifacts.' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast({ title: 'Save failed', description: msg })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={`flex h-full w-full flex-col ${className}`}>
      <div className="flex items-center gap-2 p-2 border-b border-slate-800 bg-slate-950/60">
        <label className="text-xs text-slate-300" id="tool-label">
          Tool
        </label>
        <div className="flex rounded-lg overflow-hidden border border-slate-800">
          <button
            onClick={() => setTool('pen')}
            className={`px-3 py-1 text-xs ${
              tool === 'pen' ? 'bg-violet-600/20 text-violet-200' : 'bg-slate-900 text-slate-300'
            }`}
            aria-labelledby="tool-label"
          >
            Pen
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`px-3 py-1 text-xs ${
              tool === 'eraser' ? 'bg-violet-600/20 text-violet-200' : 'bg-slate-900 text-slate-300'
            }`}
            aria-labelledby="tool-label"
          >
            Eraser
          </button>
        </div>
        <label className="text-xs text-slate-300 ml-2" htmlFor="canvas-color">
          Color
        </label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-6 w-6 rounded border border-slate-700 bg-slate-900"
          id="canvas-color"
          aria-label="Brush color"
          title="Brush color"
        />
        <label className="text-xs text-slate-300 ml-2" htmlFor="canvas-size">
          Size
        </label>
        <input
          type="range"
          min={1}
          max={12}
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          id="canvas-size"
          aria-label="Brush size"
          title="Brush size"
        />
        <div className="flex-1" />
        <button
          onClick={clear}
          className="px-3 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800"
          aria-label="Clear canvas"
        >
          Clear
        </button>
        <button
          onClick={saveSnapshot}
          disabled={isSaving}
          className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
          aria-label="Save canvas to Artifacts"
          title="Save canvas to Artifacts"
        >
          {isSaving ? 'Saving…' : 'Save to Artifacts'}
        </button>
        <button
          onClick={exportPNG}
          className="px-3 py-1 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          aria-label="Export canvas as PNG"
        >
          Export PNG
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex-1 relative"
        onDrop={onDrop}
        onDragOver={onDragOver}
        aria-label="Canvas area. Drag and drop an image to import."
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onPointerDown={(e) => {
            const { x, y } = pointerPos(e)
            startDraw(x, y)
          }}
          onPointerMove={(e) => {
            const { x, y } = pointerPos(e)
            draw(x, y)
          }}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
        {cards.map((card) => (
          <CanvasCard key={card.id} card={card} onDrag={onCardDrag} onRemove={removeCard} />
        ))}
        <div className="absolute top-2 left-2 flex gap-2">
          <button
            onClick={loadLatestSnapshot}
            className="px-2 py-1 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800"
            aria-label="Load latest snapshot"
            title="Load latest snapshot"
          >
            Load latest
          </button>
        </div>
      </div>
    </div>
  )
}
