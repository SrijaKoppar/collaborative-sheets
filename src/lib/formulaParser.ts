/**
 * A small, dependency-aware formula engine for the spreadsheet.
 *
 * Design notes:
 * - No `Function(...)`/`eval` — formulas are tokenized and parsed into an AST,
 *   then walked by a plain recursive evaluator.
 * - "Recalculating dependents" is done by re-evaluating the whole sheet from
 *   raw values on every change, memoized per cell within a single pass via
 *   `EvalContext.cache`. At the sheet sizes this app supports (a few hundred
 *   cells) this is effectively instant and is much simpler and more robust
 *   than maintaining an incremental dependency graph, while still giving
 *   correct, fully-recalculated results.
 * - Circular references are detected via `EvalContext.visiting` and reported
 *   as #CYCLE! on every cell in the cycle.
 */

// ---------- Errors ----------

export type FormulaErrorCode = "#REF!" | "#VALUE!" | "#CYCLE!" | "#ERROR!" | "#DIV/0!"

export class FormulaError extends Error {
  code: FormulaErrorCode
  constructor(code: FormulaErrorCode) {
    super(code)
    this.code = code
  }
}

function isFormulaErrorCode(value: string): value is FormulaErrorCode {
  return value === "#REF!" || value === "#VALUE!" || value === "#CYCLE!" || value === "#ERROR!" || value === "#DIV/0!"
}

export function isFormulaError(value: string): boolean {
  return isFormulaErrorCode(value)
}

// ---------- Tokenizer ----------

type TokenType =
  | "number" | "ident" | "plus" | "minus" | "star" | "slash"
  | "lparen" | "rparen" | "comma" | "colon" | "eof"

interface Token {
  type: TokenType
  value: string
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < expr.length) {
    const ch = expr[i]

    if (/\s/.test(ch)) { i++; continue }

    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(expr[i + 1] || ""))) {
      let j = i
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++
      tokens.push({ type: "number", value: expr.slice(i, j) })
      i = j
      continue
    }

    if (/[A-Za-z]/.test(ch)) {
      let j = i
      while (j < expr.length && /[A-Za-z0-9]/.test(expr[j])) j++
      tokens.push({ type: "ident", value: expr.slice(i, j).toUpperCase() })
      i = j
      continue
    }

    switch (ch) {
      case "+": tokens.push({ type: "plus", value: ch }); i++; continue
      case "-": tokens.push({ type: "minus", value: ch }); i++; continue
      case "*": tokens.push({ type: "star", value: ch }); i++; continue
      case "/": tokens.push({ type: "slash", value: ch }); i++; continue
      case "(": tokens.push({ type: "lparen", value: ch }); i++; continue
      case ")": tokens.push({ type: "rparen", value: ch }); i++; continue
      case ",": tokens.push({ type: "comma", value: ch }); i++; continue
      case ":": tokens.push({ type: "colon", value: ch }); i++; continue
      default:
        throw new FormulaError("#ERROR!")
    }
  }

  tokens.push({ type: "eof", value: "" })
  return tokens
}

// ---------- AST ----------

type AstNode =
  | { type: "number"; value: number }
  | { type: "ref"; cell: string }
  | { type: "range"; start: string; end: string }
  | { type: "binary"; op: "+" | "-" | "*" | "/"; left: AstNode; right: AstNode }
  | { type: "unary"; op: "+" | "-"; operand: AstNode }
  | { type: "call"; name: string; args: AstNode[] }

const CELL_REF_RE = /^[A-Z]+[0-9]+$/

// ---------- Parser (recursive descent) ----------

class Parser {
  private tokens: Token[]
  private pos = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private peek(offset = 0): Token {
    return this.tokens[this.pos + offset]
  }

  private next(): Token {
    return this.tokens[this.pos++]
  }

  private expect(type: TokenType): Token {
    const tok = this.next()
    if (tok.type !== type) throw new FormulaError("#ERROR!")
    return tok
  }

  parseExpression(): AstNode {
    const node = this.parseAddSub()
    if (this.peek().type !== "eof") throw new FormulaError("#ERROR!")
    return node
  }

