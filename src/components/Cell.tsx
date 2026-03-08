"use client"

import { useState, useEffect } from "react"
import { CellFormat } from "@/types/spreadsheet"

interface Props {
  cellId: string
  value: string
  format?: CellFormat
  isSelected?: boolean
  onSelect?: (cellId: string, multiSelect: boolean) => void
  onRangeSelect?: (startCellId: string, endCellId: string) => void
  updateCell: (id: string, value: string) => void
  updateFormat?: (id: string, format: CellFormat) => void
}

export default function Cell({
  cellId,
  value,
  format = {},
  isSelected = false,
  onSelect,
  onRangeSelect,
  updateCell,
  updateFormat
}: Props) {

  const [localValue, setLocalValue] = useState(value)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) {
      setLocalValue(value)
    }
  }, [value, editing])

  function handleBlur() {
    setEditing(false)
    updateCell(cellId, localValue)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setLocalValue(value)
      setEditing(false)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      handleBlur()
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.shiftKey) {
      onRangeSelect?.(cellId, cellId)
    } else {
      onSelect?.(cellId, e.ctrlKey || e.metaKey)
    }
  }

  const cellStyle: React.CSSProperties = {
    backgroundColor: isSelected ? '#dbeafe' : (format.backgroundColor || 'white'),
    color: format.textColor || '#1f2937',
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
      style={cellStyle}
    >
      <input
        value={localValue}
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
        style={{ color: format.textColor || '#1f2937' }}
      />
    </td>
  )
}
