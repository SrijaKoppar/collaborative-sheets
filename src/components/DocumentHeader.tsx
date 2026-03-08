"use client"

import { useState, useRef, useEffect } from "react"
import Presence from "./Presence"

interface DocumentHeaderProps {
  docId: string
  title: string
  onTitleChange?: (title: string) => void
  users?: any[]
  isSaving?: boolean
  lastSaved?: Date
}

export default function DocumentHeader({
  docId,
  title,
  onTitleChange,
  users = [],
  isSaving = false,
  lastSaved
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

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
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
            {/* Save Status */}
            <div className="text-sm text-slate-500">
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth={2} opacity="0.25" />
                      <path strokeWidth={2} d="M4 12a8 8 0 018-8v0a8 8 0 016.56 12.56" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span>Saving...</span>
                </div>
              ) : lastSaved ? (
                <span>Saved {getRelativeTime(lastSaved)}</span>
              ) : (
                <span className="text-slate-400">Saving automatically</span>
              )}
            </div>

            {/* Presence Indicators */}
            {users && users.length > 0 && (
              <Presence users={users} />
            )}
          </div>
        </div>

        {/* Info Bar */}
        {docId && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div>
              ID: <code className="font-mono text-slate-600">{docId.slice(0, 12)}...</code>
            </div>
            <div className="flex gap-4">
              <span>Share your spreadsheet to collaborate with others</span>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
