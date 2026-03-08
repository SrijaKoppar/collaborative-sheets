export type CellFormat = {
  bold?: boolean
  italic?: boolean
  fontSize?: number
  textAlign?: 'left' | 'center' | 'right'
  backgroundColor?: string
  textColor?: string
}

export type CellData = {
  value: string
  format?: CellFormat
}

export type Cells = Record<string, CellData>

export interface DocumentData {
  title: string
  author: string
  updatedAt: number
  cells: Cells
  columnWidths?: Record<string, number>
}

export interface UserPresence {
  id: string
  name: string
  color: string
  activeCellId?: string
  selectedRange?: {
    start: string
    end: string
  }
}

export interface SelectionRange {
  start: string
  end: string
}

export type HistoryEntry = {
  cells: Cells
  timestamp: number
}
