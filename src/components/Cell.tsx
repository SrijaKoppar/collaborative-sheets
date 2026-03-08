"use client"

import { useState, useEffect } from "react"

interface Props {
  cellId: string
  value: string
  updateCell: (id: string, value: string) => void
}

export default function Cell({ cellId, value, updateCell }: Props) {

  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <td className="border w-24 h-8">

      <input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => updateCell(cellId, localValue)}
        className="w-full h-full px-1 outline-none"
      />

    </td>
  )
}