"use client"
export default function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-md3-surface flex items-center justify-center mb-3 text-earth-400">
        {icon}
      </div>
      <p className="text-sm font-semibold text-md3-on-surface-variant mb-1">{title}</p>
      {hint && <p className="text-xs text-md3-on-surface-variant mb-3 max-w-[220px]">{hint}</p>}
      {action}
    </div>
  )
}
