"use client"

import { useState } from "react"
import { CellFormat } from "@/types/spreadsheet"

type NavigateDirection = 'up' | 'down' | 'left' | 'right'

interface Props {
  cellId: string
  raw: string
  display: string
  format?: CellFormat
  isSelected?: boolean
  onSelect?: (cellId: string, multiSelect: boolean) => void
  onRangeSelect?: (startCellId: string, endCellId: string) => void
  onDragEnter?: (cellId: string) => void
  onNavigate?: (fromCellId: string, direction: NavigateDirection) => void
  updateCell: (id: string, value: string) => void
  inputRef?: (el: HTMLInputElement | null) => void
}

export default function Cell({
  cellId,
  raw,
  display,
  format = {},
  isSelected = false,
  onSelect,
  onRangeSelect,
  onDragEnter,
  onNavigate,
  updateCell,
  inputRef
}: Props) {

  const [localValue, setLocalValue] = useState(raw)
  const [editing, setEditing] = useState(false)
  const [prevRaw, setPrevRaw] = useState(raw)

  // Sync local value when the underlying raw formula changes from outside
  // (e.g. remote update), but never while the user is actively editing this cell.
  if (raw !== prevRaw && !editing) {
    setPrevRaw(raw)
    setLocalValue(raw)
  }

  function handleBlur() {
    setEditing(false)
    updateCell(cellId, localValue)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const input = e.currentTarget

    if (e.key === 'Enter') {
      e.preventDefault()
      onNavigate?.(cellId, 'down')
    } else if (e.key === 'Escape') {
      setLocalValue(raw)
      setEditing(false)
      input.blur()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      onNavigate?.(cellId, e.shiftKey ? 'left' : 'right')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      onNavigate?.(cellId, 'up')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onNavigate?.(cellId, 'down')
    } else if (e.key === 'ArrowLeft' && input.selectionStart === 0 && input.selectionEnd === 0) {
      e.preventDefault()
      onNavigate?.(cellId, 'left')
    } else if (
      e.key === 'ArrowRight' &&
      input.selectionStart === input.value.length &&
      input.selectionEnd === input.value.length
    ) {
      e.preventDefault()
      onNavigate?.(cellId, 'right')
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.shiftKey) {
      onRangeSelect?.(cellId, cellId)
    } else {
      onSelect?.(cellId, e.ctrlKey || e.metaKey)
    }
  }

  const isError = !editing && display.startsWith("#")

  const cellStyle: React.CSSProperties = {
    backgroundColor: isSelected ? '#dbeafe' : (format.backgroundColor || 'white'),
    color: isError ? '#dc2626' : (format.textColor || '#1f2937'),
    textAlign: format.textAlign || 'left',
    fontSize: format.fontSize ? `${format.fontSize}px` : '14px',
    fontWeight: format.bold ? 'bold' : 'normal',
    fontStyle: format.italic ? 'italic' : 'normal'
  }

  return (
    <td
      className={`border transition-all duration-150 h-9 relative ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-200 hover:bg-slate-50'
      }`}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => onDragEnter?.(cellId)}
      style={cellStyle}
      title={isError ? formulaErrorMessage(display) : undefined}
    >
      <input
        ref={inputRef}
        value={editing ? localValue : display}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="
          w-full h-full
          px-2
          text-sm
          bg-transparent
          outline-none
          placeholder-slate-300
          focus:bg-white
          focus:ring-2
          focus:ring-blue-500
          focus:ring-inset
          transition-shadow duration-150
        "
        placeholder=""
        style={{ color: isError ? '#dc2626' : (format.textColor || '#1f2937') }}
      />
    </td>
  )
}

function formulaErrorMessage(code: string): string {
  switch (code) {
    case "#CYCLE!": return "Circular reference detected"
    case "#REF!": return "Invalid cell reference"
    case "#VALUE!": return "Formula operand isn't a number"
    case "#DIV/0!": return "Division by zero"
    default: return "Formula error"
  }
}
