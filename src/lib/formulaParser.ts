export function evaluateFormula(
  formula: string,
  cells: any
): string | number {
  
  if (!formula.startsWith("=")) return formula

  try {
    let expr = formula.slice(1)

    // Handle SUM function with range support (e.g., SUM(A1:A5))
    expr = expr.replace(/SUM\(([A-Z][0-9]+):([A-Z][0-9]+)\)/g, (match, start, end) => {
      return calculateRange(start, end, cells).toString()
    })

    // Handle SUM function with comma-separated cells
    expr = expr.replace(/SUM\(([^)]+)\)/g, (match, cellRef) => {
      const refs = cellRef.split(",").map((r: string) => r.trim())
      let sum = 0
      refs.forEach((ref: string) => {
        const value = cells?.[ref]?.value
        sum += Number(value) || 0
      })
      return sum.toString()
    })

    // Handle AVERAGE function
    expr = expr.replace(/AVERAGE\(([^)]+)\)/g, (match, cellRef) => {
      const refs = cellRef.split(",").map((r: string) => r.trim())
      let sum = 0
      let count = 0
      refs.forEach((ref: string) => {
        const value = cells?.[ref]?.value
        const num = Number(value)
        if (!isNaN(num)) {
          sum += num
          count++
        }
      })
      return (count > 0 ? sum / count : 0).toString()
    })

    // Handle cell references
    expr = expr.replace(/[A-Z][0-9]+/g, (ref: string) => {
      const value = cells?.[ref]?.value
      const num = Number(value)
      return isNaN(num) ? "0" : num.toString()
    })

    // Safely evaluate the expression
    const result = Function(`"use strict"; return (${expr})`)()
    
    // Return as number if it's a valid number, otherwise as string
    const numResult = Number(result)
    return isNaN(numResult) ? "ERR" : numResult
  } catch (error) {
    return "ERR"
  }
}

function calculateRange(start: string, end: string, cells: any): number {
  const startCol = start.charCodeAt(0) - 65
  const startRow = parseInt(start.slice(1))
  
  const endCol = end.charCodeAt(0) - 65
  const endRow = parseInt(end.slice(1))
  
  let sum = 0
  
  for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
    for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
      const cellId = String.fromCharCode(65 + col) + row
      const value = cells?.[cellId]?.value
      sum += Number(value) || 0
    }
  }
  
  return sum
}

export function evaluateSUM(
  formula: string,
  cells: Record<string, any>
): number | string {
  
  const match = formula.match(/SUM\((.*?)\)/)

  if (!match) return "ERROR"

  const refs = match[1].split(",")
  let total = 0

  refs.forEach((ref: string) => {
    const trimmed = ref.trim()
    const value = cells?.[trimmed]?.value
    total += Number(value) || 0
  })

  return total
}

