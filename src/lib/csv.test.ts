// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"

import { aCsv, exportarCsv, nombreArchivoSeguro } from "@/lib/csv"

describe("aCsv", () => {
  it("separa con ; y \r\n y entrecomilla todas las celdas", () => {
    expect(aCsv(["A", "B"], [[1, "x"]])).toBe('"A";"B"\r\n"1";"x"')
  })

  it("duplica comillas y conserva ; y saltos dentro de la celda", () => {
    expect(aCsv(["c"], [['di "hola"; ya\nfin']])).toBe('"c"\r\n"di ""hola""; ya\nfin"')
  })

  it("null y undefined quedan vacíos", () => {
    expect(aCsv(["a", "b"], [[null, undefined]])).toBe('"a";"b"\r\n"";""')
  })
})

describe("nombreArchivoSeguro", () => {
  it("reemplaza los caracteres prohibidos en Windows", () => {
    expect(nombreArchivoSeguro('a/b:c*d?"e<f>g|h.csv')).toBe("a-b-c-d-e-f-g-h.csv")
  })

  it("acepta caracteres extra", () => {
    expect(nombreArchivoSeguro("a · b.csv", "·")).toBe("a - b.csv")
  })
})

describe("exportarCsv", () => {
  afterEach(() => vi.restoreAllMocks())

  it("descarga un Blob con BOM y el nombre pedido", async () => {
    let blob: Blob | undefined
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b
      return "blob:x"
    })
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    exportarCsv("r.csv", ["Nombre"], [["Ñandú"]])

    expect(click).toHaveBeenCalledOnce()
    expect(blob?.type).toBe("text/csv;charset=utf-8")
    const bytes = new Uint8Array(await blob!.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('"Nombre"\r\n"Ñandú"')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x")
  })
})
