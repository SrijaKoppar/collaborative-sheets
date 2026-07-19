"use client"

import { useState, useCallback } from "react"

interface SearchBarProps {
  onSearch?: (query: string) => void
  onClear?: () => void
}

export default function SearchBar({
  onSearch,
  onClear
}: SearchBarProps) {
  
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [matchCount, setMatchCount] = useState(0)

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    onSearch?.(value)
  }, [onSearch])

  const handleClear = useCallback(() => {
    setQuery("")
    setMatchCount(0)
    onClear?.()
  }, [onClear])

  return (
    <div className="flex items-center gap-2">
      {isOpen ? (
        <div className="relative flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search cells..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none w-64"
              autoFocus
            />
            {query && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                {matchCount}
              </span>
            )}
          </div>

          <button
            onClick={() => {
              handleClear()
              setIsOpen(false)
            }}
            className="p-2 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            title="Close search"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
          title="Search (Ctrl+F)"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </button>
      )}
    </div>
  )
}
