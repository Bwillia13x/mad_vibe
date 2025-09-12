import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import DemoControls from '@/components/DemoControls'

export default function DemoControlsFab() {
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed bottom-3 left-3 z-50 sm:hidden">
      <button
        onClick={() => setOpen(true)}
        className="h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center"
        title="Demo Controls"
        aria-label="Open demo controls"
      >
        <Settings2 className="h-6 w-6" />
      </button>
      <DemoControls open={open} onOpenChange={setOpen} />
    </div>
  )
}
