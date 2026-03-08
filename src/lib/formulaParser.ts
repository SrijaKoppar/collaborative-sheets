export function evaluateFormula(
  formula:string,
  cells:any
){

  if(!formula.startsWith("=")) return formula

  const expr=formula
    .slice(1)
    .replace(/[A-Z][0-9]+/g,
      ref=>cells?.[ref]?.value || 0
    )

  try{
    return eval(expr)
  }catch{
    return "ERR"
  }
}

export function evaluateSUM(
  formula: string,
  cells: Record<string, string>
) {

  const match = formula.match(/SUM\((.*?)\)/)

  if (!match) return "ERROR"

  const refs = match[1].split(",")

  let total = 0

  refs.forEach((ref) => {
    total += Number(cells[ref.trim()] || 0)
  })

  return total
}

