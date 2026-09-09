"use client"

import { useRef } from "react"
import { CellFormat, MixedCellFormat } from "@/types/spreadsheet"

const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32]

interface ToolbarProps {
  selectedCount?: number
  selectedFormat?: MixedCellFormat
  onFormat?: (format: Partial<CellFormat>) => void
  onClearFormat?: () => void
  onClearContents?: () => void
  onClearSelection?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

function resolveColor(value: string | 'mixed' | undefined, fallback: string): string {
  return (typeof value === 'string' && value !== 'mixed') ? value : fallback
}

export default function Toolbar({
  selectedCount = 0,
  selectedFormat = {},
  onFormat,
  onClearFormat,
  onClearContents,
  onClearSelection,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: ToolbarProps) {

  const disabled = selectedCount === 0
  const clearMenuRef = useRef<HTMLDetailsElement>(null)

  const closeClearMenu = () => {
    if (clearMenuRef.current) clearMenuRef.current.open = false
  }

  // Every handler below sends only the field it's actually changing - never
  // the whole selectedFormat - since selectedFormat can carry "mixed" for
  // other fields, and spreading that wholesale would write the literal
  // string "mixed" into cells that were previously in full agreement.
  const handleBold = () => {
    onFormat?.({ bold: selectedFormat.bold !== true })
  }

  const handleItalic = () => {
    onFormat?.({ italic: selectedFormat.italic !== true })
  }

  const handleFontSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFormat?.({ fontSize: Number(e.target.value) })
  }

  const handleTextColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormat?.({ textColor: e.target.value })
  }

