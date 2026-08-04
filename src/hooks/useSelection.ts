"use client"

import { useCallback, useRef, useState } from "react"

export interface CellCoords {
  col: number
  row: number
}

interface UseSelectionOptions {
  cols: number
  rows: number
}

/**
 * Grid selection state: a single "active" cell (the one that's typed into /
 * shown in the formula bar) plus a set of highlighted cells forming either a
 * rectangular range (click, shift-click, drag) or a discontiguous set
 * (ctrl/cmd-click toggling individual cells).
 */
export function useSelection({ cols, rows }: UseSelectionOptions) {
  const anchorCellIdRef = useRef<string | null>(null)
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
    anchorCellIdRef.current = cellId
    setActiveCellId(cellId)
    setSelectedCells(new Set([cellId]))
  }, [])

  /** Ctrl/Cmd+click: toggle a single cell in/out of a discontiguous selection. */
  const toggleCell = useCallback((cellId: string) => {
    anchorCellIdRef.current = cellId
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
    const anchor = anchorCellIdRef.current ?? cellId
    anchorCellIdRef.current = anchor
    setSelectedCells(rangeToCells(anchor, cellId))
  }, [rangeToCells])

  const selectAll = useCallback(() => {
    const start = coordsToCell(0, 0)
    const end = coordsToCell(cols - 1, rows - 1)
    anchorCellIdRef.current = start
    setActiveCellId(start)
    setSelectedCells(rangeToCells(start, end))
  }, [coordsToCell, cols, rows, rangeToCells])

  const clearSelection = useCallback(() => {
    setSelectedCells(new Set())
    anchorCellIdRef.current = null
    setActiveCellId(null)
  }, [])

  return {
    selectedCells,
    activeCellId,
    selectCell,
    toggleCell,
    extendTo,
    selectAll,
    clearSelection,
    setActiveCellId,
    cellToCoords,
    coordsToCell
  }
}
