"use client"

import { useCallback, useRef, useState } from "react"
import { CellFormat } from "@/types/spreadsheet"

export interface CellEdit {
  cellId: string
  prevRaw: string
  prevFormat?: CellFormat
  nextRaw: string
  nextFormat?: CellFormat
}

type HistoryAction = CellEdit[]

/**
 * A per-tab undo/redo stack for cell edits. Deliberately per-user/per-tab
 * rather than a single global document history: it only tracks edits made
 * locally, and undoing replays the previous raw value/format for exactly the
 * cells this user changed (persisted by the caller), rather than snapshotting
 * and restoring the whole sheet - which would risk clobbering concurrent
 * edits from collaborators.
 *
 * `takeUndoAction`/`takeRedoAction` hand back the whole action (every edit
 * it contains) in one call, so the caller can write them all back in a
 * single batched Firestore write regardless of how many cells were touched.
 */
export function useHistory() {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const undoStack = useRef<HistoryAction[]>([])
  const redoStack = useRef<HistoryAction[]>([])

  const record = useCallback((edits: CellEdit[]) => {
    if (edits.length === 0) return
    undoStack.current.push(edits)
    redoStack.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const takeUndoAction = useCallback((): HistoryAction | null => {
    const action = undoStack.current.pop()
    if (!action) return null
    redoStack.current.push(action)
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
    return action
  }, [])

  const takeRedoAction = useCallback((): HistoryAction | null => {
    const action = redoStack.current.pop()
    if (!action) return null
    undoStack.current.push(action)
    setCanRedo(redoStack.current.length > 0)
    setCanUndo(true)
    return action
  }, [])

  return { record, takeUndoAction, takeRedoAction, canUndo, canRedo }
}
