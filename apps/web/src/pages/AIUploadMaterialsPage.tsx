import { useState } from 'react'
import { Upload, FileText, Image, X, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'

type Props = { onNavigate: (page: string) => void }
type Mode  = 'upload' | 'processing' | 'done'

const mockFiles = [
  { name: 'Physics_Notes_Term2.pdf', size: '1.2 MB', type: 'pdf' },
  { name: 'Mechanics_Textbook_Ch3.pdf', size: '4.8 MB', type: 'pdf' },
]

const actions = [
  { label: 'Summarise',    desc: 'Get a concise summary of the material', page: 'ai-chat'           },
  { label: 'Generate Quiz', desc: 'Create practice questions from content', page: 'ai-quiz'          },
  { label: 'Flashcards',   desc: 'Build flashcard deck from key points',   page: 'ai-flashcards'    },
  { label: 'Study Plan',   desc: 'Build a study schedule around this',     page: 'ai-study-plan'    },
]

export default function AIUploadMaterialsPage({ onNavigate }: Props) {
  const [files, setFiles] = useState<typeof mockFiles>([])
  const [mode,  setMode]  = useState<Mode>('upload')

  function addFile() {
    if (files.length < mockFiles.length) {
      setFiles(prev => [...prev, mockFiles[prev.length]])
    }
  }

  function process() {
    setMode('processing')
    setTimeout(() => setMode('done'), 1800)
  }

  return (
    <DashboardLayout activePage="ai-tutor" onNavigate={onNavigate} title="Upload Materials" subtitle="Add notes or textbook pages for AI to analyse">
      <div className="max-w-[680px] flex flex-col gap-6">

        {mode === 'upload' && (
          <>
            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-black/20 rounded-card p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-primary hover:bg-primary/4 transition-colors"
              onClick={addFile}
            >
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload size={28} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">Drop your files here</p>
                <p className="text-sm text-muted mt-1">PDF, images, Word documents — up to 20 MB each</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors">
                  Browse Files
                </button>
                <span className="text-xs text-muted">or drag & drop</span>
              </div>
            </div>

            {/* Supported types */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-muted">
                <FileText size={13} className="text-red-500" /> PDF documents
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <Image size={13} className="text-blue-500" /> Images (PNG/JPG)
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <FileText size={13} className="text-primary" /> Word docs
              </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="bg-surface rounded-card shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-black/6">
                  <p className="text-sm font-bold text-foreground">{files.length} file{files.length > 1 ? 's' : ''} added</p>
                </div>
                <div className="divide-y divide-black/4">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="size-9 rounded-card bg-red-50 flex items-center justify-center shrink-0">
                        <FileText size={15} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{f.name}</p>
                        <p className="text-xs text-muted">{f.size}</p>
                      </div>
                      <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>
                        <X size={14} className="text-muted hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={process}
              disabled={files.length === 0}
              className="flex items-center justify-center gap-2 h-12 bg-primary text-white text-sm font-bold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles size={15} /> Analyse with AI
            </button>
          </>
        )}

        {mode === 'processing' && (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Sparkles size={36} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">Analysing your materials…</p>
              <p className="text-sm text-muted mt-1">This usually takes a few seconds</p>
            </div>
            <div className="flex items-center gap-2">
              {[0,1,2].map(i => (
                <span key={i} className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        {mode === 'done' && (
          <div className="flex flex-col gap-5">
            <div className="bg-green-50 border border-green-200 rounded-card p-4 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-700">Analysis complete!</p>
                <p className="text-xs text-green-600 mt-0.5">AI has processed {files.length} file{files.length > 1 ? 's' : ''}. What would you like to do?</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {actions.map(a => (
                <button
                  key={a.label}
                  onClick={() => onNavigate(a.page)}
                  className="flex flex-col gap-2 p-5 bg-surface rounded-card border-2 border-black/8 hover:border-primary hover:bg-primary/4 text-left transition-all"
                >
                  <Sparkles size={16} className="text-primary" />
                  <p className="text-sm font-bold text-foreground">{a.label}</p>
                  <p className="text-xs text-muted leading-relaxed">{a.desc}</p>
                  <div className="flex items-center gap-1 text-xs text-primary font-semibold mt-1">
                    Start <ArrowRight size={11} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
