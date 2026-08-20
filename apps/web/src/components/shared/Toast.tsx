import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id:      number
  message: string
  type:    ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const icons = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
}

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-700',
  info:    'bg-primary/6 border-primary/20 text-primary',
}

const iconStyles = {
  success: 'text-green-500',
  error:   'text-red-500',
  info:    'text-primary',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  function dismiss(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast stack */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map(t => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg text-sm font-semibold pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[220px] max-w-[360px] ${styles[t.type]}`}
            >
              <Icon size={16} className={`shrink-0 ${iconStyles[t.type]}`} />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-50 hover:opacity-100">
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
