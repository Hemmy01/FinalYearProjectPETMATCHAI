"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type CompareItem = {
  id: string
  name: string
  breed: string
  price: number
  species?: string
  image_url?: string | null
}

interface CompareCtx {
  items: CompareItem[]
  add: (item: CompareItem) => void
  remove: (id: string) => void
  clear: () => void
  has: (id: string) => boolean
}

const MAX_COMPARE = 3
const STORAGE_KEY = "petmatchai_compare"

const CompareContext = createContext<CompareCtx>({
  items: [], add: () => {}, remove: () => {}, clear: () => {}, has: () => false,
})

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  function persist(next: CompareItem[]) {
    setItems(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  function add(item: CompareItem) {
    setItems((prev) => {
      if (prev.length >= MAX_COMPARE || prev.some((p) => p.id === item.id)) return prev
      const next = [...prev, item]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  return (
    <CompareContext.Provider value={{
      items,
      add,
      remove: (id) => persist(items.filter((i) => i.id !== id)),
      clear: () => persist([]),
      has: (id) => items.some((i) => i.id === id),
    }}>
      {children}
    </CompareContext.Provider>
  )
}

export const useCompare = () => useContext(CompareContext)
