"use client"

import { useEffect, useState } from "react"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { evaluateFormula } from "@/lib/formulaParser"
import { CellData, CellFormat } from "@/types/spreadsheet"

export function useSpreadsheet(docId: string) {

  const [cells, setCells] = useState<Record<string, CellData>>({})

  useEffect(() => {

    const ref = doc(db, "documents", docId)

    const unsub = onSnapshot(ref, (snapshot) => {

      const data = snapshot.data()

      if (data?.cells) {

        const cellsData: Record<string, CellData> = {}

        Object.keys(data.cells).forEach((key) => {
          const cellValue = evaluateFormula(data.cells[key].value, cellsData)
          cellsData[key] = {
            value: cellValue,
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

    const updateData: any = {
      [`cells.${cellId}.value`]: value
    }

    if (format) {
      updateData[`cells.${cellId}.format`] = format
    }

    await updateDoc(ref, updateData)

  }

  return { cells, updateCell }
}
