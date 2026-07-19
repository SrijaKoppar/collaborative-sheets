"use client"

import { useSyncExternalStore } from "react"

export interface SessionUser {
  name: string
  color: string
}

const STORAGE_KEY = "sheet-user"

function subscribe() {
  // sessionStorage for this key is only ever written by getSnapshot below and
  // never changes externally, so there is nothing to subscribe to.
  return () => {}
}

function getSnapshot(): string {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (stored) return stored

  const newUser: SessionUser = {
    name: "User-" + Math.floor(Math.random() * 1000),
    color: `hsl(${Math.random() * 360},70%,60%)`
  }
  const serialized = JSON.stringify(newUser)
  sessionStorage.setItem(STORAGE_KEY, serialized)
  return serialized
}

function getServerSnapshot(): string | null {
  return null
}

/**
 * Returns a stable per-tab anonymous identity (name + color) backed by
 * sessionStorage. Uses useSyncExternalStore instead of a useEffect so the
 * value is read during render (matching React's recommended pattern for
 * reading external, browser-only state) rather than needing a synchronous
 * setState call inside an effect.
 */
export function useSessionUser(): SessionUser | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return raw ? JSON.parse(raw) : null
}
