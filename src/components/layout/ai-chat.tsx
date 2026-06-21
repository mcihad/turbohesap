import * as React from 'react'
import { Send, Sparkles, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useLayout } from '@/lib/layout/use-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
}

const SEED: Message[] = [
  {
    id: 1,
    role: 'assistant',
    text: "Hi! I'm your workspace assistant. Ask me to summarize a page, draft content, or find something.",
  },
]

const SUGGESTIONS = [
  'Summarize this dashboard',
  'Create a new project',
  'Show overdue invoices',
]

/** Floating AI assistant: a FAB pinned bottom-right that opens a chat dock. */
export function AiChat() {
  const { aiOpen, setAiOpen } = useLayout()
  const [messages, setMessages] = React.useState<Message[]>(SEED)
  const [input, setInput] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const send = (text: string) => {
    const value = text.trim()
    if (!value) return
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'user', text: value },
      {
        id: Date.now() + 1,
        role: 'assistant',
        text: 'This is a demo response. Wire me to your model endpoint to make it real.',
      },
    ])
    setInput('')
  }

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' })
  }, [messages])

  return (
    <>
      {/* Floating action button */}
      <Button
        size="icon-lg"
        aria-label="Open AI assistant"
        onClick={() => setAiOpen(!aiOpen)}
        className={cn(
          'fixed right-5 bottom-[calc(var(--app-footer-height)+1.25rem)] z-[var(--app-z-fab)] size-12 rounded-full shadow-lg transition-transform hover:scale-105',
          aiOpen && 'scale-0 opacity-0',
        )}
      >
        <Sparkles className="size-5" />
      </Button>

      {/* Chat dock */}
      <div
        className={cn(
          'fixed right-5 bottom-[calc(var(--app-footer-height)+1.25rem)] z-[var(--app-z-fab)] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl transition-all duration-300',
          aiOpen
            ? 'pointer-events-auto h-[min(34rem,calc(100vh-var(--app-footer-height)-6rem))] opacity-100'
            : 'pointer-events-none h-0 translate-y-4 opacity-0',
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">AI Assistant</p>
              <p className="text-2xs text-muted-foreground">Always here to help</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close assistant"
            onClick={() => setAiOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div ref={scrollRef} className="flex flex-col gap-3 p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  m.role === 'user'
                    ? 'self-end bg-primary text-primary-foreground'
                    : 'self-start bg-muted',
                )}
              >
                {m.text}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-3">
          {messages.length <= 1 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="h-9"
            />
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
