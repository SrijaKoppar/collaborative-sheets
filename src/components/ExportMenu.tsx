"use client"

import { useState } from "react"
import { CellData } from "@/types/spreadsheet"
import { exportToCSV, exportToJSON, exportToHTML } from "@/lib/exportUtils"

interface ExportMenuProps {
  cells: Record<string, CellData>
  title: string
  rows?: number
  cols?: number
}

export default function ExportMenu({
  cells,
  title,
  rows = 30,
  cols = 20
}: ExportMenuProps) {
  
  const [showMenu, setShowMenu] = useState(false)

  const handleExportCSV = () => {
    exportToCSV(cells, title, rows, cols)
    setShowMenu(false)
  }

  const handleExportJSON = () => {
    exportToJSON(cells, title)
    setShowMenu(false)
  }

  const handleExportHTML = () => {
    exportToHTML(cells, title, rows, cols)
    setShowMenu(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        title="Export spreadsheet"
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>

      {showMenu && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-48">
          <button
            onClick={handleExportCSV}
            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700 border-b border-slate-100"
          >
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
            </svg>
            <div>
              <p className="font-medium">CSV</p>
              <p className="text-xs text-slate-500">For Excel & spreadsheets</p>
            </div>
          </button>

          <button
            onClick={handleExportJSON}
            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700 border-b border-slate-100"
          >
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
            </svg>
            <div>
              <p className="font-medium">JSON</p>
              <p className="text-xs text-slate-500">With formatting & data</p>
            </div>
          </button>

          <button
            onClick={handleExportHTML}
            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700"
          >
            <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
            </svg>
            <div>
              <p className="font-medium">HTML</p>
              <p className="text-xs text-slate-500">View in browser</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