  private parseAddSub(): AstNode {
    let left = this.parseMulDiv()
    while (this.peek().type === "plus" || this.peek().type === "minus") {
      const op = this.next().type === "plus" ? "+" : "-"
      const right = this.parseMulDiv()
      left = { type: "binary", op, left, right }
    }
    return left
  }

  private parseMulDiv(): AstNode {
    let left = this.parseUnary()
    while (this.peek().type === "star" || this.peek().type === "slash") {
      const op = this.next().type === "star" ? "*" : "/"
      const right = this.parseUnary()
      left = { type: "binary", op, left, right }
    }
    return left
  }

  private parseUnary(): AstNode {
    if (this.peek().type === "minus" || this.peek().type === "plus") {
      const op = this.next().type === "minus" ? "-" : "+"
      const operand = this.parseUnary()
      return { type: "unary", op, operand }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): AstNode {
    const tok = this.peek()

    if (tok.type === "number") {
      this.next()
      return { type: "number", value: parseFloat(tok.value) }
    }

    if (tok.type === "lparen") {
      this.next()
      const node = this.parseAddSub()
      this.expect("rparen")
      return node
    }

    if (tok.type === "ident") {
      this.next()
      const name = tok.value

      // Function call: NAME(args)
      if (this.peek().type === "lparen") {
        this.next()
        const args: AstNode[] = []
        if (this.peek().type !== "rparen") {
          args.push(this.parseArg())
          while (this.peek().type === "comma") {
            this.next()
            args.push(this.parseArg())
          }
        }
        this.expect("rparen")
        return { type: "call", name, args }
      }

      // Plain cell reference (e.g. A1)
      if (!CELL_REF_RE.test(name)) throw new FormulaError("#REF!")
      return { type: "ref", cell: name }
    }

    throw new FormulaError("#ERROR!")
  }

  // A function-call argument may be a range (A1:A5) or any expression.
  private parseArg(): AstNode {
    if (this.peek().type === "ident" && CELL_REF_RE.test(this.peek().value) && this.peek(1).type === "colon") {
      const start = this.next().value
      this.next() // consume ':'
      const endTok = this.next()
      if (endTok.type !== "ident" || !CELL_REF_RE.test(endTok.value)) {
        throw new FormulaError("#REF!")
      }
      return { type: "range", start, end: endTok.value }
    }
    return this.parseAddSub()
  }
}

function parseFormula(expr: string): AstNode {
  const tokens = tokenize(expr)
  return new Parser(tokens).parseExpression()
}

// ---------- Column <-> index helpers (supports multi-letter columns) ----------

function colToIndex(letters: string): number {
  let idx = 0
  for (const ch of letters) {
    idx = idx * 26 + (ch.charCodeAt(0) - 64)
  }
  return idx - 1
}

function indexToCol(index: number): string {
  let n = index + 1
  let out = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function expandRange(start: string, end: string): string[] {
  const startMatch = start.match(/^([A-Z]+)([0-9]+)$/)
  const endMatch = end.match(/^([A-Z]+)([0-9]+)$/)
  if (!startMatch || !endMatch) throw new FormulaError("#REF!")

  const startCol = colToIndex(startMatch[1])
  const endCol = colToIndex(endMatch[1])
  const startRow = parseInt(startMatch[2], 10)
  const endRow = parseInt(endMatch[2], 10)

  const ids: string[] = []
  for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
    for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
      ids.push(indexToCol(col) + row)
    }
  }
  return ids
}

// ---------- Evaluation ----------

type CellValue = number | string

interface CellResult {
  value: CellValue
  error?: FormulaErrorCode
}

interface EvalContext {
  rawCells: Record<string, string>
  cache: Map<string, CellResult>
  visiting: Set<string>
}

