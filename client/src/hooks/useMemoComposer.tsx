import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { memoSections, memoReviewPrompts, memoExhibits } from '@/lib/workflow-data'
import { fetchMemoComposerState, persistMemoComposerState } from '@/lib/workflow-api'
import { useSessionKey } from './useSessionKey'
import type {
  MemoAttachmentState,
  MemoComment,
  MemoCommentStatus,
  MemoComposerStateInput
} from '@shared/types'

interface MemoComposerState {
  sections: Record<string, string>
  reviewChecklist: Record<string, boolean>
  attachments: Record<string, MemoAttachmentState>
  commentThreads: Record<string, MemoComment[]>
}

interface EnrichedExhibit {
  id: string
  title: string
  summary: string
  sourceStage: string
  highlights: string[]
  attachment: MemoAttachmentState
}

interface CommentThreadMeta {
  sectionId: string
  title: string
  comments: MemoComment[]
  openCount: number
}

interface SyncStatus {
  hydrated: boolean
  isSyncing: boolean
  lastSavedAt: string | null
  error: string | null
}

interface MemoComposerContextValue {
  sections: typeof memoSections
  reviewPrompts: typeof memoReviewPrompts
  state: MemoComposerState
  updateSection: (id: string, value: string) => void
  toggleReview: (id: string) => void
  toggleExhibit: (id: string) => void
  updateExhibitCaption: (id: string, caption: string) => void
  addComment: (sectionId: string, message: string, author?: string) => void
  setCommentStatus: (sectionId: string, commentId: string, status: MemoCommentStatus) => void
  commentThreads: CommentThreadMeta[]
  exhibits: EnrichedExhibit[]
  wordCounts: Record<string, number>
  overallCompletion: number
  openCommentCount: number
  compiledMemo: string
  htmlPreview: string
  syncStatus: SyncStatus
}

const buildDefaultSections = (): Record<string, string> =>
  Object.fromEntries(memoSections.map((section) => [section.id, '']))

const buildDefaultChecklist = (): Record<string, boolean> =>
  Object.fromEntries(memoReviewPrompts.map((prompt) => [prompt.id, false]))

const buildDefaultAttachments = (): Record<string, MemoAttachmentState> =>
  Object.fromEntries(
    memoExhibits.map((exhibit) => [exhibit.id, { include: exhibit.defaultIncluded, caption: '' }])
  )

const buildDefaultThreads = (): Record<string, MemoComment[]> =>
  Object.fromEntries(memoSections.map((section) => [section.id, []]))

const buildDefaultState = (): MemoComposerState => ({
  sections: buildDefaultSections(),
  reviewChecklist: buildDefaultChecklist(),
  attachments: buildDefaultAttachments(),
  commentThreads: buildDefaultThreads()
})

const MemoComposerContext = createContext<MemoComposerContextValue | undefined>(undefined)

const ensureUuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const mergeAttachments = (
  base: Record<string, MemoAttachmentState>,
  incoming?: Record<string, MemoAttachmentState>
) => {
  const merged: Record<string, MemoAttachmentState> = {}
  for (const [id, attachment] of Object.entries(base)) {
    merged[id] = { include: attachment.include, caption: attachment.caption ?? '' }
  }
  if (!incoming) return merged
  for (const [id, attachment] of Object.entries(incoming)) {
    merged[id] = {
      include: Boolean(attachment?.include),
      caption: attachment?.caption ?? ''
    }
  }
  return merged
}

const mergeThreads = (
  base: Record<string, MemoComment[]>,
  incoming?: Record<string, MemoComment[]>
) => {
  const merged: Record<string, MemoComment[]> = {}
  for (const [sectionId, comments] of Object.entries(base)) {
    merged[sectionId] = [...comments]
  }
  if (!incoming) return merged
  for (const [sectionId, comments] of Object.entries(incoming)) {
    merged[sectionId] = (comments ?? []).map((comment) => ({
      id: comment.id ?? ensureUuid(),
      author: comment.author ?? 'Reviewer',
      message: comment.message ?? '',
      status: comment.status === 'resolved' ? 'resolved' : 'open',
      createdAt: comment.createdAt ?? new Date().toISOString()
    }))
  }
  return merged
}

