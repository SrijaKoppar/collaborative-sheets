import { describe, expect, it } from "vitest"
import { evaluateSheet } from "./formulaParser"

describe("evaluateSheet", () => {
  it("evaluates plain numbers and text as-is", () => {
    const result = evaluateSheet({ A1: "42", A2: "hello" })
    expect(result.A1).toBe("42")
    expect(result.A2).toBe("hello")
  })

  it("evaluates basic arithmetic with operator precedence", () => {
    const result = evaluateSheet({ A1: "=2+3*4" })
    expect(result.A1).toBe("14")
  })

  it("evaluates parenthesized expressions", () => {
    const result = evaluateSheet({ A1: "=(2+3)*4" })
    expect(result.A1).toBe("20")
  })

  it("resolves cell references, including chained dependencies", () => {
    const result = evaluateSheet({ A1: "5", B1: "=A1+1", C1: "=B1*2" })
    expect(result.A1).toBe("5")
    expect(result.B1).toBe("6")
    expect(result.C1).toBe("12")
  })

  it("treats blank referenced cells as 0", () => {
    const result = evaluateSheet({ A1: "=B1+5" })
    expect(result.A1).toBe("5")
  })

  it("supports SUM over a range", () => {
    const result = evaluateSheet({ A1: "1", A2: "2", A3: "3", B1: "=SUM(A1:A3)" })
    expect(result.B1).toBe("6")
  })

  it("supports SUM over a comma-separated list", () => {
    const result = evaluateSheet({ A1: "1", B1: "2", C1: "3", D1: "=SUM(A1,B1,C1)" })
    expect(result.D1).toBe("6")
  })

  it("supports AVERAGE over a range, ignoring blanks", () => {
    const result = evaluateSheet({ A1: "10", A2: "", A3: "20", B1: "=AVERAGE(A1:A3)" })
    expect(result.B1).toBe("15")
  })

  it("supports MIN, MAX, and COUNT", () => {
    const result = evaluateSheet({
      A1: "3", A2: "1", A3: "2",
      B1: "=MIN(A1:A3)", B2: "=MAX(A1:A3)", B3: "=COUNT(A1:A3)"
    })
    expect(result.B1).toBe("1")
    expect(result.B2).toBe("3")
    expect(result.B3).toBe("3")
  })

  it("detects a direct circular reference", () => {
    const result = evaluateSheet({ A1: "=B1", B1: "=A1" })
    expect(result.A1).toBe("#CYCLE!")
    expect(result.B1).toBe("#CYCLE!")
  })

  it("detects a self-reference as a cycle", () => {
    const result = evaluateSheet({ A1: "=A1+1" })
    expect(result.A1).toBe("#CYCLE!")
  })

  it("reports #DIV/0! for division by zero", () => {
    const result = evaluateSheet({ A1: "=5/0" })
    expect(result.A1).toBe("#DIV/0!")
  })

  it("reports #VALUE! when a formula operand isn't numeric", () => {
    const result = evaluateSheet({ A1: "hello", B1: "=A1+1" })
    expect(result.B1).toBe("#VALUE!")
  })

  it("reports #ERROR! for a malformed formula", () => {
    const result = evaluateSheet({ A1: "=1+" })
    expect(result.A1).toBe("#ERROR!")
  })

  it("reports #REF! for an invalid range endpoint", () => {
    const result = evaluateSheet({ A1: "=SUM(A1:B)" })
    expect(result.A1).toBe("#REF!")
  })
})
