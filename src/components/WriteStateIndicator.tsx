"use client"

interface WriteStateIndicatorProps {
  isWriting?: boolean
  lastSaved?: Date
  error?: string | null
}

export default function WriteStateIndicator({
  isWriting = false,
  lastSaved,
  error = null
}: WriteStateIndicatorProps) {

  const showSaving = isWriting
  const displayText = error
    ? "Save failed"
    : isWriting
    ? "Saving..."
    : lastSaved
      ? `Saved at ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : "All changes saved"

  return (
    <div
      className="flex items-center gap-2 text-xs text-slate-500"
      title={error || undefined}
    >
      {error ? (
        <>
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-red-700">{displayText}</span>
        </>
      ) : showSaving ? (
        <>
          <div className="animate-spin">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={2} opacity="0.25" />
              <path strokeWidth={2} d="M4 12a8 8 0 018-8v0a8 8 0 016.56 12.56" strokeLinecap="round" />
            </svg>
          </div>
          <span>{displayText}</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span className="text-green-700">{displayText}</span>
        </>
      )}
    </div>
  )
}
