"use client"
import { cloneElement, isValidElement } from "react"

function withTouchTarget(action) {
  if (!isValidElement(action)) return action

  return cloneElement(action, {
    className: ["min-h-11", "min-w-11", action.props.className].filter(Boolean).join(" "),
  })
}

export default function FeatureEducation({ title, description, steps, action, example }) {
  return (
    <article className="rounded-2xl border border-md3-outline-variant bg-md3-surface-container-lowest p-4 shadow-warm">
      <div className="mb-4">
        <h3 className="text-base font-display font-bold text-md3-on-surface">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-md3-on-surface-variant">{description}</p>
      </div>

      <ol className="grid grid-cols-2 gap-2" aria-label="Langkah">
        {steps.map((step, index) => (
          <li key={`${step.title}-${index}`} className="rounded-xl border border-md3-outline-variant bg-md3-surface-container-low p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-md3-surface-container-lowest text-sage-600 shadow-sm">
              {step.icon}
            </div>
            <h4 className="mt-2 text-xs font-bold text-md3-on-surface">{step.title}</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-md3-on-surface-variant">{step.description}</p>
          </li>
        ))}
      </ol>

      {example && (
        <div className="mt-3 rounded-xl border border-md3-outline-variant bg-md3-surface px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Contoh</p>
          <p className="mt-0.5 text-xs font-semibold text-md3-on-surface-variant">{example}</p>
        </div>
      )}

      {action && <div className="mt-4 flex">{withTouchTarget(action)}</div>}
    </article>
  )
}
