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
type ApplyFn = (cellId: string, raw: string, format?: CellFormat) => void

/**
 * A per-tab undo/redo stack for cell edits. Deliberately per-user/per-tab
 * rather than a single global document history: it only tracks edits made
 * locally, and undoing replays the previous raw value/format for exactly the
 * cells this user changed (via the `apply` callback, which persists to
 * Firestore), rather than snapshotting and restoring the whole sheet - which
 * would risk clobbering concurrent edits from collaborators.
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

  const undo = useCallback((apply: ApplyFn) => {
    const action = undoStack.current.pop()
    if (!action) return
    for (let i = action.length - 1; i >= 0; i--) {
      const edit = action[i]
      apply(edit.cellId, edit.prevRaw, edit.prevFormat)
    }
    redoStack.current.push(action)
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
  }, [])

  const redo = useCallback((apply: ApplyFn) => {
    const action = redoStack.current.pop()
    if (!action) return
    for (const edit of action) {
      apply(edit.cellId, edit.nextRaw, edit.nextFormat)
    }
    undoStack.current.push(action)
    setCanRedo(redoStack.current.length > 0)
    setCanUndo(true)
  }, [])

  return { record, undo, redo, canUndo, canRedo }
}
