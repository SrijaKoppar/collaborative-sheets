import { describe, expect, it } from "vitest"
import { buildRangeTSV, getSelectionBounds, parseTSV } from "./rangeClipboard"
import { Cells } from "@/types/spreadsheet"

function cellToCoords(cellId: string) {
  const match = cellId.match(/([A-Z]+)(\d+)/)
  if (!match) return null
  return { col: match[1].charCodeAt(0) - 65, row: parseInt(match[2]) - 1 }
}

function coordsToCell(col: number, row: number) {
  return String.fromCharCode(65 + col) + (row + 1)
}

describe("getSelectionBounds", () => {
  it("returns null for an empty selection", () => {
    expect(getSelectionBounds(new Set(), cellToCoords)).toBeNull()
  })

  it("computes the bounding rectangle of a selection", () => {
    const bounds = getSelectionBounds(new Set(["B2", "A1", "C3"]), cellToCoords)
    expect(bounds).toEqual({ minCol: 0, maxCol: 2, minRow: 0, maxRow: 2 })
  })
})

describe("buildRangeTSV", () => {
  it("builds a tab/newline-delimited grid of raw values", () => {
    const cells: Cells = {
      A1: { raw: "1", display: "1" },
      B1: { raw: "2", display: "2" },
      A2: { raw: "3", display: "3" },
      B2: { raw: "=A1+A2", display: "4" }
    }
    const tsv = buildRangeTSV(new Set(["A1", "B1", "A2", "B2"]), cells, cellToCoords, coordsToCell)
    expect(tsv).toBe("1\t2\n3\t=A1+A2")
  })
})

describe("parseTSV", () => {
  it("splits rows and columns", () => {
    expect(parseTSV("1\t2\n3\t4")).toEqual([["1", "2"], ["3", "4"]])
  })

  it("drops a single trailing blank line", () => {
    expect(parseTSV("1\t2\n")).toEqual([["1", "2"]])
  })

  it("normalizes CRLF line endings", () => {
    expect(parseTSV("1\t2\r\n3\t4")).toEqual([["1", "2"], ["3", "4"]])
  })
})
