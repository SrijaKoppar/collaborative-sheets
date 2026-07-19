"use client"

import Spreadsheet from "@/components/Spreadsheet"
import DocumentHeader from "@/components/DocumentHeader"
import Link from "next/link"
import { useState, use, useRef, useEffect } from "react"
import { onAuthStateChanged, User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useDocument } from "@/hooks/useDocument"
import { CellData, UserPresence } from "@/types/spreadsheet"

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  const { id } = use(params)
  const { status, title, setTitle } = useDocument(id)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [username, setUsername] = useState("Guest User")
  const [cells, setCells] = useState<Record<string, CellData>>({})
  const [isWriting, setIsWriting] = useState(false)
  const [users, setUsers] = useState<UserPresence[]>([])
  const writeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)
      if (user) {
        setUsername(user.displayName || user.email || "User")
      }
    })
    return () => unsubscribe()
  }, [])

  if (status === "not-found") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Spreadsheet not found</h1>
        <p className="text-slate-500 mb-6">This document may have been deleted, or the link is incorrect.</p>
        <Link
          href="/"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
        >
          Back to spreadsheets
        </Link>
      </div>
    )
  }

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
        title={status === "loading" ? "Loading..." : title}
        onTitleChange={setTitle}
        username={username}
        cells={cells}
        isSaving={isWriting}
        users={users}
        currentUser={firebaseUser ? {
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL
        } : null}
      />

      {/* Content */}
      <main className="flex-1 max-w-full overflow-hidden">
        <Spreadsheet 
          docId={id}
          onCellsChange={setCells}
          onUsersChange={setUsers}
          onWriteStateChange={(isWriting) => {
            setIsWriting(isWriting)
            if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current)
            if (isWriting) {
              writeTimeoutRef.current = setTimeout(() => setIsWriting(false), 500)
            }
          }}
        />
      </main>
    </div>
  )
}
