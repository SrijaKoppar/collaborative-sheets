"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Cell from "./Cell"
import Toolbar from "./Toolbar"
import { useSpreadsheet } from "@/hooks/useSpreadsheet"
import { usePresence } from "@/hooks/usePresence"
import { useSelection } from "@/hooks/useSelection"
import { useHistory } from "@/hooks/useHistory"
import { CellFormat } from "@/types/spreadsheet"

const ROWS = 30
const COLS = 20

function colName(index: number) {
  return String.fromCharCode(65 + index)
}

export default function Spreadsheet({ docId }: { docId: string }) {

  const { cells, updateCell } = useSpreadsheet(docId)
  const { selectedCells, activeCellId, selectCell, selectRange, clearSelection, extendSelection, setActiveCellId } = useSelection()
  const { push: addToHistory, undo, redo, canUndo, canRedo } = useHistory(cells)

  const [user, setUser] = useState<{ name: string; color: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({})

  useEffect(() => {
    const stored = sessionStorage.getItem("sheet-user")

    if (stored) {
      setUser(JSON.parse(stored))
    } else {
      const newUser = {
        name: "User-" + Math.floor(Math.random() * 1000),
        color: `hsl(${Math.random() * 360},70%,60%)`
      }
      sessionStorage.setItem("sheet-user", JSON.stringify(newUser))
      setUser(newUser)
    }
    
    setIsLoading(false)
  }, [])

  const users = usePresence(
    docId,
    user?.name || "",
    user?.color || ""
  )

  const handleSelectCell = useCallback((cellId: string, multiSelect: boolean = false) => {
    selectCell(cellId, multiSelect)
    setActiveCellId(cellId)
  }, [selectCell, setActiveCellId])

  const handleRangeSelect = useCallback((startCellId: string, endCellId: string) => {
    selectRange(startCellId, endCellId)
  }, [selectRange])

  const handleFormat = useCallback((format: CellFormat) => {
    selectedCells.forEach(cellId => {
      const currentCell = cells[cellId] || { value: '' }
      updateCell(cellId, currentCell.value, { ...currentCell.format, ...format })
    })
    addToHistory(cells)
  }, [selectedCells, cells, updateCell, addToHistory])

  const handleUndo = useCallback(() => {
    undo()
  }, [undo])

  const handleRedo = useCallback(() => {
    redo()
  }, [redo])

  const handleResizeColumn = useCallback((colIndex: number, width: number) => {
    setColumnWidths(prev => ({ ...prev, [colIndex]: width }))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault()
          handleUndo()
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault()
          handleRedo()
        } else if (e.key === 'a' || e.key === 'A') {
          e.preventDefault()
          const allCells = new Set<string>()
          for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
              allCells.add(`${colName(c)}${r + 1}`)
            }
          }
          selectCell(Array.from(allCells)[0], false)
        }
      } else if (e.key === 'Escape') {
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, selectCell, clearSelection])

  const rows = Array.from({ length: ROWS })
  const cols = Array.from({ length: COLS })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={2} opacity="0.25" />
              <path strokeWidth={2} d="M4 12a8 8 0 018-8v0a8 8 0 016.56 12.56" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-slate-500">Loading spreadsheet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full flex flex-col h-screen">

      {/* Toolbar */}
      <Toolbar
        selectedCount={selectedCells.size}
        onFormat={handleFormat}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Selection Info */}
      {selectedCells.size > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-sm text-slate-600 flex items-center justify-between">
          <span>{selectedCells.size} cell{selectedCells.size !== 1 ? 's' : ''} selected</span>
          <button
            onClick={clearSelection}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear
          </button>
        </div>
      )}

      {/* Spreadsheet container */}
      <div className="overflow-auto border border-slate-200 flex-1 bg-white relative">
        <table className="border-collapse text-sm w-full">

          <thead className="sticky top-0 bg-slate-100 z-10">
            <tr>
              <th className="w-12 border border-slate-200 bg-slate-100 text-slate-600 font-semibold"></th>

              {cols.map((_, c) => {
                const width = columnWidths[c] || 112
                return (
                  <th
                    key={c}
                    className="border border-slate-200 px-3 py-2.5 text-slate-700 font-semibold text-center h-10 relative"
                    style={{ width: `${width}px`, minWidth: `${width}px` }}
                  >
                    {colName(c)}
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:w-1.5 transition-all"
                      onMouseDown={(e) => {
                        const startX = e.clientX
                        const startWidth = width

                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const delta = moveEvent.clientX - startX
                          const newWidth = Math.max(50, startWidth + delta)
                          handleResizeColumn(c, newWidth)
                        }

                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove)
                          document.removeEventListener('mouseup', handleMouseUp)
                        }

                        document.addEventListener('mousemove', handleMouseMove)
                        document.addEventListener('mouseup', handleMouseUp)
                      }}
                    />
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((_, r) => (
              <tr key={r}>
                <td className="border border-slate-200 text-slate-500 bg-slate-50 text-center w-12 h-9 font-medium text-xs sticky left-0 z-20">
                  {r + 1}
                </td>

                {cols.map((_, c) => {
                  const id = `${colName(c)}${r + 1}`
                  const cellData = cells[id]
                  const width = columnWidths[c] || 112

                  return (
                    <Cell
                      key={id}
                      cellId={id}
                      value={cellData?.value || ""}
                      format={cellData?.format}
                      isSelected={selectedCells.has(id)}
                      onSelect={handleSelectCell}
                      onRangeSelect={handleRangeSelect}
                      updateCell={(cellId: string, value: string) => {
                        updateCell(cellId, value)
                        addToHistory(cells)
                      }}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </div>
  )
}
