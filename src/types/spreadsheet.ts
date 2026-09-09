export type CellFormat = {
  bold?: boolean
  italic?: boolean
  fontSize?: number
  textAlign?: 'left' | 'center' | 'right'
  backgroundColor?: string
  textColor?: string
}

/**
 * Same shape as CellFormat, but each field may also be the literal "mixed"
 * when the selected cells don't all agree on that property - used by the
 * toolbar to show an indeterminate/mixed state instead of just whatever the
 * first selected cell happens to have.
 */
export type MixedCellFormat = {
  [K in keyof CellFormat]?: CellFormat[K] | 'mixed'
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
  rowHeights?: Record<string, number>
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
