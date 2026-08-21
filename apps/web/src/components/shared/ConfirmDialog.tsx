import { AlertTriangle } from 'lucide-react'

interface Props {
  open:        boolean
  title:       string
  body:        string
  confirmLabel?: string
  cancelLabel?:  string
  danger?:     boolean
  onConfirm:   () => void
  onCancel:    () => void
}

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  danger       = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3">
          <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-foreground mb-1">{title}</h2>
            <p className="text-sm text-muted leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="h-9 px-4 border border-black/20 rounded-full text-sm font-semibold text-muted hover:text-foreground transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`h-9 px-5 rounded-full text-sm font-bold text-white transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-deep shadow-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
