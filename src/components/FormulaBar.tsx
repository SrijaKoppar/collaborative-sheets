"use client"

interface FormulaBarProps {
  activeCellId: string | null
  value: string
  onChange: (value: string) => void
  onFocusEdit: () => void
  onCommit: () => void
  onCancel: () => void
  onBlurCommit: () => void
  errorMessage?: string
}

export default function FormulaBar({
  activeCellId,
  value,
  onChange,
  onFocusEdit,
  onCommit,
  onCancel,
  onBlurCommit,
  errorMessage
}: FormulaBarProps) {

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onCommit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="flex items-center gap-2 border border-slate-200 border-t-0 bg-white px-2 py-1.5">
      <div className="w-16 shrink-0 text-center text-xs font-semibold text-slate-500 border-r border-slate-200 pr-2 select-none">
        {activeCellId || ""}
      </div>

      <span className="text-sm italic text-slate-400 font-serif shrink-0 select-none w-4 text-center">fx</span>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocusEdit}
        onBlur={onBlurCommit}
        onKeyDown={handleKeyDown}
        disabled={!activeCellId}
        placeholder={activeCellId ? "" : "Select a cell"}
        className="flex-1 text-sm outline-none bg-transparent disabled:text-slate-400 py-1"
      />

      {errorMessage && (
        <span className="text-xs text-red-600 shrink-0 whitespace-nowrap">{errorMessage}</span>
      )}
    </div>
  )
}
