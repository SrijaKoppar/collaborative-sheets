"use client"

interface SelectionInfoProps {
  cellCount: number
  activeCellId?: string | null
  onClear?: () => void
}

export default function SelectionInfo({
  cellCount,
  activeCellId,
  onClear
}: SelectionInfoProps) {

  if (cellCount === 0) return null

  return (
    <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-25 border-b border-blue-200 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z" />
          </svg>
          <span className="font-medium text-slate-900">
            {cellCount} cell{cellCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        {activeCellId && (
          <>
            <div className="w-px h-5 bg-blue-200"></div>
            <span className="text-sm text-slate-600">
              Active: <code className="font-mono text-slate-700 font-medium">{activeCellId}</code>
            </span>
          </>
        )}
      </div>

      <button
        onClick={onClear}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded hover:bg-blue-100 transition-colors"
      >
        Clear Selection
      </button>
    </div>
  )
}