  const handleBackgroundColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormat?.({ backgroundColor: e.target.value })
  }

  const handleAlign = (textAlign: 'left' | 'center' | 'right') => {
    onFormat?.({ textAlign })
  }

  const buttonClass = (state: 'active' | 'mixed' | 'inactive') => {
    const base = 'p-2 rounded transition-colors duration-150 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed'
    if (state === 'active') return `${base} bg-blue-100 text-blue-700`
    if (state === 'mixed') return `${base} bg-blue-50 text-blue-400 ring-1 ring-inset ring-blue-200`
    return `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900`
  }

  const boldState = selectedFormat.bold === 'mixed' ? 'mixed' : selectedFormat.bold ? 'active' : 'inactive'
  const italicState = selectedFormat.italic === 'mixed' ? 'mixed' : selectedFormat.italic ? 'active' : 'inactive'
  const isFontSizeMixed = selectedFormat.fontSize === 'mixed'
  const isTextColorMixed = selectedFormat.textColor === 'mixed'
  const isBackgroundColorMixed = selectedFormat.backgroundColor === 'mixed'

  return (
    <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white shadow-sm p-1 mb-4 flex-wrap text-sm">

      {/* Undo/Redo Group */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          className={buttonClass('inactive')}
          aria-label="Undo"
          disabled={!canUndo}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L4 10m0 0l5-5m-5 5h11a4 4 0 010 8h-1" />
          </svg>
        </button>

        <button
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
          className={buttonClass('inactive')}
          aria-label="Redo"
          disabled={!canRedo}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l5-5m0 0l-5-5m5 5H9a4 4 0 000 8h1" />
          </svg>
        </button>
      </div>

      <div className="w-px bg-slate-200 h-5 mx-0.5"></div>

      {/* Font size */}
      <select
        value={isFontSizeMixed ? '' : (selectedFormat.fontSize || 14)}
        onChange={handleFontSize}
        disabled={disabled}
        title="Font size"
        aria-label="Font size"
        className="text-sm border border-slate-200 rounded px-1 py-1 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 w-16"
      >
        {isFontSizeMixed && <option value="">Mixed</option>}
        {FONT_SIZES.map(size => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>

      <div className="w-px bg-slate-200 h-5 mx-0.5"></div>

      {/* Text Formatting Group */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={handleBold}
          title={boldState === 'mixed' ? "Bold (mixed in selection)" : "Bold (Ctrl+B)"}
          className={buttonClass(boldState)}
          aria-label="Bold"
          disabled={disabled}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6V4zm0 10h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6v-8z" />
          </svg>
        </button>

        <button
          onClick={handleItalic}
          title={italicState === 'mixed' ? "Italic (mixed in selection)" : "Italic (Ctrl+I)"}
          className={buttonClass(italicState)}
          aria-label="Italic"
          disabled={disabled}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
          </svg>
        </button>
      </div>

      <div className="w-px bg-slate-200 h-5 mx-0.5"></div>

      {/* Alignment Group - "mixed" naturally shows as none of the three active */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => handleAlign('left')}
          title="Align left"
          className={buttonClass(selectedFormat.textAlign === 'left' || !selectedFormat.textAlign ? 'active' : 'inactive')}
          aria-label="Align left"
          disabled={disabled}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h13" />
          </svg>
        </button>

        <button
          onClick={() => handleAlign('center')}
          title="Align center"
          className={buttonClass(selectedFormat.textAlign === 'center' ? 'active' : 'inactive')}
          aria-label="Align center"
          disabled={disabled}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5.5 18h13" />
          </svg>
        </button>

        <button
          onClick={() => handleAlign('right')}
          title="Align right"
          className={buttonClass(selectedFormat.textAlign === 'right' ? 'active' : 'inactive')}
          aria-label="Align right"
          disabled={disabled}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M7 18h13" />
          </svg>
        </button>
      </div>

      <div className="w-px bg-slate-200 h-5 mx-0.5"></div>

      {/* Color Group */}
      <div className="flex items-center gap-1">
        <label
          title={isTextColorMixed ? "Text color (mixed in selection)" : "Text color"}
          className={`relative flex flex-col items-center gap-0.5 px-1 cursor-pointer ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <span className="text-sm font-semibold leading-none text-slate-700">A</span>
          <input
            type="color"
            value={resolveColor(selectedFormat.textColor, '#1f2937')}
            onChange={handleTextColor}
            disabled={disabled}
            aria-label="Text color"
            className="w-5 h-1.5 border-0 p-0 cursor-pointer disabled:cursor-not-allowed"
          />
          {isTextColorMixed && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />}
        </label>

        <label
          title={isBackgroundColorMixed ? "Background color (mixed in selection)" : "Background color"}
          className={`relative flex flex-col items-center gap-0.5 px-1 cursor-pointer ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 4h16v16H4z" opacity="0.15" />
            <path d="M4 4h16v4H4z" />
          </svg>
          <input
            type="color"
            value={resolveColor(selectedFormat.backgroundColor, '#ffffff')}
            onChange={handleBackgroundColor}
            disabled={disabled}
            aria-label="Background color"
            className="w-5 h-1.5 border-0 p-0 cursor-pointer disabled:cursor-not-allowed"
          />
          {isBackgroundColorMixed && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />}
        </label>
      </div>

      <div className="w-px bg-slate-200 h-5 mx-0.5"></div>

      {/* Clear menu - formatting and contents are separate, deliberate actions */}
      <details ref={clearMenuRef} className="relative">
        <summary
          title="Clear"
          aria-label="Clear"
          className={`list-none p-2 rounded transition-colors duration-150 cursor-pointer flex items-center gap-0.5 ${
            disabled
              ? 'opacity-30 pointer-events-none'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 3l4 4-9.5 9.5H7L3 12l9.5-9.5H17zM7 16.5L3 20h4l3.5-3.5" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20h16" />
          </svg>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>

        <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
          <button
            onClick={() => { onClearFormat?.(); closeClearMenu() }}
            className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Clear formatting
          </button>
          <button
            onClick={() => { onClearContents?.(); closeClearMenu() }}
            className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Clear contents
          </button>
          <button
            onClick={() => { onClearContents?.(); onClearFormat?.(); closeClearMenu() }}
            className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-100"
          >
            Clear all
          </button>
        </div>
      </details>

      {/* Selection indicator */}
      {selectedCount > 1 && (
        <>
          <div className="w-px bg-slate-200 h-5 mx-0.5"></div>
          <span className="text-xs text-slate-500 pl-2">
            {selectedCount} cells selected
          </span>
          <button
            onClick={onClearSelection}
            title="Clear selection (Esc)"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2"
          >
            Clear
          </button>
        </>
      )}

    </div>
  )
}
