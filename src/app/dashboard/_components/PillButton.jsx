"use client"
export default function PillButton({ active, onClick, children, color = "primary" }) {
  const colorMap = {
    primary: { active: "bg-earth-800 text-white", idle: "text-md3-on-surface-variant hover:bg-md3-surface-container-lowest" },
    income: { active: "bg-sage-500 text-white", idle: "text-sage-600 hover:bg-sage-50" },
    expense: { active: "bg-clay-500 text-white", idle: "text-clay-600 hover:bg-clay-50" },
    savings: { active: "bg-moss-500 text-white", idle: "text-moss-600 hover:bg-moss-50" },
  }
  const c = colorMap[color] || colorMap.primary
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${active ? c.active : c.idle} ${active ? "shadow-sm" : ""}`}
    >
      {children}
    </button>
  )
}
