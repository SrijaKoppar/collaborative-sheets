"use client"

import { useEffect, useState } from "react"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { evaluateSheet } from "@/lib/formulaParser"
import { CellData, CellFormat } from "@/types/spreadsheet"

export function useSpreadsheet(docId: string) {

  const [cells, setCells] = useState<Record<string, CellData>>({})

  useEffect(() => {

    const ref = doc(db, "documents", docId)

    const unsub = onSnapshot(ref, (snapshot) => {

      const data = snapshot.data()

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

  async function updateCell(cellId: string, value: string, format?: CellFormat) {

    const ref = doc(db, "documents", docId)

    const updateData: Record<string, string | CellFormat | number> = {
      [`cells.${cellId}.raw`]: value,
      updatedAt: Date.now()
    }

    if (format) {
      updateData[`cells.${cellId}.format`] = format
    }

    await updateDoc(ref, updateData)

  }

  return { cells, updateCell }
}
