"use client"

import { useState, useEffect } from "react"

interface Activity {
  id: string
  user: string
  action: string
  cellId?: string
  timestamp: Date
  color?: string
}

interface ActivityFeedProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function ActivityFeed({
  isOpen = false,
  onClose
}: ActivityFeedProps) {

  const [activities, setActivities] = useState<Activity[]>([])

  // Mock activities for demo
  useEffect(() => {
    const mockActivities: Activity[] = [
      {
        id: '1',
        user: 'User-123',
        action: 'Updated cell A1',
        cellId: 'A1',
        timestamp: new Date(Date.now() - 5 * 60000),
        color: '#3b82f6'
      },
      {
        id: '2',
        user: 'User-456',
        action: 'Changed format in B2:B5',
        cellId: 'B2:B5',
        timestamp: new Date(Date.now() - 10 * 60000),
        color: '#ef4444'
      },
      {
        id: '3',
        user: 'You',
        action: 'Inserted row 3',
        timestamp: new Date(Date.now() - 15 * 60000),
        color: '#22c55e'
      }
    ]
    setActivities(mockActivities)
  }, [])

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

  if (!isOpen) return null

  return (
    <div className="fixed bottom-0 right-0 w-80 h-96 bg-white border-l border-t border-slate-200 rounded-tl-lg shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Recent Activity</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
          </svg>
        </button>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {activities.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 hover:bg-slate-50 transition-colors border-l-2"
                style={{ borderLeftColor: activity.color || '#cbd5e1' }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: activity.color || '#cbd5e1' }}
                    ></div>
                    <span className="text-sm font-medium text-slate-900">
                      {activity.user}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {getRelativeTime(activity.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {activity.action}
                  {activity.cellId && (
                    <code className="ml-1 font-mono text-slate-700 font-medium">
                      {activity.cellId}
                    </code>
                  )}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No recent activity
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 text-xs text-slate-500 text-center">
        Activities are automatically synced
      </div>
    </div>
  )
}
