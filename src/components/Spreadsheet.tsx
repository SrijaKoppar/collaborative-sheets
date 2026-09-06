"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import Cell, { formulaErrorMessage } from "./Cell"
import Toolbar from "./Toolbar"
import FormulaBar from "./FormulaBar"
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
    toggleCell,
    extendTo,
    selectAll,
    selectRowRange,
    selectColumnRange,
    selectionBounds,
    isRectangularSelection,
    clearSelection,
    cellToCoords,
    coordsToCell
  } = useSelection({ cols: COLS, rows: ROWS })
  const history = useHistory()

  const user = useSessionUser()
  const isLoading = user === null
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({})

  // Which cell (if any) currently has an editable input, and its in-progress raw text.
  const [editingCellId, setEditingCellId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState("")
  const cursorModeRef = useRef<'end' | 'select-all'>('end')
  // Tracks which UI actually initiated the current edit, so the focus effect
  // below only steals focus into the grid's input when editing started there
  // (not when the user is typing directly in the formula bar).
  const editFocusTargetRef = useRef<'grid' | 'formula-bar'>('grid')

  const isDraggingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const editingInputRef = useRef<HTMLInputElement>(null)
  // Guards against the edit-ending focus shift (below) re-triggering itself:
  // committing/canceling calls containerRef.focus(), which blurs the still-
  // mounted cell input, which would otherwise fire onBlur -> commitEdit()
  // a second time (or override a cancel with an unwanted commit).
  const isEndingEditRef = useRef(false)

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

  // Whenever we enter edit mode, focus the cell's input and place the cursor
  // (end of text, or select-all so typing immediately overwrites).
  useEffect(() => {
    if (editingCellId && editFocusTargetRef.current === 'grid' && editingInputRef.current) {
      const input = editingInputRef.current
      input.focus()
      if (cursorModeRef.current === 'select-all') {
        input.select()
      } else {
        const len = input.value.length
        input.setSelectionRange(len, len)
      }
    }
  }, [editingCellId])

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

  // --- Edit mode -------------------------------------------------------

  const enterEditMode = useCallback((cellId: string, options?: { seed?: string; selectAllText?: boolean }) => {
    editFocusTargetRef.current = 'grid'
    setEditingCellId(cellId)
    setDraftValue(options?.seed !== undefined ? options.seed : (cells[cellId]?.raw ?? ""))
    cursorModeRef.current = options?.selectAllText ? 'select-all' : 'end'
  }, [cells])

  const computeNextCellId = useCallback((fromCellId: string, direction: NavigateDirection) => {
    const coords = cellToCoords(fromCellId)
    if (!coords) return null
    let { col, row } = coords
    if (direction === 'up') row -= 1
    if (direction === 'down') row += 1
    if (direction === 'left') col -= 1
    if (direction === 'right') col += 1
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null
    return coordsToCell(col, row)
  }, [cellToCoords, coordsToCell])

  // Commits the current draft (if any) and, optionally, moves the active cell afterward.
  const commitEdit = useCallback((moveDirection?: NavigateDirection) => {
    if (!editingCellId || isEndingEditRef.current) return
    isEndingEditRef.current = true

    const cellId = editingCellId
    const value = draftValue

    setEditingCellId(null)
    setDraftValue("")
    handleUpdateCell(cellId, value)

    if (moveDirection) {
      const nextId = computeNextCellId(cellId, moveDirection)
      if (nextId) selectCell(nextId)
    }
    containerRef.current?.focus()

    // Release the guard on the next tick, once any same-edit blur has had a
    // chance to occur and be safely no-op'd above; a later, genuinely new
    // edit will always start from a fresh call anyway.
    setTimeout(() => { isEndingEditRef.current = false }, 0)
  }, [editingCellId, draftValue, handleUpdateCell, computeNextCellId, selectCell])

  const cancelEdit = useCallback(() => {
    // Same guard as commitEdit: focusing the container below blurs the still-
    // mounted input, which would otherwise trigger onBlur -> commitEdit() and
    // commit the very draft Escape is meant to discard.
    if (isEndingEditRef.current) return
    isEndingEditRef.current = true

    setEditingCellId(null)
    setDraftValue("")
    containerRef.current?.focus()

    setTimeout(() => { isEndingEditRef.current = false }, 0)
  }, [])

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit(e.shiftKey ? 'up' : 'down')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit(e.shiftKey ? 'left' : 'right')
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
    // Arrow keys are intentionally left alone here: while editing, they move
    // the text cursor within the input rather than navigating cells.
  }, [commitEdit, cancelEdit])

  // --- Selection / mouse -------------------------------------------------

  const handleCellMouseDown = useCallback((cellId: string, e: React.MouseEvent) => {
    if (editingCellId === cellId) return // let the input handle its own click/cursor placement

    if (e.shiftKey) {
      extendTo(cellId)
    } else if (e.ctrlKey || e.metaKey) {
      toggleCell(cellId)
    } else {
      selectCell(cellId)
      isDraggingRef.current = true
    }

    containerRef.current?.focus()
  }, [editingCellId, extendTo, toggleCell, selectCell])

  const handleCellMouseEnter = useCallback((cellId: string) => {
    if (isDraggingRef.current) {
      extendTo(cellId)
    }
  }, [extendTo])

  const handleCellDoubleClick = useCallback((cellId: string) => {
    selectCell(cellId)
    enterEditMode(cellId)
  }, [selectCell, enterEditMode])

  const handleRowHeaderMouseDown = useCallback((row: number, e: React.MouseEvent) => {
    selectRowRange(row, e.shiftKey)
    containerRef.current?.focus()
  }, [selectRowRange])

  const handleColumnHeaderMouseDown = useCallback((col: number, e: React.MouseEvent) => {
    selectColumnRange(col, e.shiftKey)
    containerRef.current?.focus()
  }, [selectColumnRange])

  const isRowFullySelected = useCallback((row: number) => {
    for (let col = 0; col < COLS; col++) {
      if (!selectedCells.has(coordsToCell(col, row))) return false
    }
    return true
  }, [selectedCells, coordsToCell])

  const isColumnFullySelected = useCallback((col: number) => {
    for (let row = 0; row < ROWS; row++) {
      if (!selectedCells.has(coordsToCell(col, row))) return false
    }
    return true
  }, [selectedCells, coordsToCell])

  // --- Formula bar ---------------------------------------------------

  // Focusing the formula bar (when the active cell isn't already being
  // edited) starts editing that cell, seeded with its current raw value.
  // The actual typing happens in the formula bar's own input, so we don't
  // touch editFocusTargetRef/cursor placement here - see the focus effect above.
  const handleFormulaBarFocus = useCallback(() => {
    if (!activeCellId) return
    if (editingCellId !== activeCellId) {
      editFocusTargetRef.current = 'formula-bar'
      setEditingCellId(activeCellId)
      setDraftValue(cells[activeCellId]?.raw ?? "")
    }
  }, [activeCellId, editingCellId, cells])

  const handleFormulaBarChange = useCallback((value: string) => {
    if (activeCellId && editingCellId !== activeCellId) {
      editFocusTargetRef.current = 'formula-bar'
      setEditingCellId(activeCellId)
    }
    setDraftValue(value)
  }, [activeCellId, editingCellId])

  const handleFormulaBarCommit = useCallback(() => {
    commitEdit('down')
  }, [commitEdit])

  const handleFormulaBarBlur = useCallback(() => {
    commitEdit()
  }, [commitEdit])

  const handleFormulaBarCancel = useCallback(() => {
    cancelEdit()
  }, [cancelEdit])

  const formulaBarValue = editingCellId === activeCellId && activeCellId
    ? draftValue
    : (activeCellId ? cells[activeCellId]?.raw ?? "" : "")

  const formulaBarError = useMemo(() => {
    if (!activeCellId || editingCellId === activeCellId) return undefined
    const display = cells[activeCellId]?.display
    return display?.startsWith("#") ? formulaErrorMessage(display) : undefined
  }, [activeCellId, editingCellId, cells])

  // Show "A1:C5" for a simple rectangular multi-cell selection, otherwise
  // just the active cell's own address (matches how spreadsheets' Name Box behaves).
  const selectionAddress = useMemo(() => {
    if (selectedCells.size > 1 && isRectangularSelection && selectionBounds) {
      const start = coordsToCell(selectionBounds.minCol, selectionBounds.minRow)
      const end = coordsToCell(selectionBounds.maxCol, selectionBounds.maxRow)
      return `${start}:${end}`
    }
    return activeCellId || ""
  }, [selectedCells, isRectangularSelection, selectionBounds, coordsToCell, activeCellId])

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

  // Delete/Backspace: clear the content of every selected cell, keeping formatting.
  const handleClearSelectedCells = useCallback(() => {
    const edits: CellEdit[] = []
    selectedCells.forEach(cellId => {
      const currentCell = cells[cellId]
      const prevRaw = currentCell?.raw ?? ""
      if (prevRaw === "") return // already empty, nothing to clear

      edits.push({
        cellId,
        prevRaw,
        prevFormat: currentCell?.format,
        nextRaw: "",
        nextFormat: currentCell?.format
      })
    })
    if (edits.length === 0) return
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

  // --- Grid-level keyboard handling (only when not editing a cell) -------

  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editingCellId) return // the cell's own input handles keys while editing

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        selectAll()
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault()
        if (e.shiftKey) handleRedo(); else handleUndo()
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault()
        handleRedo()
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        handleCopy()
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault()
        handlePaste()
      }
      return
    }

    if (e.key === 'Escape') {
      clearSelection()
      return
    }

    if (!activeCellId) return

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      const direction: NavigateDirection =
        e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowDown' ? 'down' : e.key === 'ArrowLeft' ? 'left' : 'right'
      const nextId = computeNextCellId(activeCellId, direction)
      if (!nextId) return
      if (e.shiftKey) extendTo(nextId)
      else selectCell(nextId)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const nextId = computeNextCellId(activeCellId, e.shiftKey ? 'left' : 'right')
      if (nextId) selectCell(nextId)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const nextId = computeNextCellId(activeCellId, e.shiftKey ? 'up' : 'down')
      if (nextId) selectCell(nextId)
      else enterEditMode(activeCellId) // no cell below/above: just start editing in place
    } else if (e.key === 'F2') {
      e.preventDefault()
      enterEditMode(activeCellId)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      handleClearSelectedCells()
    } else if (e.key.length === 1 && !e.altKey) {
      // Any other printable character: start editing this cell, replacing its content.
      e.preventDefault()
      enterEditMode(activeCellId, { seed: e.key })
    }
  }, [
    editingCellId, activeCellId, selectAll, handleUndo, handleRedo, handleCopy, handlePaste,
    extendTo, selectCell, enterEditMode, computeNextCellId, clearSelection, handleClearSelectedCells
  ])

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
        onClearSelection={clearSelection}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
      />

      <FormulaBar
        activeCellId={selectionAddress}
        value={formulaBarValue}
        onChange={handleFormulaBarChange}
        onFocusEdit={handleFormulaBarFocus}
        onCommit={handleFormulaBarCommit}
        onCancel={handleFormulaBarCancel}
        onBlurCommit={handleFormulaBarBlur}
        errorMessage={formulaBarError}
      />

      {/* Spreadsheet container */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleContainerKeyDown}
        className="overflow-auto border border-slate-200 flex-1 bg-white relative outline-none"
      >
        <table className="border-collapse text-sm w-full">

          <thead className="sticky top-0 bg-slate-100 z-10">
            <tr>
              <th
                onMouseDown={() => selectAll()}
                title="Select all"
                className="w-12 border border-slate-200 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              ></th>

              {cols.map((_, c) => {
                const width = columnWidths[c] || 112
                return (
                  <th
                    key={c}
                    onMouseDown={(e) => handleColumnHeaderMouseDown(c, e)}
                    className={`border px-3 py-2.5 font-semibold text-center h-10 relative cursor-pointer select-none ${
                      isColumnFullySelected(c)
                        ? 'border-blue-300 bg-blue-100 text-blue-700'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                    style={{ width: `${width}px`, minWidth: `${width}px` }}
                  >
                    {colName(c)}
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:w-1.5 transition-all"
                      onMouseDown={(e) => {
                        e.stopPropagation() // don't also trigger column selection
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
                <td
                  onMouseDown={(e) => handleRowHeaderMouseDown(r, e)}
                  className={`border text-center w-12 h-9 font-medium text-xs sticky left-0 z-20 cursor-pointer select-none ${
                    isRowFullySelected(r)
                      ? 'border-blue-300 bg-blue-100 text-blue-700'
                      : 'border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-200'
                  }`}
                >
                  {r + 1}
                </td>

                {cols.map((_, c) => {
                  const id = `${colName(c)}${r + 1}`
                  const cellData = cells[id]
                  const isEditing = editingCellId === id

                  return (
                    <Cell
                      key={id}
                      ref={isEditing ? editingInputRef : undefined}
                      cellId={id}
                      display={cellData?.display ?? cellData?.raw ?? ""}
                      format={cellData?.format}
                      isActive={activeCellId === id}
                      isSelected={selectedCells.has(id)}
                      isEditing={isEditing}
                      draftValue={isEditing ? draftValue : ""}
                      onDraftChange={setDraftValue}
                      onCommitEdit={() => commitEdit()}
                      onMouseDown={handleCellMouseDown}
                      onMouseEnter={handleCellMouseEnter}
                      onDoubleClick={handleCellDoubleClick}
                      onEditKeyDown={handleEditKeyDown}
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
