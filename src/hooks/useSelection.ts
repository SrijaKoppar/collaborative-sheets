"use client"

import { useState, useCallback, useRef } from "react"
import { SelectionRange } from "@/types/spreadsheet"

export function useSelection() {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null)
  const [activeCellId, setActiveCellId] = useState<string | null>(null)
  const selectionStartRef = useRef<string | null>(null)

  const cellToCoords = useCallback((cellId: string) => {
    const match = cellId.match(/([A-Z]+)(\d+)/)
    if (!match) return null
    const col = match[1].charCodeAt(0) - 65
    const row = parseInt(match[2]) - 1
    return { col, row }
  }, [])

  const coordsToCell = useCallback((col: number, row: number) => {
    return String.fromCharCode(65 + col) + (row + 1)
  }, [])

  const selectCell = useCallback((cellId: string, isMultiSelect: boolean = false) => {
    setActiveCellId(cellId)
    
    if (!isMultiSelect) {
      setSelectedCells(new Set([cellId]))
      setSelectionRange(null)
      selectionStartRef.current = cellId
    } else {
      setSelectedCells(prev => {
        const newSet = new Set(prev)
        if (newSet.has(cellId)) {
          newSet.delete(cellId)
        } else {
          newSet.add(cellId)
        }
        return newSet
      })
    }
  }, [])

  const selectRange = useCallback((startCellId: string, endCellId: string) => {
    const startCoords = cellToCoords(startCellId)
    const endCoords = cellToCoords(endCellId)

    if (!startCoords || !endCoords) return

    const minCol = Math.min(startCoords.col, endCoords.col)
    const maxCol = Math.max(startCoords.col, endCoords.col)
    const minRow = Math.min(startCoords.row, endCoords.row)
    const maxRow = Math.max(startCoords.row, endCoords.row)

    const cells = new Set<string>()
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        cells.add(coordsToCell(col, row))
      }
    }

    setSelectedCells(cells)
    setSelectionRange({ start: startCellId, end: endCellId })
  }, [cellToCoords, coordsToCell])

  const clearSelection = useCallback(() => {
    setSelectedCells(new Set())
    setSelectionRange(null)
    setActiveCellId(null)
  }, [])

  const extendSelection = useCallback((cellId: string) => {
    if (selectionStartRef.current) {
      selectRange(selectionStartRef.current, cellId)
    }
  }, [selectRange])

  return {
    selectedCells,
    selectionRange,
    activeCellId,
    selectCell,
    selectRange,
    clearSelection,
    extendSelection,
    setActiveCellId,
    cellToCoords,
    coordsToCell
  }
}
