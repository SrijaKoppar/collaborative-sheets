"use client"

import { useState, useCallback } from "react"
import { Cells, HistoryEntry } from "@/types/spreadsheet"

export function useHistory(initialCells: Cells) {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { cells: initialCells, timestamp: Date.now() }
  ])
  const [currentIndex, setCurrentIndex] = useState(0)

  const push = useCallback((cells: Cells) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1)
      newHistory.push({ cells: JSON.parse(JSON.stringify(cells)), timestamp: Date.now() })
      return newHistory
    })
    setCurrentIndex(prev => prev + 1)
  }, [currentIndex])

  const undo = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }, [])

  const redo = useCallback(() => {
    setCurrentIndex(prev => Math.min(history.length - 1, prev + 1))
  }, [history.length])

  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  const getCurrentCells = useCallback(() => {
    return history[currentIndex]?.cells || initialCells
  }, [history, currentIndex, initialCells])

  return {
    push,
    undo,
    redo,
    canUndo,
    canRedo,
    getCurrentCells,
    history,
    currentIndex
  }
}
