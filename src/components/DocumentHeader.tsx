"use client"

import { useState, useRef, useEffect } from "react"
import Presence from "./Presence"
import WriteStateIndicator from "./WriteStateIndicator"
import ExportMenu from "./ExportMenu"
import { CellData } from "@/types/spreadsheet"

interface UserInfo {
  displayName?: string | null
  email?: string | null
  photoURL?: string | null
}

interface DocumentHeaderProps {
  title: string
  onTitleChange?: (title: string) => void
  users?: any[]
  isSaving?: boolean
  lastSaved?: Date
  username?: string
  cells?: Record<string, CellData>
  currentUser?: UserInfo | null
}

export default function DocumentHeader({
  title,
  onTitleChange,
  users = [],
  isSaving = false,
  lastSaved,
  username = "Guest User",
  cells = {},
  currentUser
}: DocumentHeaderProps) {
  
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    if (editTitle.trim() !== title && editTitle.trim()) {
      onTitleChange?.(editTitle.trim())
    } else {
      setEditTitle(title)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditTitle(title)
      setIsEditing(false)
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          {/* Title Section */}
          <div className="flex-1">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="text-2xl font-bold bg-blue-50 border-2 border-blue-500 rounded px-3 py-1 w-full max-w-md outline-none text-slate-900"
              />
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-2xl font-bold text-slate-900 hover:text-blue-600 transition-colors group flex items-center gap-2"
              >
                {title}
                <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
                </svg>
              </button>
            )}
          </div>

          {/* Status Section */}
          <div className="flex items-center gap-6">
            {/* Write State Indicator */}
            <WriteStateIndicator isWriting={isSaving} lastSaved={lastSaved} />

            {/* Export Menu */}
            <ExportMenu cells={cells} title={title} />

            {/* Presence Indicators */}
            {users && users.length > 0 && (
              <Presence users={users} />
            )}
          </div>
        </div>

        {/* Info Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.displayName || "User"} 
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xs">
                {(currentUser?.displayName || currentUser?.email || username || "U")[0].toUpperCase()}
              </div>
            )}
            <span className="text-slate-700 font-medium">
              {currentUser?.displayName || currentUser?.email || username}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Share this URL to collaborate</span>
          </div>
        </div>
      </div>
    </header>
  )
}
