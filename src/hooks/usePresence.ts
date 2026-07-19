"use client"

import { useEffect, useState } from "react"
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { UserPresence } from "@/types/spreadsheet"

export function usePresence(docId: string, name: string, color: string) {

  const [users, setUsers] = useState<UserPresence[]>([])

  useEffect(() => {

    if (!name) return

    const presenceRef = collection(db, "documents", docId, "presence")

    // Create persistent userId per tab
    let userId = sessionStorage.getItem("presence-id")

    if (!userId) {
      userId = crypto.randomUUID()
      sessionStorage.setItem("presence-id", userId)
    }

    const userDoc = doc(db, "documents", docId, "presence", userId)

    // Create/update user document
    setDoc(userDoc, {
      name,
      color
    })

    // Listen to presence updates
    const unsubscribe = onSnapshot(presenceRef, (snapshot) => {

      const list: UserPresence[] = []

      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as UserPresence)
      })

      setUsers(list)
    })

    // Remove user on tab close
    const cleanup = () => deleteDoc(userDoc)
    window.addEventListener("beforeunload", cleanup)

    return () => {
      window.removeEventListener("beforeunload", cleanup)
      unsubscribe()
    }

  }, [docId, name, color])

  return users
}