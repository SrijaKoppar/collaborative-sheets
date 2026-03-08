"use client"

import { collection, getDocs, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function Page() {

  const [docs, setDocs] = useState<any[]>([])

  async function loadDocs() {

    const snap = await getDocs(collection(db, "documents"))

    const list = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))

    setDocs(list)
  }

  useEffect(() => {
    loadDocs()
  }, [])

  async function createDocument() {

    const ref = await addDoc(collection(db, "documents"), {
      title: "Untitled Sheet",
      author: "Guest",
      updatedAt: Date.now(),
      cells: {}
    })

    window.location.href = `/doc/${ref.id}`
  }

  return (
    <div className="p-10">

      <h1 className="text-2xl font-bold mb-4">
        Documents
      </h1>

      <button
        onClick={createDocument}
        className="mb-6 px-4 py-2 bg-blue-500 text-white rounded"
      >
        New Document
      </button>

      <div className="space-y-3">

        {docs.map((d: any) => (

          <Link
            key={d.id}
            href={`/doc/${d.id}`}
            className="block border p-4 rounded"
          >
            <div>{d.title}</div>
            <div className="text-sm text-gray-500">
              {d.author}
            </div>
          </Link>

        ))}

      </div>

    </div>
  )
}