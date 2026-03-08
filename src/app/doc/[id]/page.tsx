"use client"

import Spreadsheet from "@/components/Spreadsheet"
import DocumentHeader from "@/components/DocumentHeader"
import Link from "next/link"
import { useState, use } from "react"

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  const { id } = use(params)
  const [documentTitle, setDocumentTitle] = useState("Untitled Spreadsheet")

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-full px-4 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors p-2 -m-2 rounded hover:bg-slate-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Spreadsheets</span>
          </Link>
        </div>
      </nav>

      {/* Document Header */}
      <DocumentHeader
        docId={id}
        title={documentTitle}
        onTitleChange={setDocumentTitle}
      />

      {/* Content */}
      <main className="flex-1 max-w-full overflow-hidden">
        <Spreadsheet docId={id} />
      </main>
    </div>
  )
}
