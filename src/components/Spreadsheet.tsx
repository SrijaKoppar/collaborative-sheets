"use client"

import { useEffect, useState } from "react"
import Cell from "./Cell"
import Presence from "./Presence"
import Toolbar from "./Toolbar"
import { useSpreadsheet } from "@/hooks/useSpreadsheet"
import { usePresence } from "@/hooks/usePresence"

const ROWS = 30
const COLS = 20

function colName(index: number) {
  return String.fromCharCode(65 + index)
}

export default function Spreadsheet({ docId }: { docId: string }) {

  const { cells, updateCell } = useSpreadsheet(docId)

  const [user, setUser] = useState<{ name: string; color: string } | null>(null)

  useEffect(() => {

    const stored = sessionStorage.getItem("sheet-user")

    if (stored) {
      setUser(JSON.parse(stored))
    } else {

      const newUser = {
        name: "User-" + Math.floor(Math.random() * 1000),
        color: `hsl(${Math.random() * 360},70%,60%)`
      }

      sessionStorage.setItem("sheet-user", JSON.stringify(newUser))
      setUser(newUser)
    }

  }, [])

  // Always call the hook
  const users = usePresence(
    docId,
    user?.name || "",
    user?.color || ""
  )

  const rows = Array.from({ length: ROWS })
  const cols = Array.from({ length: COLS })

  return (
    <div>

      <Presence users={users} />

      <Toolbar />

      <div className="overflow-auto">

        <table className="border-collapse text-sm text-white">

          <thead>
            <tr>
              <th className="border border-gray-600 px-3 py-1 bg-gray-900"></th>

              {cols.map((_, c) => (
                <th
                  key={c}
                  className="border border-gray-600 px-3 py-1 bg-gray-900"
                >
                  {colName(c)}
                </th>
              ))}

            </tr>
          </thead>

          <tbody>

            {rows.map((_, r) => (
              <tr key={r}>

                <td className="border border-gray-600 px-2 bg-gray-900">
                  {r + 1}
                </td>

                {cols.map((_, c) => {

                  const id = `${colName(c)}${r + 1}`

                  return (
                    <Cell
                      key={id}
                      cellId={id}
                      value={cells[id] || ""}
                      updateCell={updateCell}
                    />
                  )

                })}

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}