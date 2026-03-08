export type CellData = {
  value: string
}

export type Cells = Record<string, CellData>

export interface DocumentData {
  title: string
  author: string
  updatedAt: number
  cells: Cells
}

export interface UserPresence {
  id: string
  name: string
  color: string
}