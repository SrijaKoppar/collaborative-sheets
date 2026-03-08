"use client"

import { CellFormat } from "@/types/spreadsheet"

interface ToolbarProps {
  selectedCount?: number
  selectedFormat?: CellFormat
  onFormat?: (format: CellFormat) => void
}

export default function Toolbar({
  selectedCount = 0,
  selectedFormat = {},
  onFormat,
}: ToolbarProps) {

  const handleBold = () => {
    const newFormat = { ...selectedFormat, bold: !selectedFormat.bold }
    onFormat?.(newFormat)
  }

  const handleItalic = () => {
    const newFormat = { ...selectedFormat, italic: !selectedFormat.italic }
    onFormat?.(newFormat)
  }

  return (
    <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white shadow-sm p-1 mb-4">
      
      {/* Text Formatting Group */}
      <div className="flex items-center gap-0.5">
        <button 
          onClick={handleBold}
          title="Bold (Ctrl+B)"
          className={`p-2 rounded transition-colors duration-150 ${
            selectedFormat?.bold 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          aria-label="Bold"
          disabled={selectedCount === 0}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6V4zm0 10h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6v-8z" />
          </svg>
        </button>

        <button 
          onClick={handleItalic}
          title="Italic (Ctrl+I)"
          className={`p-2 rounded transition-colors duration-150 ${
            selectedFormat?.italic 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          aria-label="Italic"
          disabled={selectedCount === 0}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
          </svg>
        </button>
      </div>

      {/* Selection indicator */}
      {selectedCount > 0 && (
        <>
          <div className="w-px bg-slate-200 h-6 mx-1"></div>
          <span className="text-xs text-slate-500 px-2">
            {selectedCount} cell{selectedCount > 1 ? 's' : ''} selected
          </span>
        </>
      )}

    </div>
  )
}
