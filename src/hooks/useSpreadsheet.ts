"use client"

import { useEffect, useState } from "react"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { evaluateSheet } from "@/lib/formulaParser"
import { CellData, CellFormat } from "@/types/spreadsheet"

export interface CellWrite {
  cellId: string
  raw?: string
  format?: CellFormat
}

export interface SheetLayout {
  columnWidths: Record<number, number>
  rowHeights: Record<number, number>
}

function toNumberRecord(value: unknown): Record<number, number> {
  if (!value || typeof value !== "object") return {}

  const result: Record<number, number> = {}
  Object.entries(value as Record<string, unknown>).forEach(([key, width]) => {
    const index = Number(key)
    if (Number.isInteger(index) && typeof width === "number" && Number.isFinite(width)) {
      result[index] = width
    }
  })
  return result
}

export function useSpreadsheet(docId: string) {

  const [cells, setCells] = useState<Record<string, CellData>>({})
  const [layout, setLayout] = useState<SheetLayout>({
    columnWidths: {},
    rowHeights: {}
  })

  useEffect(() => {

    const ref = doc(db, "documents", docId)

    const unsub = onSnapshot(ref, (snapshot) => {

      const data = snapshot.data()

      setLayout({
        columnWidths: toNumberRecord(data?.columnWidths),
        rowHeights: toNumberRecord(data?.rowHeights)
      })

      if (data?.cells) {

        // Pull out just the raw formulas/values so the formula engine can
        // resolve references and dependencies across the whole sheet.
        const rawCells: Record<string, string> = {}
        Object.keys(data.cells).forEach((key) => {
          rawCells[key] = data.cells[key].raw ?? ""
        })

        const displayValues = evaluateSheet(rawCells)

        const cellsData: Record<string, CellData> = {}
        Object.keys(data.cells).forEach((key) => {
          cellsData[key] = {
            raw: rawCells[key],
            display: displayValues[key] ?? "",
            format: data.cells[key].format || {}
          }
        })

        setCells(cellsData)
      }

    })

    return () => unsub()

  }, [docId])

  async function updateCellsBatch(writes: CellWrite[]) {
    if (writes.length === 0) return

    const ref = doc(db, "documents", docId)

    const updateData: Record<string, string | CellFormat | number> = {
      updatedAt: Date.now()
    }

    writes.forEach(({ cellId, raw, format }) => {
      if (raw !== undefined) {
        updateData[`cells.${cellId}.raw`] = raw
      }

      if (format !== undefined) {
        updateData[`cells.${cellId}.format`] = format
      }
    })

    await updateDoc(ref, updateData)
  }

  async function updateCell(cellId: string, value: string, format?: CellFormat) {
    await updateCellsBatch([{ cellId, raw: value, format }])
  }

  async function updateFormatBatch(writes: Array<{ cellId: string; format: CellFormat }>) {
    await updateCellsBatch(writes.map(({ cellId, format }) => ({ cellId, format })))
  }

  async function clearCellsBatch(cellIds: string[], currentCells: Record<string, CellData>) {
    await updateCellsBatch(cellIds.map((cellId) => ({
      cellId,
      raw: "",
      format: currentCells[cellId]?.format
    })))
  }

  async function updateLayout(nextLayout: Partial<SheetLayout>) {
    const ref = doc(db, "documents", docId)
    const updateData: Record<string, Record<number, number> | number> = {
      updatedAt: Date.now()
    }

    if (nextLayout.columnWidths) {
      updateData.columnWidths = nextLayout.columnWidths
    }

    if (nextLayout.rowHeights) {
      updateData.rowHeights = nextLayout.rowHeights
    }

    await updateDoc(ref, updateData)
  }

  return { cells, layout, updateCell, updateCellsBatch, updateFormatBatch, clearCellsBatch, updateLayout }
}
