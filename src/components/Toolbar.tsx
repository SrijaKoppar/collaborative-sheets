"use client"

import { useState } from "react"
import { CellFormat } from "@/types/spreadsheet"

interface ToolbarProps {
  selectedCount?: number
  onFormat?: (format: CellFormat) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

export default function Toolbar({
  selectedCount = 0,
  onFormat,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: ToolbarProps) {

  const [formatting, setFormatting] = useState<CellFormat>({})
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showBgColorPicker, setShowBgColorPicker] = useState(false)

  const handleBold = () => {
    const newFormat = { ...formatting, bold: !formatting.bold }
    setFormatting(newFormat)
    onFormat?.(newFormat)
  }

  const handleItalic = () => {
    const newFormat = { ...formatting, italic: !formatting.italic }
    setFormatting(newFormat)
    onFormat?.(newFormat)
  }

  const handleAlign = (align: 'left' | 'center' | 'right') => {
    const newFormat = { ...formatting, textAlign: align }
    setFormatting(newFormat)
    onFormat?.(newFormat)
  }

  const handleFontSize = (size: number) => {
    const newFormat = { ...formatting, fontSize: size }
    setFormatting(newFormat)
    onFormat?.(newFormat)
  }

  const handleTextColor = (color: string) => {
    const newFormat = { ...formatting, textColor: color }
    setFormatting(newFormat)
    onFormat?.(newFormat)
    setShowColorPicker(false)
  }

  const handleBgColor = (color: string) => {
    const newFormat = { ...formatting, backgroundColor: color }
    setFormatting(newFormat)
    onFormat?.(newFormat)
    setShowBgColorPicker(false)
  }

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280']

  return (
    <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white shadow-sm p-1 mb-4 flex-wrap">
      
      {/* Text Formatting Group */}
      <div className="flex items-center gap-0.5">
        <button 
          onClick={handleBold}
          title="Bold (Ctrl+B)"
          className={`p-2 rounded transition-colors duration-150 ${
            formatting.bold 
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
            formatting.italic 
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

      <div className="w-px bg-slate-200 h-6 mx-1"></div>

      {/* Alignment Group */}
      <div className="flex items-center gap-0.5">
        <button 
          onClick={() => handleAlign('left')}
          title="Align Left"
          className={`p-2 rounded transition-colors duration-150 ${
            formatting.textAlign === 'left' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          aria-label="Align Left"
          disabled={selectedCount === 0}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z" />
          </svg>
        </button>

        <button 
          onClick={() => handleAlign('center')}
          title="Align Center"
          className={`p-2 rounded transition-colors duration-150 ${
            formatting.textAlign === 'center' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          aria-label="Align Center"
          disabled={selectedCount === 0}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 6h10v2H7V6zm-3 5h16v2H4v-2zm3 5h10v2H7v-2z" />
          </svg>
        </button>

        <button 
          onClick={() => handleAlign('right')}
          title="Align Right"
          className={`p-2 rounded transition-colors duration-150 ${
            formatting.textAlign === 'right' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          aria-label="Align Right"
          disabled={selectedCount === 0}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6h16v2H4V6zm6 5h10v2H10v-2zm-6 5h16v2H4v-2z" />
          </svg>
        </button>
      </div>

      <div className="w-px bg-slate-200 h-6 mx-1"></div>

      {/* Font Size Dropdown */}
      <select 
        value={formatting.fontSize || 14}
        onChange={(e) => handleFontSize(parseInt(e.target.value))}
        title="Font Size"
        disabled={selectedCount === 0}
        className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 text-sm hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <option value="10">10px</option>
        <option value="12">12px</option>
        <option value="14">14px</option>
        <option value="16">16px</option>
        <option value="18">18px</option>
        <option value="20">20px</option>
      </select>

      <div className="w-px bg-slate-200 h-6 mx-1"></div>

      {/* Color Pickers */}
      <div className="relative">
        <button 
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Text Color"
          className="p-2 rounded hover:bg-slate-100 transition-colors duration-150 text-slate-600 hover:text-slate-900 relative"
          aria-label="Text Color"
          disabled={selectedCount === 0}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 2L5.5 13h2.3l1.1-3h6.4l1.1 3h2.3L13 2h-2zm-1 9l1.9-5.2 1.9 5.2H10z" />
          </svg>
          <div className="absolute bottom-1 left-1 right-1 h-1 rounded" style={{ backgroundColor: formatting.textColor || '#1f2937' }}></div>
        </button>

        {showColorPicker && (
          <div className="absolute top-full left-0 mt-2 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 grid grid-cols-4 gap-1">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => handleTextColor(color)}
                className="w-6 h-6 rounded border border-slate-200 hover:border-slate-400 transition-colors"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button 
          onClick={() => setShowBgColorPicker(!showBgColorPicker)}
          title="Background Color"
          className="p-2 rounded hover:bg-slate-100 transition-colors duration-150 text-slate-600 hover:text-slate-900"
          aria-label="Background Color"
          disabled={selectedCount === 0}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
          </svg>
        </button>

        {showBgColorPicker && (
          <div className="absolute top-full left-0 mt-2 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 grid grid-cols-4 gap-1">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => handleBgColor(color)}
                className="w-6 h-6 rounded border border-slate-200 hover:border-slate-400 transition-colors"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>

      <div className="w-px bg-slate-200 h-6 mx-1"></div>

      {/* Undo/Redo */}
      <button 
        onClick={onUndo}
        title="Undo (Ctrl+Z)"
        className={`p-2 rounded transition-colors duration-150 ${
          canUndo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300'
        }`}
        aria-label="Undo"
        disabled={!canUndo}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.36 7.63 5.5l2.07-.82C21.88 9.63 18.1 8 14.47 8z" />
        </svg>
      </button>

      <button 
        onClick={onRedo}
        title="Redo (Ctrl+Y)"
        className={`p-2 rounded transition-colors duration-150 ${
          canRedo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300'
        }`}
        aria-label="Redo"
        disabled={!canRedo}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.4 10.6C16.55 9.01 14.15 8 11.5 8c-3.63 0-7.41 1.63-8.88 4.7L1 7v9h9l-3.62-3.62C7.94 13.6 9.71 14.32 11.5 14.32c1.96 0 3.73.72 5.12 1.88L16.88 17c1.08-3.14 4.1-5.4 7.59-5.4z" />
        </svg>
      </button>

    </div>
  )
}
