"use client"

import { forwardRef } from "react"
import { CellFormat } from "@/types/spreadsheet"

interface Props {
  cellId: string
  display: string
  format?: CellFormat
  isActive: boolean
  isSelected: boolean
  isEditing: boolean
  draftValue: string
  onDraftChange: (value: string) => void
  onCommitEdit: () => void
  onMouseDown: (cellId: string, e: React.MouseEvent) => void
  onMouseEnter: (cellId: string) => void
  onDoubleClick: (cellId: string) => void
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

/**
 * Fully controlled: this component holds no local state of its own. It's a
 * plain display cell (a div showing the computed value) unless the parent
 * says it's the one being edited, in which case it renders an input bound to
 * draftValue. All selection/edit/navigation logic lives in the parent
 * (Spreadsheet), which is what lets clicking, dragging, typing, and
 * keyboard navigation stay consistent instead of fighting each other.
 */
const Cell = forwardRef<HTMLInputElement, Props>(function Cell({
  cellId,
  display,
  format = {},
  isActive,
  isSelected,
  isEditing,
  draftValue,
  onDraftChange,
  onCommitEdit,
  onMouseDown,
  onMouseEnter,
  onDoubleClick,
  onEditKeyDown
}, ref) {

  const isError = !isEditing && display.startsWith("#")

  const cellStyle: React.CSSProperties = {
    backgroundColor: format.backgroundColor || 'white',
    color: isError ? '#dc2626' : (format.textColor || '#1f2937'),
    textAlign: format.textAlign || 'left',
    fontSize: format.fontSize ? `${format.fontSize}px` : '14px',
    fontWeight: format.bold ? 'bold' : 'normal',
    fontStyle: format.italic ? 'italic' : 'normal'
  }

  const borderClass = isActive
    ? 'border-2 border-blue-600 z-10'
    : isSelected
      ? 'border border-blue-400 bg-blue-50/60'
      : 'border border-slate-200 hover:bg-slate-50'

  return (
    <td
      className={`${borderClass} transition-colors duration-100 h-9 relative p-0 select-none`}
      onMouseDown={(e) => onMouseDown(cellId, e)}
      onMouseEnter={() => onMouseEnter(cellId)}
      onDoubleClick={() => onDoubleClick(cellId)}
      style={cellStyle}
      title={isError ? formulaErrorMessage(display) : undefined}
    >
      {isEditing ? (
        <input
          ref={ref}
          value={draftValue}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onCommitEdit}
          onKeyDown={onEditKeyDown}
          className="w-full h-full px-2 text-sm bg-transparent outline-none ring-2 ring-blue-500 ring-inset"
          style={{
            textAlign: format.textAlign || 'left',
            fontWeight: format.bold ? 'bold' : 'normal',
            fontStyle: format.italic ? 'italic' : 'normal'
          }}
        />
      ) : (
        <div
          className="w-full h-full px-2 flex items-center overflow-hidden whitespace-nowrap text-ellipsis text-sm"
          style={{
            justifyContent:
              format.textAlign === 'center' ? 'center' :
              format.textAlign === 'right' ? 'flex-end' : 'flex-start'
          }}
        >
          {display}
        </div>
      )}
    </td>
  )
})

export default Cell

function formulaErrorMessage(code: string): string {
  switch (code) {
    case "#CYCLE!": return "Circular reference detected"
    case "#REF!": return "Invalid cell reference"
    case "#VALUE!": return "Formula operand isn't a number"
    case "#DIV/0!": return "Division by zero"
    default: return "Formula error"
  }
}
