"use client"

import { CellFormat } from "@/types/spreadsheet"

const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32]

interface ToolbarProps {
  selectedCount?: number
  selectedFormat?: CellFormat
  onFormat?: (format: CellFormat) => void
  onClearFormat?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

export default function Toolbar({
  selectedCount = 0,
  selectedFormat = {},
  onFormat,
  onClearFormat,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: ToolbarProps) {

  const disabled = selectedCount === 0

  const handleBold = () => {
    onFormat?.({ ...selectedFormat, bold: !selectedFormat.bold })
  }

  const handleItalic = () => {
    onFormat?.({ ...selectedFormat, italic: !selectedFormat.italic })
  }

  const handleFontSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFormat?.({ ...selectedFormat, fontSize: Number(e.target.value) })
  }

  const handleTextColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormat?.({ ...selectedFormat, textColor: e.target.value })
  }

  const handleBackgroundColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormat?.({ ...selectedFormat, backgroundColor: e.target.value })
  }

  const handleAlign = (textAlign: 'left' | 'center' | 'right') => {
    onFormat?.({ ...selectedFormat, textAlign })
  }

  const buttonClass = (active: boolean) =>
    `p-2 rounded transition-colors duration-150 ${
      active
        ? 'bg-blue-100 text-blue-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    } disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed`

  return (
    <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white shadow-sm p-1 mb-4 flex-wrap">

      {/* Undo/Redo Group */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          className={buttonClass(false)}
          aria-label="Undo"
          disabled={!canUndo}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L4 10m0 0l5-5m-5 5h11a4 4 0 010 8h-1" />
          </svg>
        </button>

        <button
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
          className={buttonClass(false)}
          aria-label="Redo"
          disabled={!canRedo}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l5-5m0 0l-5-5m5 5H9a4 4 0 000 8h1" />
          </svg>
        </button>
      </div>

      <div className="w-px bg-slate-200 h-6 mx-1"></div>

      {/* Font size */}
      <select
        value={selectedFormat.fontSize || 14}
        onChange={handleFontSize}
        disabled={disabled}
        title="Font size"
        aria-label="Font size"
        className="text-sm border border-slate-200 rounded px-1.5 py-1.5 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
      >
        {FONT_SIZES.map(size => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>

      <div className="w-px bg-slate-200 h-6 mx-1"></div>

      {/* Text Formatting Group */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={handleBold}
          title="Bold (Ctrl+B)"
          className={buttonClass(!!selectedFormat?.bold)}
          aria-label="Bold"
          disabled={disabled}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6V4zm0 10h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6v-8z" />
          </svg>
        </button>

        <button
          onClick={handleItalic}
          title="Italic (Ctrl+I)"
          className={buttonClass(!!selectedFormat?.italic)}
          aria-label="Italic"
          disabled={disabled}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
          </svg>
        </button>
      </div>

      <div className="w-px bg-slate-200 h-6 mx-1"></div>

      {/* Alignment Group */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => handleAlign('left')}
          title="Align left"
          className={buttonClass(selectedFormat.textAlign === 'left' || !selectedFormat.textAlign)}
          aria-label="Align left"
          disabled={disabled}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h13" />
          </svg>
        </button>

        <button
          onClick={() => handleAlign('center')}
          title="Align center"
          className={buttonClass(selectedFormat.textAlign === 'center')}
          aria-label="Align center"
          disabled={disabled}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5.5 18h13" />
          </svg>
        </button>

        <button
          onClick={() => handleAlign('right')}
          title="Align right"
          className={buttonClass(selectedFormat.textAlign === 'right')}
          aria-label="Align right"
          disabled={disabled}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M7 18h13" />
          </svg>
        </button>
      </div>

      <div className="w-px bg-slate-200 h-6 mx-1"></div>

      {/* Color Group */}
      <div className="flex items-center gap-1.5">
        <label
          title="Text color"
          className={`flex flex-col items-center gap-0.5 px-1 cursor-pointer ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <span className="text-sm font-semibold leading-none text-slate-700">A</span>
          <input
            type="color"
            value={selectedFormat.textColor || '#1f2937'}
            onChange={handleTextColor}
            disabled={disabled}
            aria-label="Text color"
            className="w-5 h-1.5 border-0 p-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </label>

        <label
          title="Background color"
          className={`flex flex-col items-center gap-0.5 px-1 cursor-pointer ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 4h16v16H4z" opacity="0.15" />
            <path d="M4 4h16v4H4z" />
          </svg>
          <input
            type="color"
            value={selectedFormat.backgroundColor || '#ffffff'}
            onChange={handleBackgroundColor}
            disabled={disabled}
            aria-label="Background color"
            className="w-5 h-1.5 border-0 p-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </label>
      </div>

      <div className="w-px bg-slate-200 h-6 mx-1"></div>

      {/* Clear formatting */}
      <button
        onClick={onClearFormat}
        title="Clear formatting"
        className={buttonClass(false)}
        aria-label="Clear formatting"
        disabled={disabled}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 3l4 4-9.5 9.5H7L3 12l9.5-9.5H17zM7 16.5L3 20h4l3.5-3.5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20h16" />
        </svg>
      </button>

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
