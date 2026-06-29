import { FeedbackFlow } from '@/components/feedback/feedback-flow'

// Thin wrapper kept for the existing call sites (module-rail / module-launcher).
// The real flow — screenshot capture, annotation, upload + create — lives in
// `components/feedback/feedback-flow.tsx`.
export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return <FeedbackFlow open={open} onOpenChange={onOpenChange} />
}
