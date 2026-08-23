"use client"

// MD3 segmented buttons: connected full-rounded group, mutually exclusive
// selection. Selected = secondary-container bg + on-secondary-container text;
// unselected = transparent + on-surface-variant; outline-variant divider
// between segments (hidden next to the selected one). Min target height 40px.
export default function SegmentedButtons({ options, value, onChange, ariaLabel, className = "" }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex w-full overflow-hidden rounded-full border border-md3-outline-variant ${className}`}
    >
      {options.map((option, index) => {
        const selected = option === value
        const showDivider = index > 0 && !selected && options[index - 1] !== value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={`min-h-[40px] flex-1 px-3 text-xs font-bold transition-colors ${
              selected
                ? "bg-md3-secondary-container text-md3-on-secondary-container"
                : "text-md3-on-surface-variant hover:bg-md3-surface-container-high"
            } ${showDivider ? "border-l border-md3-outline-variant" : ""}`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
