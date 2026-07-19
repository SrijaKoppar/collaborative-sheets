"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import Cell from "./Cell"
import Toolbar from "./Toolbar"
import { useSpreadsheet } from "@/hooks/useSpreadsheet"
import { usePresence } from "@/hooks/usePresence"
import { useSelection } from "@/hooks/useSelection"
import { useSessionUser } from "@/hooks/useSessionUser"
import { useHistory, CellEdit } from "@/hooks/useHistory"
import { buildRangeTSV, parseTSV } from "@/lib/rangeClipboard"
import { CellFormat, Cells, UserPresence } from "@/types/spreadsheet"

const ROWS = 30
const COLS = 20

function colName(index: number) {
  return String.fromCharCode(65 + index)
}

type NavigateDirection = 'up' | 'down' | 'left' | 'right'

interface SpreadsheetProps {
  docId: string
  onCellsChange?: (cells: Cells) => void
  onWriteStateChange?: (isWriting: boolean) => void
  onUsersChange?: (users: UserPresence[]) => void
}

export default function Spreadsheet({ docId, onCellsChange, onWriteStateChange, onUsersChange }: SpreadsheetProps) {

  const { cells, updateCell } = useSpreadsheet(docId)
  const {
    selectedCells,
    activeCellId,
    selectCell,
    selectRange,
    clearSelection,
    extendSelection,
    setActiveCellId,
    cellToCoords,
    coordsToCell
  } = useSelection()
  const history = useHistory()

  const user = useSessionUser()
  const isLoading = user === null
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({})

  const isDraggingRef = useRef(false)
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const users = usePresence(
    docId,
    user?.name || "",
    user?.color || ""
  )

  // Notify parent component of cell changes
  useEffect(() => {
    onCellsChange?.(cells)
  }, [cells, onCellsChange])

  // Notify parent component of presence changes so it can render them (e.g. in the header)
  useEffect(() => {
    onUsersChange?.(users)
  }, [users, onUsersChange])

  // Stop drag-select whenever the mouse button is released anywhere on the page
  useEffect(() => {
    const handleMouseUp = () => { isDraggingRef.current = false }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const setCellRef = useCallback((cellId: string, el: HTMLInputElement | null) => {
    if (el) cellRefs.current.set(cellId, el)
    else cellRefs.current.delete(cellId)
  }, [])

  // Persist a single cell edit (writes to Firestore, flashes the "saving" indicator)
  const applyEdit = useCallback((cellId: string, raw: string, format?: CellFormat) => {
    onWriteStateChange?.(true)
    updateCell(cellId, raw, format)
    setTimeout(() => onWriteStateChange?.(false), 300)
  }, [updateCell, onWriteStateChange])

  const handleUpdateCell = useCallback((cellId: string, value: string) => {
    const prevCell = cells[cellId]
    const prevRaw = prevCell?.raw ?? ""
    if (prevRaw === value) return // no real change, nothing to record or write

    history.record([{
      cellId,
      prevRaw,
      prevFormat: prevCell?.format,
      nextRaw: value,
      nextFormat: prevCell?.format
    }])
    applyEdit(cellId, value, prevCell?.format)
  }, [cells, history, applyEdit])

  const getSelectedFormat = useMemo(() => {
    if (selectedCells.size === 0) return {}
    const firstCell = Array.from(selectedCells)[0]
    return cells[firstCell]?.format || {}
  }, [selectedCells, cells])

  const handleSelectCell = useCallback((cellId: string, multiSelect: boolean = false) => {
    selectCell(cellId, multiSelect)
    setActiveCellId(cellId)
    // A plain (non-multi-select) click starts a potential drag-select.
    isDraggingRef.current = !multiSelect
  }, [selectCell, setActiveCellId])

  const handleRangeSelect = useCallback((startCellId: string, endCellId: string) => {
    selectRange(startCellId, endCellId)
  }, [selectRange])

  const handleDragEnter = useCallback((cellId: string) => {
    if (isDraggingRef.current) {
      extendSelection(cellId)
      setActiveCellId(cellId)
    }
  }, [extendSelection, setActiveCellId])

  const handleNavigate = useCallback((fromCellId: string, direction: NavigateDirection) => {
    const coords = cellToCoords(fromCellId)
    if (!coords) return

    let { col, row } = coords
    if (direction === 'up') row -= 1
    if (direction === 'down') row += 1
    if (direction === 'left') col -= 1
    if (direction === 'right') col += 1

    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return // at the edge of the grid

    const nextId = coordsToCell(col, row)
    selectCell(nextId, false)
    setActiveCellId(nextId)

    const nextInput = cellRefs.current.get(nextId)
    nextInput?.focus()
    nextInput?.select()
  }, [cellToCoords, coordsToCell, selectCell, setActiveCellId])

  const handleFormat = useCallback((format: CellFormat) => {
    const edits: CellEdit[] = []
    selectedCells.forEach(cellId => {
      const currentCell = cells[cellId] || { raw: '' }
      const nextFormat = { ...currentCell.format, ...format }
      edits.push({
        cellId,
        prevRaw: currentCell.raw,
        prevFormat: currentCell.format,
        nextRaw: currentCell.raw,
        nextFormat
      })
    })
    history.record(edits)
    edits.forEach(edit => applyEdit(edit.cellId, edit.nextRaw, edit.nextFormat))
  }, [selectedCells, cells, history, applyEdit])

  const handleClearFormat = useCallback(() => {
    const edits: CellEdit[] = []
    selectedCells.forEach(cellId => {
      const currentCell = cells[cellId] || { raw: '' }
      edits.push({
        cellId,
        prevRaw: currentCell.raw,
        prevFormat: currentCell.format,
        nextRaw: currentCell.raw,
        nextFormat: {}
      })
    })
    history.record(edits)
    edits.forEach(edit => applyEdit(edit.cellId, edit.nextRaw, edit.nextFormat))
  }, [selectedCells, cells, history, applyEdit])

  const handleUndo = useCallback(() => {
    history.undo(applyEdit)
  }, [history, applyEdit])

  const handleRedo = useCallback(() => {
    history.redo(applyEdit)
  }, [history, applyEdit])

  const handleResizeColumn = useCallback((colIndex: number, width: number) => {
    setColumnWidths(prev => ({ ...prev, [colIndex]: width }))
  }, [])

  const handleCopy = useCallback(() => {
    const tsv = buildRangeTSV(selectedCells, cells, cellToCoords, coordsToCell)
    if (!tsv) return
    navigator.clipboard?.writeText(tsv).catch(() => {})
  }, [selectedCells, cells, cellToCoords, coordsToCell])

  const handlePaste = useCallback(() => {
    if (!activeCellId) return
    const anchor = cellToCoords(activeCellId)
    if (!anchor) return

    navigator.clipboard?.readText().then((text) => {
      if (!text) return
      const grid = parseTSV(text)
      const edits: CellEdit[] = []

      grid.forEach((rowValues, rowOffset) => {
        rowValues.forEach((value, colOffset) => {
          const col = anchor.col + colOffset
          const row = anchor.row + rowOffset
          if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return

          const cellId = coordsToCell(col, row)
          const currentCell = cells[cellId]
          const prevRaw = currentCell?.raw ?? ""
          if (prevRaw === value) return

          edits.push({
            cellId,
            prevRaw,
            prevFormat: currentCell?.format,
            nextRaw: value,
            nextFormat: currentCell?.format
          })
        })
      })

      if (edits.length === 0) return
      history.record(edits)
      edits.forEach(edit => applyEdit(edit.cellId, edit.nextRaw, edit.nextFormat))
    }).catch(() => {})
  }, [activeCellId, cellToCoords, coordsToCell, cells, history, applyEdit])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault()
          const allCells = new Set<string>()
          for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
              allCells.add(`${colName(c)}${r + 1}`)
            }
          }
          selectCell(Array.from(allCells)[0], false)
        } else if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault()
          if (e.shiftKey) {
            handleRedo()
          } else {
            handleUndo()
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault()
          handleRedo()
        } else if ((e.key === 'c' || e.key === 'C') && selectedCells.size > 1) {
          // Only take over copy for genuine multi-cell ranges; a single selected
          // cell still gets normal browser/text-input copy behavior.
          e.preventDefault()
          handleCopy()
        } else if ((e.key === 'v' || e.key === 'V') && selectedCells.size > 1) {
          e.preventDefault()
          handlePaste()
        }
      } else if (e.key === 'Escape') {
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectCell, clearSelection, handleUndo, handleRedo, handleCopy, handlePaste, selectedCells])

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
        selectedFormat={getSelectedFormat}
        onFormat={handleFormat}
        onClearFormat={handleClearFormat}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
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

                  return (
                    <Cell
                      key={id}
                      cellId={id}
                      raw={cellData?.raw || ""}
                      display={cellData?.display ?? cellData?.raw ?? ""}
                      format={cellData?.format}
                      isSelected={selectedCells.has(id)}
                      onSelect={handleSelectCell}
                      onRangeSelect={handleRangeSelect}
                      onDragEnter={handleDragEnter}
                      onNavigate={handleNavigate}
                      updateCell={handleUpdateCell}
                      inputRef={(el) => setCellRef(id, el)}
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
