"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface ColumnResizerProps {
  columnIndex: number
  onResize: (columnIndex: number, width: number) => void
  currentWidth: number
}

export default function ColumnResizer({
  columnIndex,
  onResize,
  currentWidth
}: ColumnResizerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(currentWidth)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startXRef.current = e.clientX
    startWidthRef.current = currentWidth
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const delta = e.clientX - startXRef.current
    const newWidth = Math.max(50, startWidthRef.current + delta)
    onResize(columnIndex, newWidth)
  }, [columnIndex, onResize])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors ${
        isDragging ? 'bg-blue-600' : 'bg-transparent hover:bg-blue-400'
      }`}
      style={{
        userSelect: 'none'
      }}
      title="Drag to resize column"
    />
  )
}
