"use client"

import { useEffect, useState } from "react"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { evaluateFormula } from "@/lib/formulaParser"

export function useSpreadsheet(docId: string) {

  const [cells, setCells] = useState<Record<string, string>>({})

  useEffect(() => {

    const ref = doc(db, "documents", docId)

    const unsub = onSnapshot(ref, (snapshot) => {

      const data = snapshot.data()

      if (data?.cells) {

        const values: Record<string, string> = {}

        Object.keys(data.cells).forEach((key) => {
          values[key] = evaluateFormula(data.cells[key].value, values)
        })

        setCells(values)
      }

    })

    return () => unsub()

  }, [docId])

  async function updateCell(cellId: string, value: string) {

    const ref = doc(db, "documents", docId)

    await updateDoc(ref, {
      [`cells.${cellId}.value`]: value
    })

  }

  return { cells, updateCell }
}