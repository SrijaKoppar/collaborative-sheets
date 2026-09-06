"use client"

import { useCallback, useMemo, useState } from "react"

export interface CellCoords {
  col: number
  row: number
}

export interface SelectionBounds {
  minCol: number
  maxCol: number
  minRow: number
  maxRow: number
}

interface UseSelectionOptions {
  cols: number
  rows: number
}

/**
 * Grid selection state: an explicit anchor (where the current range started),
 * a single "active" cell (the one that's typed into / shown in the formula
 * bar), and a set of highlighted cells forming either a rectangular range
 * (click, shift-click, drag) or a discontiguous set (ctrl/cmd-click toggling
 * individual cells).
 */
export function useSelection({ cols, rows }: UseSelectionOptions) {
  const [anchorCellId, setAnchorCellId] = useState<string | null>(null)
  const [activeCellId, setActiveCellId] = useState<string | null>(null)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())

  const cellToCoords = useCallback((cellId: string): CellCoords | null => {
    const match = cellId.match(/^([A-Z]+)(\d+)$/)
    if (!match) return null
    return { col: match[1].charCodeAt(0) - 65, row: parseInt(match[2], 10) - 1 }
  }, [])

  const coordsToCell = useCallback((col: number, row: number) => {
    return String.fromCharCode(65 + col) + (row + 1)
  }, [])

  const rangeToCells = useCallback((a: string, b: string): Set<string> => {
    const start = cellToCoords(a)
    const end = cellToCoords(b)
    const result = new Set<string>()
    if (!start || !end) return result

    const minCol = Math.min(start.col, end.col)
    const maxCol = Math.max(start.col, end.col)
    const minRow = Math.min(start.row, end.row)
    const maxRow = Math.max(start.row, end.row)

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        result.add(coordsToCell(col, row))
      }
    }
    return result
  }, [cellToCoords, coordsToCell])

  /** Plain click: start a brand-new single-cell selection and set the anchor for future range extension. */
  const selectCell = useCallback((cellId: string) => {
    setAnchorCellId(cellId)
    setActiveCellId(cellId)
    setSelectedCells(new Set([cellId]))
  }, [])

  /** Ctrl/Cmd+click: toggle a single cell in/out of a discontiguous selection. */
  const toggleCell = useCallback((cellId: string) => {
    setAnchorCellId(cellId)
    setActiveCellId(cellId)
    setSelectedCells(prev => {
      const next = new Set(prev)
      if (next.has(cellId)) next.delete(cellId)
      else next.add(cellId)
      return next
    })
  }, [])

  /** Shift+click or drag: extend a rectangular range from the current anchor to cellId. */
  const extendTo = useCallback((cellId: string) => {
    setActiveCellId(cellId)
    setAnchorCellId(prevAnchor => {
      const anchor = prevAnchor ?? cellId
      setSelectedCells(rangeToCells(anchor, cellId))
      return anchor
    })
  }, [rangeToCells])

  const selectAll = useCallback(() => {
    const start = coordsToCell(0, 0)
    const end = coordsToCell(cols - 1, rows - 1)
    setAnchorCellId(start)
    setActiveCellId(start)
    setSelectedCells(rangeToCells(start, end))
  }, [coordsToCell, cols, rows, rangeToCells])

  /** Click a row header: select the whole row. Shift+click extends from the anchor row to this one. */
  const selectRowRange = useCallback((row: number, extend: boolean = false) => {
    setAnchorCellId(prevAnchor => {
      const anchorCoords = extend && prevAnchor ? cellToCoords(prevAnchor) : null
      if (anchorCoords) {
        setActiveCellId(coordsToCell(0, row))
        setSelectedCells(rangeToCells(coordsToCell(0, anchorCoords.row), coordsToCell(cols - 1, row)))
        return prevAnchor
      }
      const start = coordsToCell(0, row)
      setActiveCellId(start)
      setSelectedCells(rangeToCells(start, coordsToCell(cols - 1, row)))
      return start
    })
  }, [coordsToCell, cols, rangeToCells, cellToCoords])

  /** Click a column header: select the whole column. Shift+click extends from the anchor column to this one. */
  const selectColumnRange = useCallback((col: number, extend: boolean = false) => {
    setAnchorCellId(prevAnchor => {
      const anchorCoords = extend && prevAnchor ? cellToCoords(prevAnchor) : null
      if (anchorCoords) {
        setActiveCellId(coordsToCell(col, 0))
        setSelectedCells(rangeToCells(coordsToCell(anchorCoords.col, 0), coordsToCell(col, rows - 1)))
        return prevAnchor
      }
      const start = coordsToCell(col, 0)
      setActiveCellId(start)
      setSelectedCells(rangeToCells(start, coordsToCell(col, rows - 1)))
      return start
    })
  }, [coordsToCell, rows, rangeToCells, cellToCoords])

  const clearSelection = useCallback(() => {
    setSelectedCells(new Set())
    setAnchorCellId(null)
    setActiveCellId(null)
  }, [])

  // The rectangular bounding box of the current selection (normalized to
  // top-left/bottom-right regardless of drag direction), or null when empty.
  // For a discontiguous ctrl-click selection this is just the bounding box,
  // not a claim that every cell inside it is selected.
  const selectionBounds = useMemo((): SelectionBounds | null => {
    if (selectedCells.size === 0) return null

    let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity
    selectedCells.forEach(id => {
      const coords = cellToCoords(id)
      if (!coords) return
      minCol = Math.min(minCol, coords.col)
      maxCol = Math.max(maxCol, coords.col)
      minRow = Math.min(minRow, coords.row)
      maxRow = Math.max(maxRow, coords.row)
    })

    if (!isFinite(minCol)) return null
    return { minCol, maxCol, minRow, maxRow }
  }, [selectedCells, cellToCoords])

  // True when selectedCells exactly fills its own bounding rectangle (a
  // simple drag/shift/row/column range) rather than a discontiguous
  // ctrl-click selection - used to decide whether "A1:C5"-style range
  // addresses are meaningful to show.
  const isRectangularSelection = useMemo(() => {
    if (!selectionBounds) return false
    const { minCol, maxCol, minRow, maxRow } = selectionBounds
    const area = (maxCol - minCol + 1) * (maxRow - minRow + 1)
    return area === selectedCells.size
  }, [selectionBounds, selectedCells])

  return {
    selectedCells,
    activeCellId,
    anchorCellId,
    selectionBounds,
    isRectangularSelection,
    selectCell,
    toggleCell,
    extendTo,
    selectAll,
    selectRowRange,
    selectColumnRange,
    clearSelection,
    setActiveCellId,
    cellToCoords,
    coordsToCell
  }
}
