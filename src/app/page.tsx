"use client"

import { collection, getDocs, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function Page() {

  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  async function loadDocs() {
    const snap = await getDocs(collection(db, "documents"))
    const list = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
    setDocs(list)
    setLoading(false)
  }

  useEffect(() => {
    loadDocs()
  }, [])

  async function createDocument() {
    setCreating(true)
    try {
      const ref = await addDoc(collection(db, "documents"), {
        title: "Untitled Spreadsheet",
        author: "Guest",
        updatedAt: Date.now(),
        cells: {}
      })
      window.location.href = `/doc/${ref.id}`
    } catch (error) {
      console.error("Failed to create document:", error)
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Spreadsheets
              </h1>
              <p className="text-slate-500 text-sm mt-2">
                Real-time collaborative sheets
              </p>
            </div>
            <button
              onClick={createDocument}
              disabled={creating}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {creating ? "Creating..." : "New Spreadsheet"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} opacity="0.25" />
                <path strokeWidth={2} d="M4 12a8 8 0 018-8v0a8 8 0 016.56 12.56" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-slate-500 mt-4">Loading your spreadsheets...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              No spreadsheets yet
            </h2>
            <p className="text-slate-500 mb-6">
              Create your first spreadsheet to get started
            </p>
            <button
              onClick={createDocument}
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              {creating ? "Creating..." : "Create Spreadsheet"}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-500 mb-6">
              {docs.length} {docs.length === 1 ? "spreadsheet" : "spreadsheets"}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.map((d: any) => (
                <Link
                  key={d.id}
                  href={`/doc/${d.id}`}
                  className="group bg-white border border-slate-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="font-semibold text-slate-900 text-base group-hover:text-blue-600 transition-colors truncate">
                        {d.title}
                      </h2>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">
                    By {d.author}
                  </p>
                  <p className="text-xs text-slate-400">
                    Updated recently
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
