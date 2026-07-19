export type CellFormat = {
  bold?: boolean
  italic?: boolean
  fontSize?: number
  textAlign?: 'left' | 'center' | 'right'
  backgroundColor?: string
  textColor?: string
}

export type CellData = {
  raw: string      // what the user typed, e.g. "=A1+B1" or "42" or "hello"
  display: string  // computed display value, e.g. "42" or an error code like "#CYCLE!"
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