function evaluateCellInternal(cellId: string, ctx: EvalContext): CellResult {
  const cached = ctx.cache.get(cellId)
  if (cached) return cached

  if (ctx.visiting.has(cellId)) {
    const result: CellResult = { value: "", error: "#CYCLE!" }
    ctx.cache.set(cellId, result)
    return result
  }

  const raw = (ctx.rawCells[cellId] ?? "").trim()

  if (raw === "") {
    const result: CellResult = { value: "" }
    ctx.cache.set(cellId, result)
    return result
  }

  if (!raw.startsWith("=")) {
    const num = Number(raw)
    const result: CellResult = { value: !isNaN(num) ? num : raw }
    ctx.cache.set(cellId, result)
    return result
  }

  ctx.visiting.add(cellId)
  try {
    const ast = parseFormula(raw.slice(1))
    const value = evalNode(ast, ctx)
    const result: CellResult = { value }
    ctx.cache.set(cellId, result)
    return result
  } catch (err) {
    const code: FormulaErrorCode = err instanceof FormulaError ? err.code : "#ERROR!"
    const result: CellResult = { value: "", error: code }
    ctx.cache.set(cellId, result)
    return result
  } finally {
    ctx.visiting.delete(cellId)
  }
}

function getCellNumericValue(cellId: string, ctx: EvalContext): number {
  const result = evaluateCellInternal(cellId, ctx)
  if (result.error) throw new FormulaError(result.error)
  if (result.value === "") return 0 // blank cells act as 0 in arithmetic
  const num = typeof result.value === "number" ? result.value : Number(result.value)
  if (isNaN(num)) throw new FormulaError("#VALUE!")
  return num
}

function evalNode(node: AstNode, ctx: EvalContext): number {
  switch (node.type) {
    case "number":
      return node.value
    case "ref":
      return getCellNumericValue(node.cell, ctx)
    case "range":
      // A bare range (e.g. "=A1:A5") isn't a valid arithmetic operand on its own.
      throw new FormulaError("#VALUE!")
    case "unary": {
      const v = evalNode(node.operand, ctx)
      return node.op === "-" ? -v : v
    }
    case "binary": {
      const l = evalNode(node.left, ctx)
      const r = evalNode(node.right, ctx)
      switch (node.op) {
        case "+": return l + r
        case "-": return l - r
        case "*": return l * r
        case "/":
          if (r === 0) throw new FormulaError("#DIV/0!")
          return l / r
      }
      break
    }
    case "call":
      return evalCall(node, ctx)
  }
  throw new FormulaError("#ERROR!")
}

function collectArgValues(args: AstNode[], ctx: EvalContext): number[] {
  const values: number[] = []

  const pushIfNumeric = (cellId: string) => {
    const result = evaluateCellInternal(cellId, ctx)
    if (result.error) return // ignore errored cells within an aggregate range
    if (result.value === "") return // ignore blanks within an aggregate range
    const num = typeof result.value === "number" ? result.value : Number(result.value)
    if (!isNaN(num)) values.push(num)
  }

  for (const arg of args) {
    if (arg.type === "range") {
      expandRange(arg.start, arg.end).forEach(pushIfNumeric)
    } else if (arg.type === "ref") {
      pushIfNumeric(arg.cell)
    } else {
      values.push(evalNode(arg, ctx))
    }
  }

  return values
}

function evalCall(node: Extract<AstNode, { type: "call" }>, ctx: EvalContext): number {
  const values = collectArgValues(node.args, ctx)

  switch (node.name) {
    case "SUM":
      return values.reduce((a, b) => a + b, 0)
    case "AVERAGE":
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    case "MIN":
      return values.length > 0 ? Math.min(...values) : 0
    case "MAX":
      return values.length > 0 ? Math.max(...values) : 0
    case "COUNT":
      return values.length
    default:
      throw new FormulaError("#ERROR!")
  }
}

// ---------- Public API ----------

/**
 * Evaluates every cell's raw formula/value against the rest of the sheet and
 * returns a map of cellId -> display string (a computed value or an error
 * code such as "#CYCLE!"). Referenced cells are resolved and recalculated
 * automatically, however deep the dependency chain.
 */
export function evaluateSheet(rawCells: Record<string, string>): Record<string, string> {
  const ctx: EvalContext = {
    rawCells,
    cache: new Map(),
    visiting: new Set()
  }

  const display: Record<string, string> = {}
  for (const cellId of Object.keys(rawCells)) {
    const result = evaluateCellInternal(cellId, ctx)
    display[cellId] = result.error ?? String(result.value)
  }
  return display
}
