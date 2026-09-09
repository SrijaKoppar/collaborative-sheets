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
import { CellFormat, Cells, MixedCellFormat, UserPresence } from "@/types/spreadsheet"

const ROWS = 30
const COLS = 20
const DEFAULT_COLUMN_WIDTH = 112
const MIN_COLUMN_WIDTH = 50
const MAX_COLUMN_WIDTH = 400
const DEFAULT_ROW_HEIGHT = 36
const MIN_ROW_HEIGHT = 24
const MAX_ROW_HEIGHT = 120
const LAYOUT_SAVE_DELAY_MS = 350
const FORMAT_KEYS: (keyof CellFormat)[] = ['bold', 'italic', 'fontSize', 'textAlign', 'backgroundColor', 'textColor']

function colName(index: number) {
  return String.fromCharCode(65 + index)
}

type NavigateDirection = 'up' | 'down' | 'left' | 'right'

interface SpreadsheetProps {
  docId: string
  onCellsChange?: (cells: Cells) => void
  onWriteStateChange?: (state: WriteState) => void
  onUsersChange?: (users: UserPresence[]) => void
}

interface WriteState {
  isWriting: boolean
  lastSaved?: Date
  error?: string | null
}

export default function Spreadsheet({ docId, onCellsChange, onWriteStateChange, onUsersChange }: SpreadsheetProps) {

  const { cells, layout, updateCellsBatch, updateFormatBatch, clearCellsBatch, updateLayout } = useSpreadsheet(docId)
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
  const [columnWidthOverrides, setColumnWidthOverrides] = useState<Record<number, number>>({})
  const [rowHeightOverrides, setRowHeightOverrides] = useState<Record<number, number>>({})
  // Confirmed Firestore layout, with any in-flight local resize overlaid on
  // top - avoids mirroring `layout` into local state (and needing an effect
  // to keep it in sync) purely to add optimistic updates during a drag.
  const columnWidths = useMemo(
    () => ({ ...layout.columnWidths, ...columnWidthOverrides }),
    [layout.columnWidths, columnWidthOverrides]
  )
  const rowHeights = useMemo(
    () => ({ ...layout.rowHeights, ...rowHeightOverrides }),
    [layout.rowHeights, rowHeightOverrides]
  )

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
  const pendingWritesRef = useRef(0)
  const lastSavedRef = useRef<Date | undefined>(undefined)
  const layoutSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  useEffect(() => {
    return () => {
      if (layoutSaveTimeoutRef.current) clearTimeout(layoutSaveTimeoutRef.current)
    }
  }, [])

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

  const writeErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : "Unable to save changes"
  }

  const runWrite = useCallback(async (write: () => Promise<void>) => {
    pendingWritesRef.current += 1
    onWriteStateChange?.({
      isWriting: true,
      lastSaved: lastSavedRef.current,
      error: null
    })

    try {
      await write()
      lastSavedRef.current = new Date()
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1)
      onWriteStateChange?.({
        isWriting: pendingWritesRef.current > 0,
        lastSaved: lastSavedRef.current,
        error: null
      })
    } catch (error) {
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1)
      onWriteStateChange?.({
        isWriting: pendingWritesRef.current > 0,
        lastSaved: lastSavedRef.current,
        error: writeErrorMessage(error)
      })
    }
  }, [onWriteStateChange])

  const scheduleLayoutSave = useCallback((nextLayout: { columnWidths?: Record<number, number>; rowHeights?: Record<number, number> }) => {
    if (layoutSaveTimeoutRef.current) clearTimeout(layoutSaveTimeoutRef.current)
    layoutSaveTimeoutRef.current = setTimeout(() => {
      layoutSaveTimeoutRef.current = null
      void runWrite(() => updateLayout(nextLayout))
    }, LAYOUT_SAVE_DELAY_MS)
  }, [runWrite, updateLayout])

  const persistEdits = useCallback((edits: CellEdit[], direction: 'next' | 'prev' = 'next') => {
    if (edits.length === 0) return

    void runWrite(() => updateCellsBatch(edits.map((edit) => ({
      cellId: edit.cellId,
      raw: direction === 'next' ? edit.nextRaw : edit.prevRaw,
      format: edit.prevFormat !== undefined || edit.nextFormat !== undefined
        ? (direction === 'next' ? edit.nextFormat ?? {} : edit.prevFormat ?? {})
        : undefined
    }))))
  }, [runWrite, updateCellsBatch])

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
    persistEdits([{
      cellId,
      prevRaw,
      prevFormat: prevCell?.format,
      nextRaw: value,
      nextFormat: prevCell?.format
    }])
  }, [cells, history, persistEdits])

  const getSelectedFormat = useMemo((): MixedCellFormat => {
    if (selectedCells.size === 0) return {}

    const formats = Array.from(selectedCells).map(id => cells[id]?.format || {})
    const result: Record<string, unknown> = {}

    FORMAT_KEYS.forEach(key => {
      const firstValue = formats[0][key]
      const allAgree = formats.every(f => f[key] === firstValue)
      result[key] = allAgree ? firstValue : 'mixed'
    })

    return result as MixedCellFormat
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

  const handleFormat = useCallback((format: Partial<CellFormat>) => {
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
    void runWrite(() => updateFormatBatch(edits.map((edit) => ({
      cellId: edit.cellId,
      format: edit.nextFormat ?? {}
    }))))
  }, [selectedCells, cells, history, runWrite, updateFormatBatch])

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
    void runWrite(() => updateFormatBatch(edits.map((edit) => ({
      cellId: edit.cellId,
      format: edit.nextFormat ?? {}
    }))))
  }, [selectedCells, cells, history, runWrite, updateFormatBatch])

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
    void runWrite(() => clearCellsBatch(edits.map((edit) => edit.cellId), cells))
  }, [selectedCells, cells, history, runWrite, clearCellsBatch])

  const handleUndo = useCallback(() => {
    const action = history.takeUndoAction()
    if (action) persistEdits(action, 'prev')
  }, [history, persistEdits])

  const handleRedo = useCallback(() => {
    const action = history.takeRedoAction()
    if (action) persistEdits(action, 'next')
  }, [history, persistEdits])

  const handleResizeColumn = useCallback((colIndex: number, width: number) => {
    const clamped = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width))
    setColumnWidthOverrides(prev => {
      const next = { ...prev, [colIndex]: clamped }
      scheduleLayoutSave({ columnWidths: { ...layout.columnWidths, ...next }, rowHeights })
      return next
    })
  }, [scheduleLayoutSave, layout.columnWidths, rowHeights])

  const handleResizeRow = useCallback((rowIndex: number, height: number) => {
    const clamped = Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, height))
    setRowHeightOverrides(prev => {
      const next = { ...prev, [rowIndex]: clamped }
      scheduleLayoutSave({ columnWidths, rowHeights: { ...layout.rowHeights, ...next } })
      return next
    })
  }, [scheduleLayoutSave, columnWidths, layout.rowHeights])

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
      persistEdits(edits)
    }).catch(() => {})
  }, [activeCellId, cellToCoords, coordsToCell, cells, history, persistEdits])

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
        onClearContents={handleClearSelectedCells}
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
                const width = columnWidths[c] || DEFAULT_COLUMN_WIDTH
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
            {rows.map((_, r) => {
              const height = rowHeights[r] || DEFAULT_ROW_HEIGHT
              return (
              <tr key={r}>
                <td
                  onMouseDown={(e) => handleRowHeaderMouseDown(r, e)}
                  className={`border text-center w-12 font-medium text-xs sticky left-0 z-20 cursor-pointer select-none relative ${
                    isRowFullySelected(r)
                      ? 'border-blue-300 bg-blue-100 text-blue-700'
                      : 'border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-200'
                  }`}
                  style={{ height: `${height}px` }}
                >
                  {r + 1}
                  <div
                    className="absolute left-0 bottom-0 w-full h-1 cursor-row-resize hover:bg-blue-500 hover:h-1.5 transition-all"
                    onMouseDown={(e) => {
                      e.stopPropagation() // don't also trigger row selection
                      const startY = e.clientY
                      const startHeight = height

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const delta = moveEvent.clientY - startY
                        const newHeight = Math.max(MIN_ROW_HEIGHT, startHeight + delta)
                        handleResizeRow(r, newHeight)
                      }

                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove)
                        document.removeEventListener('mouseup', handleMouseUp)
                      }

                      document.addEventListener('mousemove', handleMouseMove)
                      document.addEventListener('mouseup', handleMouseUp)
                    }}
                  />
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
                      height={height}
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
              )
            })}
          </tbody>

        </table>
      </div>

    </div>
  )
}
