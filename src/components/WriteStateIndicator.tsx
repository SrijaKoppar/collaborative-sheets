"use client"

import { useEffect, useState } from "react"

interface WriteStateIndicatorProps {
  isWriting?: boolean
  lastSaved?: Date
}

export default function WriteStateIndicator({
  isWriting = false,
  lastSaved
}: WriteStateIndicatorProps) {
  
  const [displayText, setDisplayText] = useState("All changes saved")
  const [showSaving, setShowSaving] = useState(false)

  useEffect(() => {
    if (isWriting) {
      setShowSaving(true)
      setDisplayText("Saving...")
    } else {
      setShowSaving(false)
      setDisplayText("All changes saved")
    }
  }, [isWriting])

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      {showSaving ? (
        <>
          <div className="animate-spin">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={2} opacity="0.25" />
              <path strokeWidth={2} d="M4 12a8 8 0 018-8v0a8 8 0 016.56 12.56" strokeLinecap="round" />
            </svg>
          </div>
          <span>{displayText}</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span className="text-green-700">{displayText}</span>
        </>
      )}
    </div>
  )
}
