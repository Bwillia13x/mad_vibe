import { useState } from 'react'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface NewWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewWorkspaceDialog({ open, onOpenChange }: NewWorkspaceDialogProps) {
  const { createWorkspace } = useWorkspaceContext()
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    setIsCreating(true)
    try {
      await createWorkspace({
        name: name.trim(),
        ticker: ticker.trim() || undefined,
        companyName: companyName.trim() || undefined,
        description: description.trim() || undefined
      })

      // Reset form and close
      setName('')
      setTicker('')
      setCompanyName('')
      setDescription('')
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to create workspace:', err)
      alert('Failed to create workspace. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    setName('')
    setTicker('')
    setCompanyName('')
    setDescription('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Investment Idea</DialogTitle>
          <DialogDescription>
            Create a new workspace to start analyzing an investment opportunity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Workspace Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Apple Deep Dive"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker Symbol</Label>
              <Input
                id="ticker"
                placeholder="e.g., AAPL"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g., Apple Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Initial Thesis (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief notes on why this is interesting..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
            {description && (
              <p className="text-xs text-slate-500">{description.length}/500 characters</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !name.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Workspace'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
