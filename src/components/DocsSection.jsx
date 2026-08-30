"use client"
import { useState } from "react"
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import Sheet from "@/app/dashboard/_components/Sheet"
import { DOCS_GROUPS, DOCS_TOPICS } from "@/lib/docsContent"

function ProBadge() {
  return (
    <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700">
      Pro
    </span>
  )
}

export default function DocsSection() {
  const [open, setOpen] = useState(false)
  const [activeTopicId, setActiveTopicId] = useState(null)

  const activeTopic = activeTopicId ? DOCS_TOPICS.find((topic) => topic.id === activeTopicId) : null

  const closeAll = () => {
    setOpen(false)
    setActiveTopicId(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-md3-on-surface-variant">
        Penjelasan istilah, cara kerja fitur, dan kebijakan data Artami dalam bahasa sederhana.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka Panduan Artami"
        className="w-full min-h-11 rounded-xl bg-moss-500 text-white text-sm font-bold transition-transform active:scale-[0.97] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-200 focus-visible:ring-offset-2"
      >
        <BookOpen size={16} aria-hidden="true" />
        Buka Panduan
      </button>

      <Sheet
        open={open}
        onClose={closeAll}
        title={activeTopic ? activeTopic.title : "Panduan Artami"}
        subtitle={activeTopic ? "Panduan Artami" : undefined}
        size="lg"
        ariaLabel="Panduan Artami"
      >
        {activeTopic ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setActiveTopicId(null)}
              aria-label="Kembali ke daftar panduan"
              className="min-h-11 inline-flex items-center gap-1 text-xs font-bold text-md3-on-surface-variant hover:text-md3-on-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-200 focus-visible:ring-offset-2 rounded-lg"
            >
              <ChevronLeft size={14} aria-hidden="true" />
              Semua topik
            </button>
            {activeTopic.summary && (
              <p className="text-sm font-semibold text-md3-on-surface">{activeTopic.summary}</p>
            )}
            <div className="space-y-3">
              {activeTopic.body.map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed text-md3-on-surface-variant">
                  {paragraph}
                </p>
              ))}
            </div>
            {activeTopic.bullets && (
              <ul className="space-y-2">
                {activeTopic.bullets.map((bullet, index) => (
                  <li key={index} className="flex gap-2 text-sm leading-relaxed text-md3-on-surface-variant">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sage-500" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
            {activeTopic.example && (
              <div className="rounded-xl border border-md3-outline-variant bg-md3-surface px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Contoh</p>
                <p className="mt-0.5 text-xs leading-relaxed text-md3-on-surface-variant">{activeTopic.example}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {DOCS_GROUPS.map((group) => {
              const topics = DOCS_TOPICS.filter((topic) => topic.groupId === group.id)
              if (topics.length === 0) return null
              return (
                <div key={group.id}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">
                    {group.title}
                  </p>
                  <div className="space-y-2">
                    {topics.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setActiveTopicId(topic.id)}
                        aria-label={`Buka ${topic.title}`}
                        className="w-full min-h-11 rounded-2xl border border-md3-outline-variant bg-md3-surface-container-low px-4 py-3 text-left transition-colors hover:bg-md3-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-200 focus-visible:ring-offset-2"
                      >
                        <span className="flex items-center gap-3">
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-md3-on-surface">{topic.title}</span>
                              {topic.tag === "Pro" && <ProBadge />}
                            </span>
                            {topic.summary && (
                              <span className="mt-0.5 block text-[11px] leading-relaxed text-md3-on-surface-variant">
                                {topic.summary}
                              </span>
                            )}
                          </span>
                          <ChevronRight size={14} className="flex-shrink-0 text-md3-on-surface-variant" aria-hidden="true" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Sheet>
    </div>
  )
}
