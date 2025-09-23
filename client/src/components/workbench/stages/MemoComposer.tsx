import { useEffect, useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useMemoComposer } from '@/hooks/useMemoComposer'
import { cn } from '@/lib/utils'

const formatTime = (timestamp: string | null) => {
  if (!timestamp) return 'Pending sync'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Pending sync'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MemoComposer() {
  const {
    sections,
    reviewPrompts,
    state,
    updateSection,
    toggleReview,
    exhibits,
    toggleExhibit,
    updateExhibitCaption,
    commentThreads,
    addComment,
    setCommentStatus,
    wordCounts,
    overallCompletion,
    openCommentCount,
    compiledMemo,
    htmlPreview,
    syncStatus
  } = useMemoComposer()

  const [activeTab, setActiveTab] = useState<'composer' | 'preview'>('composer')
  const [commentSection, setCommentSection] = useState<string>(sections[0]?.id ?? '')
  const [commentAuthor, setCommentAuthor] = useState('Reviewer')
  const [commentDraft, setCommentDraft] = useState('')

  useEffect(() => {
    if (!sections.length) return
    if (!sections.find((section) => section.id === commentSection)) {
      setCommentSection(sections[0]?.id ?? '')
    }
  }, [sections, commentSection])

  const completedSections = useMemo(() => {
    return sections.filter((section) => (wordCounts[section.id] ?? 0) >= section.wordTarget).length
  }, [sections, wordCounts])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(compiledMemo)
    } catch (error) {
      console.warn('Failed to copy memo', error)
    }
  }

  const handleDownloadMarkdown = () => {
    try {
      const blob = new Blob([compiledMemo], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'investment-memo.md'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.warn('Failed to download memo', error)
    }
  }

  const handleDownloadHtml = () => {
    try {
      const blob = new Blob([htmlPreview], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'investment-memo.html'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.warn('Failed to download HTML export', error)
    }
  }

  const handlePrint = () => {
    try {
      const printWindow = window.open('', '_blank', 'width=900,height=1200')
      if (!printWindow) return
      printWindow.document.write(htmlPreview)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    } catch (error) {
      console.warn('Failed to open print dialog', error)
    }
  }

  const handleSubmitComment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!commentSection) return
    addComment(commentSection, commentDraft, commentAuthor.trim() || 'Reviewer')
    setCommentDraft('')
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Memo Progress</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-xs text-slate-400 sm:grid-cols-2 xl:grid-cols-4">
          <div className="transition-all duration-200 ease-in-out hover:bg-slate-800/20 rounded-lg px-2 py-1">
            <p className="text-[11px] uppercase text-slate-500">Overall completion</p>
            <p className="text-lg font-semibold text-slate-100">{overallCompletion}%</p>
          </div>
          <div className="transition-all duration-200 ease-in-out hover:bg-slate-800/20 rounded-lg px-2 py-1">
            <p className="text-[11px] uppercase text-slate-500">Sections ready</p>
            <p className="text-lg font-semibold text-slate-100">
              {completedSections}/{sections.length}
            </p>
          </div>
          <div className="transition-all duration-200 ease-in-out hover:bg-slate-800/20 rounded-lg px-2 py-1">
            <p className="text-[11px] uppercase text-slate-500">Review checks</p>
            <p className="text-lg font-semibold text-slate-100">
              {Object.values(state.reviewChecklist).filter(Boolean).length}/{reviewPrompts.length}
            </p>
          </div>
          <div className="transition-all duration-200 ease-in-out hover:bg-slate-800/20 rounded-lg px-2 py-1">
            <p className="text-[11px] uppercase text-slate-500">Reviewer threads</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-slate-100">{openCommentCount}</p>
              <Badge
                variant={openCommentCount > 0 ? 'outline' : 'default'}
                className="border-slate-700 text-[10px] uppercase transition-all duration-200 ease-in-out"
              >
                {openCommentCount > 0 ? 'Open items' : 'All cleared'}
              </Badge>
            </div>
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase text-slate-500">
              <span>Autosave</span>
              <Badge
                variant={
                  syncStatus.error ? 'destructive' : syncStatus.isSyncing ? 'outline' : 'secondary'
                }
                className={cn(
                  'border px-2 py-1 text-[10px] transition-all duration-300 ease-in-out',
                  syncStatus.error
                    ? 'border-red-600 bg-red-900/40 text-red-200 animate-pulse'
                    : syncStatus.isSyncing
                      ? 'border-sky-600 bg-sky-900/40 text-sky-200 animate-pulse'
                      : 'border-emerald-600 bg-emerald-900/30 text-emerald-100'
                )}
              >
                {syncStatus.error
                  ? 'Retry required'
                  : syncStatus.isSyncing
                    ? 'Syncing'
                    : `Saved ${formatTime(syncStatus.lastSavedAt)}`}
              </Badge>
              {syncStatus.error && (
                <span className="text-[11px] text-amber-300">{syncStatus.error}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="composer">Composer</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="composer" className="mt-4">
          <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              {sections.map((section) => {
                const words = wordCounts[section.id] ?? 0
                const completionRatio = Math.min(words / section.wordTarget, 1)
                return (
                  <Card key={section.id} className="border-slate-800 bg-slate-900/60">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-sm text-slate-200">
                        <span>{section.title}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border px-2 py-1 text-[10px] uppercase',
                            completionRatio >= 1
                              ? 'border-emerald-500 text-emerald-200'
                              : 'border-slate-700 text-slate-300'
                          )}
                        >
                          {words}/{section.wordTarget} words
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={state.sections[section.id] ?? ''}
                        onChange={(event) => updateSection(section.id, event.target.value)}
                        placeholder={section.placeholder}
                        className="h-48 w-full border-slate-700 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="space-y-4">
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-sm text-slate-200">Review Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Complete the review prompts and tie each answer back to memo sections or
                    exhibits. Reviewers use this to gate IC approval.
                  </p>
                  <div className="space-y-3">
                    {reviewPrompts.map((prompt) => (
                      <label
                        key={prompt.id}
                        className={cn(
                          'flex items-start gap-2 rounded border px-3 py-2 text-xs transition-all duration-200 ease-in-out hover:bg-slate-900/60',
                          state.reviewChecklist[prompt.id]
                            ? 'border-emerald-600 bg-emerald-900/20 text-emerald-200 animate-in zoom-in-95 duration-300'
                            : 'border-slate-700 bg-slate-950/40 text-slate-300'
                        )}
                      >
                        <Checkbox
                          checked={state.reviewChecklist[prompt.id]}
                          onCheckedChange={() => toggleReview(prompt.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="font-medium text-slate-200">{prompt.question}</p>
                          {prompt.helper && (
                            <p className="text-[11px] text-slate-500">{prompt.helper}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-sm text-slate-200">Reviewer Threads</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form className="space-y-2" onSubmit={handleSubmitComment}>
                    <p className="text-[11px] uppercase text-slate-500">Log a reviewer note</p>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                      <select
                        value={commentSection}
                        onChange={(event) => setCommentSection(event.target.value)}
                        className="rounded border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                      >
                        {sections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.title}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={commentAuthor}
                        onChange={(event) => setCommentAuthor(event.target.value)}
                        placeholder="Reviewer"
                        className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder:text-slate-500"
                      />
                    </div>
                    <Textarea
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder="Document new feedback or follow-up actions."
                      className="min-h-[88px] border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="rounded border border-emerald-600 px-3 py-1 text-[11px] uppercase text-emerald-200 transition hover:bg-emerald-900/20"
                        disabled={!commentDraft.trim()}
                      >
                        Add comment
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {commentThreads.map((thread) => (
                      <div
                        key={thread.sectionId}
                        className="rounded border border-slate-800 bg-slate-950/40 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-200">{thread.title}</p>
                            <p className="text-[11px] text-slate-500">
                              {thread.openCount} open · {thread.comments.length} total
                            </p>
                          </div>
                        </div>
                        {thread.comments.length > 0 ? (
                          <div className="mt-2 space-y-2 overflow-hidden">
                            {thread.comments.slice(0, 4).map((comment) => (
                              <div
                                key={comment.id}
                                className="space-y-1 rounded border border-slate-900/60 bg-slate-900/60 p-2"
                              >
                                <div className="flex items-center justify-between text-[10px] uppercase text-slate-500">
                                  <span>{comment.author}</span>
                                  <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-slate-200">{comment.message}</p>
                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant={comment.status === 'resolved' ? 'outline' : 'default'}
                                    className={cn(
                                      'border px-2 py-0.5 text-[10px] uppercase',
                                      comment.status === 'resolved'
                                        ? 'border-emerald-500 text-emerald-200'
                                        : 'border-amber-500 bg-amber-500/10 text-amber-200'
                                    )}
                                  >
                                    {comment.status}
                                  </Badge>
                                  <button
                                    type="button"
                                    className="text-[11px] uppercase text-slate-400 transition hover:text-slate-100"
                                    onClick={() =>
                                      setCommentStatus(
                                        thread.sectionId,
                                        comment.id,
                                        comment.status === 'resolved' ? 'open' : 'resolved'
                                      )
                                    }
                                  >
                                    {comment.status === 'resolved' ? 'Reopen' : 'Resolve'}
                                  </button>
                                </div>
                              </div>
                            ))}
                            {thread.comments.length > 4 && (
                              <p className="text-[11px] text-slate-500">
                                +{thread.comments.length - 4} more in export
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500">
                            No reviewer feedback logged yet.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded border border-slate-700 px-3 py-1 text-[11px] uppercase text-slate-300 transition-all duration-200 ease-in-out hover:bg-slate-900 hover:border-slate-600"
            >
              Copy Markdown
            </button>
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="rounded border border-slate-700 px-3 py-1 text-[11px] uppercase text-slate-300 transition-all duration-200 ease-in-out hover:bg-slate-900 hover:border-slate-600"
            >
              Download Markdown
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="rounded border border-slate-700 px-3 py-1 text-[11px] uppercase text-slate-300 transition-all duration-200 ease-in-out hover:bg-slate-900 hover:border-slate-600"
            >
              Download HTML
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded border border-slate-700 px-3 py-1 text-[11px] uppercase text-slate-300 transition-all duration-200 ease-in-out hover:bg-slate-900 hover:border-slate-600"
            >
              Print / Save PDF
            </button>
          </div>

          <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader>
                <CardTitle className="text-sm text-slate-200">Memo Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200">
                  {compiledMemo}
                </pre>
                <div
                  className="rounded border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-100"
                  dangerouslySetInnerHTML={{
                    __html: htmlPreview
                      .replace(/<!DOCTYPE html>[\s\S]*?<body>/, '')
                      .replace(/<\/body>[\s\S]*$/, '')
                  }}
                />
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-sm text-slate-200">Exhibit Attachments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-300">
                  {exhibits.map((exhibit) => (
                    <div
                      key={exhibit.id}
                      className="rounded border border-slate-800 bg-slate-950/50 p-3"
                    >
                      <label className="flex items-start gap-3">
                        <Checkbox
                          checked={exhibit.attachment.include}
                          onCheckedChange={() => toggleExhibit(exhibit.id)}
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-100">{exhibit.title}</p>
                            <Badge
                              variant="outline"
                              className="border-slate-700 text-[10px] uppercase"
                            >
                              {exhibit.attachment.include ? 'Included' : 'Excluded'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400">{exhibit.summary}</p>
                          <p className="text-[11px] text-slate-500">
                            Source: {exhibit.sourceStage}
                          </p>
                          <ul className="list-disc space-y-1 pl-5 text-[11px] text-slate-500">
                            {exhibit.highlights.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                          <Textarea
                            value={exhibit.attachment.caption ?? ''}
                            onChange={(event) =>
                              updateExhibitCaption(exhibit.id, event.target.value)
                            }
                            placeholder="Add analyst annotation for this exhibit"
                            className="mt-2 min-h-[60px] border-slate-800 bg-slate-950 text-[11px] text-slate-200 placeholder:text-slate-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
                          />
                        </div>
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-sm text-slate-200">Reviewer Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-300">
                  {commentThreads.flatMap((thread) => thread.comments.slice(0, 3)).length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      No reviewer threads logged for export.
                    </p>
                  ) : (
                    commentThreads.map((thread) => (
                      <div key={thread.sectionId} className="space-y-2">
                        <p className="text-[11px] uppercase text-slate-500">{thread.title}</p>
                        {thread.comments.slice(0, 3).map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded border border-slate-800 bg-slate-950/50 p-2"
                          >
                            <div className="flex items-center justify-between text-[10px] uppercase text-slate-500">
                              <span>{comment.author}</span>
                              <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[11px] text-slate-100">{comment.message}</p>
                            <Badge
                              variant={comment.status === 'resolved' ? 'outline' : 'default'}
                              className={cn(
                                'mt-2 border px-2 py-0.5 text-[10px] uppercase',
                                comment.status === 'resolved'
                                  ? 'border-emerald-500 text-emerald-200'
                                  : 'border-amber-500 bg-amber-500/10 text-amber-200'
                              )}
                            >
                              {comment.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                  <p className="text-[11px] text-slate-500">
                    Full thread history is embedded in the export PDF/HTML package.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
