import { useEffect } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import { useWorkflow } from "@/hooks/useWorkflow"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle2, Circle, Lock } from "lucide-react"

export interface OmniPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateStage: (slug: string) => void
}

export function OmniPrompt({ open, onOpenChange, onNavigateStage }: OmniPromptProps) {
  const {
    stages,
    stageStatuses,
    activeStage,
    markStageComplete,
    resetStage,
    isStageComplete
  } = useWorkflow()

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to stage, object, or action" />
      <CommandList>
        <CommandEmpty>No matches found.</CommandEmpty>
        <CommandGroup heading="Stage Pipeline">
          {stages.map((stage) => {
            const status = stageStatuses[stage.slug]
            return (
              <CommandItem
                key={stage.slug}
                value={`stage ${stage.title}`}
                disabled={status === "locked"}
                onSelect={() => {
                  if (status === "locked") return
                  onNavigateStage(stage.slug)
                  onOpenChange(false)
                }}
              >
                {status === "complete" ? (
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                ) : status === "locked" ? (
                  <Lock className="mr-2 h-4 w-4" />
                ) : (
                  <Circle className="mr-2 h-4 w-4 text-slate-400" />
                )}
                <span className="flex-1 text-sm">{stage.title}</span>
                <Badge variant="outline" className="border-slate-600 text-[10px] uppercase">
                  Stage {stage.id + 1}
                </Badge>
                {status === "locked" && (
                  <span className="ml-2 text-xs text-slate-500">Locked</span>
                )}
              </CommandItem>
            )
          })}
        </CommandGroup>
        <CommandGroup heading="Current Stage Actions">
          <CommandItem
            value="action advance"
            disabled={isStageComplete(activeStage.slug)}
            onSelect={() => {
              markStageComplete(activeStage.slug)
              onOpenChange(false)
            }}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            <span>Mark &ldquo;{activeStage.shortTitle}&rdquo; stage ready</span>
          </CommandItem>
          <CommandItem
            value="action reset"
            onSelect={() => {
              resetStage(activeStage.slug)
              onOpenChange(false)
            }}
          >
            <Circle className="mr-2 h-4 w-4 text-slate-400" />
            <span>Reset checklist for this stage</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