export function MemoComposerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MemoComposerState>(() => buildDefaultState())
  const [version, setVersion] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [isSyncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const sessionKey = useSessionKey()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!sessionKey) return
      try {
        const remote = await fetchMemoComposerState(sessionKey)
        if (!remote || cancelled) return
        const defaults = buildDefaultState()
        setState({
          sections: { ...defaults.sections, ...remote.sections },
          reviewChecklist: { ...defaults.reviewChecklist, ...remote.reviewChecklist },
          attachments: mergeAttachments(defaults.attachments, remote.attachments),
          commentThreads: mergeThreads(defaults.commentThreads, remote.commentThreads)
        })
        setLastSavedAt(remote.updatedAt ?? null)
        setVersion(remote.version ?? 0)
        setSyncError(null)
      } catch (error) {
        console.warn('Failed to hydrate memo composer state', error)
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionKey])

  useEffect(() => {
    if (!hydrated || !sessionKey) return

    let cancelled = false
    const timeout = setTimeout(() => {
      void (async () => {
        setSyncing(true)
        try {
          const payload: MemoComposerStateInput = {
            sections: state.sections,
            reviewChecklist: state.reviewChecklist,
            attachments: state.attachments,
            commentThreads: state.commentThreads,
            version
          }
          const saved = await persistMemoComposerState(sessionKey, payload)
          if (!cancelled) {
            setVersion(saved.version ?? version)
            setLastSavedAt(saved.updatedAt ?? new Date().toISOString())
            setSyncError(null)
          }
        } catch (error) {
          if (!cancelled) {
            const maybe = error as Record<string, unknown>
            const status = typeof maybe?.status === 'number' ? (maybe.status as number) : undefined
            if (status === 409) {
              try {
                const remote = await fetchMemoComposerState(sessionKey)
                if (!cancelled && remote) {
                  const defaults = buildDefaultState()
                  setState({
                    sections: { ...defaults.sections, ...remote.sections },
                    reviewChecklist: { ...defaults.reviewChecklist, ...remote.reviewChecklist },
                    attachments: mergeAttachments(defaults.attachments, remote.attachments),
                    commentThreads: mergeThreads(defaults.commentThreads, remote.commentThreads)
                  })
                  setVersion(remote.version ?? version)
                  setLastSavedAt(remote.updatedAt ?? new Date().toISOString())
                  setSyncError('Memo refreshed due to concurrent edits.')
                }
              } catch (refreshError) {
                const message =
                  refreshError instanceof Error ? refreshError.message : 'Unknown persistence error'
                setSyncError(message)
              }
            } else {
              const message = error instanceof Error ? error.message : 'Unknown persistence error'
              setSyncError(message)
            }
          }
        } finally {
          if (!cancelled) setSyncing(false)
        }
      })()
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [state, version, hydrated, sessionKey])

  const updateSection = useCallback((id: string, value: string) => {
    setState((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [id]: value
      }
    }))
  }, [])

  const toggleReview = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      reviewChecklist: {
        ...prev.reviewChecklist,
        [id]: !prev.reviewChecklist[id]
      }
    }))
  }, [])

  const toggleExhibit = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      attachments: {
        ...prev.attachments,
        [id]: {
          include: !(prev.attachments[id]?.include ?? false),
          caption: prev.attachments[id]?.caption ?? ''
        }
      }
    }))
  }, [])

  const updateExhibitCaption = useCallback((id: string, caption: string) => {
    setState((prev) => ({
      ...prev,
      attachments: {
        ...prev.attachments,
        [id]: {
          include: prev.attachments[id]?.include ?? false,
          caption
        }
      }
    }))
  }, [])

  const addComment = useCallback((sectionId: string, message: string, author = 'Reviewer') => {
    const trimmed = message.trim()
    if (!trimmed) return
    setState((prev) => {
      const nextThreads = { ...prev.commentThreads }
      const thread = nextThreads[sectionId] ? [...nextThreads[sectionId]] : []
      thread.unshift({
        id: ensureUuid(),
        author,
        message: trimmed,
        status: 'open',
        createdAt: new Date().toISOString()
      })
      nextThreads[sectionId] = thread
      return {
        ...prev,
        commentThreads: nextThreads
      }
    })
  }, [])

  const setCommentStatus = useCallback(
    (sectionId: string, commentId: string, status: MemoCommentStatus) => {
      setState((prev) => {
        const thread = prev.commentThreads[sectionId]
        if (!thread) return prev
        return {
          ...prev,
          commentThreads: {
            ...prev.commentThreads,
            [sectionId]: thread.map((comment) =>
              comment.id === commentId
                ? {
                    ...comment,
                    status
                  }
                : comment
            )
          }
        }
      })
    },
    []
  )

  const exhibits = useMemo<EnrichedExhibit[]>(() => {
    return memoExhibits.map((exhibit) => ({
      ...exhibit,
      attachment: state.attachments[exhibit.id] ?? { include: false }
    }))
  }, [state.attachments])

  const commentThreads = useMemo<CommentThreadMeta[]>(() => {
    return memoSections.map((section) => {
      const comments = state.commentThreads[section.id] ?? []
      const openCount = comments.filter((comment) => comment.status !== 'resolved').length
      return {
        sectionId: section.id,
        title: section.title,
        comments,
        openCount
      }
    })
  }, [state.commentThreads])

  const wordCounts = useMemo(() => {
    return Object.fromEntries(
      memoSections.map((section) => [
        section.id,
        state.sections[section.id]?.trim().split(/\s+/).filter(Boolean).length ?? 0
      ])
    )
  }, [state.sections])

  const sectionCompletionScore = useMemo(() => {
    return (
      memoSections.reduce((acc, section) => {
        const words = wordCounts[section.id] ?? 0
        return acc + Math.min(words / section.wordTarget, 1)
      }, 0) / memoSections.length
    )
  }, [wordCounts])

  const reviewCompletionScore = useMemo(() => {
    const total = memoReviewPrompts.length || 1
    const completed = Object.values(state.reviewChecklist).filter(Boolean).length
    return completed / total
  }, [state.reviewChecklist])

  const overallCompletion = useMemo(
    () => Math.round(((sectionCompletionScore + reviewCompletionScore) / 2) * 100),
    [sectionCompletionScore, reviewCompletionScore]
  )

  const includedExhibits = useMemo(
    () => exhibits.filter((exhibit) => exhibit.attachment.include),
    [exhibits]
  )

  const openCommentCount = useMemo(
    () => commentThreads.reduce((acc, thread) => acc + thread.openCount, 0),
    [commentThreads]
  )

  const compiledMemo = useMemo(() => {
    const sectionMarkdown = memoSections
      .map((section) => {
        const body = state.sections[section.id]?.trim() ?? ''
        return `## ${section.title}\n${body || '_Pending_'}`
      })
      .join('\n\n')

    const reviewMarkdown = memoReviewPrompts
      .map((prompt) => {
        const done = state.reviewChecklist[prompt.id]
        return `- [${done ? 'x' : ' '}] ${prompt.question}`
      })
      .join('\n')

    const exhibitsMarkdown = includedExhibits.length
      ? includedExhibits
          .map((exhibit) => {
            const caption = exhibit.attachment.caption?.trim()
            const lines = [
              `    - Source: ${exhibit.sourceStage}`,
              ...exhibit.highlights.map((item) => `    - ${item}`)
            ]
            if (caption) lines.push(`    - Analyst note: ${caption}`)
            return `1. **${exhibit.title}** — ${exhibit.summary}\n${lines.join('\n')}`
          })
          .join('\n')
      : '1. Exhibits not selected.'

    const commentsMarkdown =
      commentThreads
        .map((thread) => {
          if (!thread.comments.length) return null
          const rendered = thread.comments
            .map((comment) => {
              const status = comment.status === 'resolved' ? 'Resolved' : 'Open'
              return `- [${status}] ${comment.message} _(via ${comment.author} • ${new Date(
                comment.createdAt
              ).toLocaleDateString()})_`
            })
            .join('\n')
          return `#### ${thread.title}\n${rendered}`
        })
        .filter(Boolean)
        .join('\n\n') || 'No reviewer comments on record.'

    return `# Investment Memo\n\n${sectionMarkdown}\n\n---\n\n### Review Checklist\n${reviewMarkdown}\n\n### Exhibits\n${exhibitsMarkdown}\n\n### Reviewer Comment Threads\n${commentsMarkdown}`
  }, [state.sections, state.reviewChecklist, includedExhibits, commentThreads])

  const htmlPreview = useMemo(() => {
    const sectionHtml = memoSections
      .map((section) => {
        const raw = state.sections[section.id]?.trim() ?? ''
        const html = raw
          ? raw
              .split(/\n{2,}/)
              .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
              .join('')
          : '<p><em>Pending</em></p>'
        return `<section class="memo-section"><h2>${escapeHtml(section.title)}</h2>${html}</section>`
      })
      .join('')

    const checklistHtml = memoReviewPrompts
      .map((prompt) => {
        const done = state.reviewChecklist[prompt.id]
        return `<li data-status="${done ? 'done' : 'pending'}">${escapeHtml(prompt.question)}</li>`
      })
      .join('')

    const exhibitsHtml = includedExhibits.length
      ? includedExhibits
          .map((exhibit) => {
            const highlights = exhibit.highlights
              .map((highlight) => `<li>${escapeHtml(highlight)}</li>`)
              .join('')
            const caption = exhibit.attachment.caption?.trim()
            return `<article class="exhibit">
                <header>
                  <h3>${escapeHtml(exhibit.title)}</h3>
                  <span>${escapeHtml(exhibit.sourceStage)}</span>
                </header>
                <p>${escapeHtml(exhibit.summary)}</p>
                <ul>${highlights}</ul>
                ${caption ? `<footer>Analyst note: ${escapeHtml(caption)}</footer>` : ''}
              </article>`
          })
          .join('')
      : '<p class="empty">No exhibits selected.</p>'

    const commentsHtml =
      commentThreads
        .map((thread) => {
          if (!thread.comments.length) return ''
          const rendered = thread.comments
            .map((comment) => {
              const status = comment.status === 'resolved' ? 'resolved' : 'open'
              const date = new Date(comment.createdAt).toLocaleString()
              return `<li data-status="${status}">
                <div class="meta">
                  <span class="author">${escapeHtml(comment.author)}</span>
                  <span class="date">${escapeHtml(date)}</span>
                </div>
                <p>${escapeHtml(comment.message)}</p>
              </li>`
            })
            .join('')
          return `<section class="comment-thread">
            <h4>${escapeHtml(thread.title)}</h4>
            <ul>${rendered}</ul>
          </section>`
        })
        .filter(Boolean)
        .join('') || '<p class="empty">No reviewer comments on record.</p>'

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Investment Memo Export</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      body {
        margin: 0;
        padding: 2.5rem 2rem 3rem;
        background: linear-gradient(145deg, #0f172a, #020617);
        color: #e2e8f0;
      }
      main {
        max-width: 840px;
        margin: 0 auto;
        background: rgba(15, 23, 42, 0.9);
        border-radius: 18px;
        box-shadow: 0 32px 80px rgba(15, 23, 42, 0.55);
        overflow: hidden;
      }
      header.hero {
        background: linear-gradient(135deg, rgba(30, 64, 175, 0.9), rgba(16, 185, 129, 0.8));
        padding: 2.25rem 2.5rem;
        color: #f8fafc;
      }
      header.hero h1 {
        margin: 0 0 0.75rem;
        font-size: 2rem;
        letter-spacing: 0.01em;
      }
      header.hero .meta {
        font-size: 0.9rem;
        opacity: 0.85;
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
      section.memo-section {
        padding: 2rem 2.5rem;
        border-top: 1px solid rgba(148, 163, 184, 0.08);
      }
      section.memo-section h2 {
        margin: 0 0 0.75rem;
        font-size: 1.25rem;
        color: #93c5fd;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      section.memo-section p {
        margin: 0 0 0.75rem;
        line-height: 1.7;
      }
      section.memo-section em {
        color: rgba(148, 163, 184, 0.8);
      }
      .panel {
        padding: 2rem 2.5rem;
        border-top: 1px solid rgba(148, 163, 184, 0.08);
        background: rgba(15, 23, 42, 0.8);
      }
      .panel h2 {
        margin: 0 0 1rem;
        font-size: 1.2rem;
        color: #bfdbfe;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .panel ul {
        margin: 0;
        padding-left: 1.4rem;
        display: grid;
        gap: 0.4rem;
      }
      .panel li[data-status="done"] {
        color: #4ade80;
      }
      .panel li[data-status="pending"] {
        color: #fbbf24;
      }
      article.exhibit {
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 14px;
        padding: 1.2rem 1.4rem;
        margin-bottom: 1rem;
        background: rgba(15, 23, 42, 0.8);
      }
      article.exhibit header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 1rem;
      }
      article.exhibit h3 {
        margin: 0;
        font-size: 1.1rem;
        color: #f1f5f9;
      }
      article.exhibit span {
        font-size: 0.85rem;
        color: rgba(148, 163, 184, 0.8);
      }
      article.exhibit ul {
        margin-top: 0.75rem;
        padding-left: 1.4rem;
      }
      article.exhibit footer {
        margin-top: 0.75rem;
        font-size: 0.9rem;
        color: #fbbf24;
      }
      .comment-thread {
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 14px;
        padding: 1.25rem 1.5rem;
        margin-bottom: 1rem;
        background: rgba(15, 23, 42, 0.75);
      }
      .comment-thread h4 {
        margin: 0 0 1rem;
        text-transform: uppercase;
        font-size: 0.95rem;
        letter-spacing: 0.1em;
        color: #93c5fd;
      }
      .comment-thread ul {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 0.9rem;
      }
      .comment-thread li {
        position: relative;
        padding-left: 1.4rem;
      }
      .comment-thread li::before {
        content: '';
        position: absolute;
        left: 0.4rem;
        top: 0.4rem;
        width: 0.6rem;
        height: 0.6rem;
        border-radius: 999px;
        background: #fbbf24;
      }
      .comment-thread li[data-status="resolved"]::before {
        background: #4ade80;
      }
      .comment-thread .meta {
        font-size: 0.8rem;
        color: rgba(148, 163, 184, 0.8);
        display: flex;
        gap: 0.5rem;
      }
      .comment-thread p {
        margin: 0.35rem 0 0;
        line-height: 1.6;
      }
      .empty {
        color: rgba(148, 163, 184, 0.7);
        font-style: italic;
      }
      @media print {
        body {
          background: #ffffff;
          color: #111827;
        }
        main {
          box-shadow: none;
          background: #ffffff;
        }
        header.hero,
        .panel,
        article.exhibit,
        .comment-thread {
          background: transparent;
          color: inherit;
        }
        header.hero {
          border-bottom: 2px solid #1d4ed8;
        }
        .panel li[data-status="done"],
        .panel li[data-status="pending"] {
          color: inherit;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header class="hero">
        <h1>Investment Committee Memo</h1>
        <div class="meta">
          <span>Completion: ${overallCompletion}%</span>
          <span>Reviewer items open: ${openCommentCount}</span>
          <span>Exhibits attached: ${includedExhibits.length}</span>
        </div>
      </header>
      ${sectionHtml}
      <section class="panel">
        <h2>Review Checklist</h2>
        <ul>${checklistHtml}</ul>
      </section>
      <section class="panel">
        <h2>Exhibits</h2>
        ${exhibitsHtml}
      </section>
      <section class="panel">
        <h2>Reviewer Comment Threads</h2>
        ${commentsHtml}
      </section>
    </main>
  </body>
</html>`
  }, [
    state.sections,
    state.reviewChecklist,
    overallCompletion,
    openCommentCount,
    includedExhibits,
    commentThreads
  ])

  const contextValue = useMemo<MemoComposerContextValue>(
    () => ({
      sections: memoSections,
      reviewPrompts: memoReviewPrompts,
      state,
      updateSection,
      toggleReview,
      toggleExhibit,
      updateExhibitCaption,
      addComment,
      setCommentStatus,
      commentThreads,
      exhibits,
      wordCounts,
      overallCompletion,
      openCommentCount,
      compiledMemo,
      htmlPreview,
      syncStatus: {
        hydrated,
        isSyncing,
        lastSavedAt,
        error: syncError
      }
    }),
    [
      state,
      updateSection,
      toggleReview,
      toggleExhibit,
      updateExhibitCaption,
      addComment,
      setCommentStatus,
      commentThreads,
      exhibits,
      wordCounts,
      overallCompletion,
      openCommentCount,
      compiledMemo,
      htmlPreview,
      hydrated,
      isSyncing,
      lastSavedAt,
      syncError
    ]
  )

  return (
    <MemoComposerContext.Provider value={contextValue}>{children}</MemoComposerContext.Provider>
  )
}

export function useMemoComposer() {
  const ctx = useContext(MemoComposerContext)
  if (!ctx) throw new Error('useMemoComposer must be used within MemoComposerProvider')
  return ctx
}
