import { Cells } from "@/types/spreadsheet"

interface CellCoords {
  col: number
  row: number
}

/** Bounding rectangle (in col/row coordinates) of a set of selected cells. */
export function getSelectionBounds(
  selectedCells: Set<string>,
  cellToCoords: (cellId: string) => CellCoords | null
): { minCol: number; maxCol: number; minRow: number; maxRow: number } | null {
  let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity

  selectedCells.forEach((id) => {
    const coords = cellToCoords(id)
    if (!coords) return
    minCol = Math.min(minCol, coords.col)
    maxCol = Math.max(maxCol, coords.col)
    minRow = Math.min(minRow, coords.row)
    maxRow = Math.max(maxRow, coords.row)
  })

  if (!isFinite(minCol)) return null
  return { minCol, maxCol, minRow, maxRow }
}

/** Builds a tab/newline-delimited string of raw cell contents for the given selection. */
export function buildRangeTSV(
  selectedCells: Set<string>,
  cells: Cells,
  cellToCoords: (cellId: string) => CellCoords | null,
  coordsToCell: (col: number, row: number) => string
): string {
  const bounds = getSelectionBounds(selectedCells, cellToCoords)
  if (!bounds) return ""

  const rows: string[] = []
  for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
    const cols: string[] = []
    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
      const id = coordsToCell(col, row)
      cols.push(cells[id]?.raw ?? "")
    }
    rows.push(cols.join("\t"))
  }
  return rows.join("\n")
}

/** Parses pasted clipboard text into a 2D grid of cell values. */
export function parseTSV(text: string): string[][] {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === "")) // drop trailing blank line
    .map((row) => row.split("\t"))
}
