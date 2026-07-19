"use client"

import { useCallback, useEffect, useState } from "react"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export type DocumentStatus = "loading" | "ready" | "not-found"

interface DocumentMeta {
  title: string
  author: string
  updatedAt: number | null
}

const DEFAULT_META: DocumentMeta = {
  title: "Untitled Spreadsheet",
  author: "",
  updatedAt: null
}

/**
 * Loads and keeps in sync a document's metadata (title, author, updatedAt)
 * from Firestore, and exposes a setTitle helper that persists edits back.
 */
export function useDocument(docId: string) {
  const [status, setStatus] = useState<DocumentStatus>("loading")
  const [meta, setMeta] = useState<DocumentMeta>(DEFAULT_META)

  useEffect(() => {
    const ref = doc(db, "documents", docId)

    const unsub = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          setStatus("not-found")
          return
        }

        const data = snapshot.data()
        setMeta({
          title: typeof data.title === "string" ? data.title : DEFAULT_META.title,
          author: typeof data.author === "string" ? data.author : "",
          updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : null
        })
        setStatus("ready")
      },
      () => {
        setStatus("not-found")
      }
    )

    return () => unsub()
  }, [docId])

  const setTitle = useCallback(async (newTitle: string) => {
    const trimmed = newTitle.trim()
    if (!trimmed) return

    const ref = doc(db, "documents", docId)
    await updateDoc(ref, {
      title: trimmed,
      updatedAt: Date.now()
    })
  }, [docId])

  return {
    status,
    title: meta.title,
    author: meta.author,
    updatedAt: meta.updatedAt,
    setTitle
  }
}
