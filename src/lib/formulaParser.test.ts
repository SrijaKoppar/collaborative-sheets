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

  describe("nested formulas", () => {
    it("combines two aggregate calls in one arithmetic expression", () => {
      const result = evaluateSheet({
        A1: "1", A2: "2", A3: "3",
        B1: "4", B2: "5", B3: "6",
        C1: "=SUM(A1:A3)+AVERAGE(B1:B3)"
      })
      expect(result.C1).toBe("11") // 6 + 5
    })

    it("allows a function call as an argument to another function", () => {
      const result = evaluateSheet({
        A1: "10", A2: "20", A3: "30",
        B1: "=SUM(A1, MAX(A1:A3))"
      })
      expect(result.B1).toBe("40") // 10 + 30
    })

    it("nests parentheses and functions inside a larger expression", () => {
      const result = evaluateSheet({
        A1: "2", A2: "4",
        B1: "=(SUM(A1:A2) + 2) * 3"
      })
      expect(result.B1).toBe("24") // (6 + 2) * 3
    })

    it("chains a formula through several dependent cells", () => {
      const result = evaluateSheet({
        A1: "2",
        B1: "=A1*2",
        C1: "=SUM(A1,B1)",
        D1: "=C1+1"
      })
      expect(result.B1).toBe("4")
      expect(result.C1).toBe("6")
      expect(result.D1).toBe("7")
    })
  })

  describe("invalid syntax", () => {
    it("reports #ERROR! for an operator with no right-hand operand", () => {
      expect(evaluateSheet({ A1: "=1+*2" }).A1).toBe("#ERROR!")
    })

    it("reports #ERROR! for an unclosed parenthesis", () => {
      expect(evaluateSheet({ A1: "=(1+2" }).A1).toBe("#ERROR!")
    })

    it("reports #ERROR! for an unclosed function call", () => {
      expect(evaluateSheet({ A1: "=SUM(A1,A2" }).A1).toBe("#ERROR!")
    })

    it("reports #ERROR! for trailing tokens after a complete expression", () => {
      expect(evaluateSheet({ A1: "=1 2" }).A1).toBe("#ERROR!")
    })

    it("reports #ERROR! for an unknown function name", () => {
      expect(evaluateSheet({ A1: "=NOPE(1,2)" }).A1).toBe("#ERROR!")
    })

    it("reports #REF! for a malformed cell reference", () => {
      // Tokenizes as one identifier; fails the cell-reference shape check.
      expect(evaluateSheet({ A1: "=A1B2" }).A1).toBe("#REF!")
    })
  })

  describe("cycle propagation", () => {
    it("marks every cell in a 3-cell cycle as #CYCLE!", () => {
      const result = evaluateSheet({ A1: "=B1", B1: "=C1", C1: "=A1" })
      expect(result.A1).toBe("#CYCLE!")
      expect(result.B1).toBe("#CYCLE!")
      expect(result.C1).toBe("#CYCLE!")
    })

    it("marks a cycle reached through a diamond dependency", () => {
      // D1 depends on A1, which depends on B1 and C1, which both depend on D1.
      const result = evaluateSheet({
        A1: "=B1+C1",
        B1: "=D1",
        C1: "=D1",
        D1: "=A1"
      })
      expect(result.A1).toBe("#CYCLE!")
      expect(result.B1).toBe("#CYCLE!")
      expect(result.C1).toBe("#CYCLE!")
      expect(result.D1).toBe("#CYCLE!")
    })

    it("does not falsely flag a diamond dependency that isn't actually a cycle", () => {
      // B1 and C1 both depend on A1; D1 depends on both. No cycle here.
      const result = evaluateSheet({
        A1: "10",
        B1: "=A1+1",
        C1: "=A1+2",
        D1: "=B1+C1"
      })
      expect(result.B1).toBe("11")
      expect(result.C1).toBe("12")
      expect(result.D1).toBe("23")
    })

    it("only marks the cells actually in the cycle, not an unrelated dependent", () => {
      const result = evaluateSheet({
        A1: "=B1",
        B1: "=A1",
        C1: "=5" // unrelated, not part of the cycle
      })
      expect(result.A1).toBe("#CYCLE!")
      expect(result.B1).toBe("#CYCLE!")
      expect(result.C1).toBe("5")
    })
  })

  describe("blank cells", () => {
    it("treats a fully blank arithmetic expression as 0", () => {
      const result = evaluateSheet({ A1: "=B1+C1" })
      expect(result.A1).toBe("0")
    })

    it("excludes blanks from SUM without affecting the total", () => {
      const result = evaluateSheet({ A1: "1", A2: "", A3: "", A4: "2", B1: "=SUM(A1:A4)" })
      expect(result.B1).toBe("3")
    })

    it("excludes blanks from COUNT", () => {
      const result = evaluateSheet({ A1: "1", A2: "", A3: "2", B1: "=COUNT(A1:A3)" })
      expect(result.B1).toBe("2")
    })

    it("reports #DIV/0! for AVERAGE of an entirely blank range", () => {
      const result = evaluateSheet({ A1: "", A2: "", B1: "=AVERAGE(A1:A2)" })
      expect(result.B1).toBe("#DIV/0!")
    })
  })

  describe("ranges", () => {
    it("supports a range written back-to-front", () => {
      const result = evaluateSheet({ A1: "1", A2: "2", A3: "3", B1: "=SUM(A3:A1)" })
      expect(result.B1).toBe("6")
    })

    it("supports a single-cell range", () => {
      const result = evaluateSheet({ A1: "7", B1: "=SUM(A1:A1)" })
      expect(result.B1).toBe("7")
    })

    it("supports a rectangular 2D range", () => {
      const result = evaluateSheet({
        A1: "1", B1: "2",
        A2: "3", B2: "4",
        C1: "=SUM(A1:B2)"
      })
      expect(result.C1).toBe("10")
    })
  })

  describe("error propagation policy", () => {
    it("propagates an error from a ref argument into SUM, rather than ignoring it", () => {
      const result = evaluateSheet({ A1: "=1/0", B1: "=SUM(A1,5)" })
      expect(result.B1).toBe("#DIV/0!")
    })

    it("propagates an error from within a range argument into SUM", () => {
      const result = evaluateSheet({ A1: "1", A2: "=1/0", A3: "3", B1: "=SUM(A1:A3)" })
      expect(result.B1).toBe("#DIV/0!")
    })

    it("propagates an error from within a range argument into AVERAGE and COUNT", () => {
      const cells = { A1: "1", A2: "=1/0", A3: "3" }
      expect(evaluateSheet({ ...cells, B1: "=AVERAGE(A1:A3)" }).B1).toBe("#DIV/0!")
      expect(evaluateSheet({ ...cells, B1: "=COUNT(A1:A3)" }).B1).toBe("#DIV/0!")
    })

    it("still excludes non-numeric text from SUM without treating it as an error", () => {
      const result = evaluateSheet({ A1: "1", A2: "hello", A3: "3", B1: "=SUM(A1:A3)" })
      expect(result.B1).toBe("4")
    })
  })
})
