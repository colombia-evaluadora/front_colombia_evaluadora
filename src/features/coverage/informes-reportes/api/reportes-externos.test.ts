import { describe, expect, it } from "vitest"

import { archivoTexto, celdaCsv } from "@/features/coverage/informes-reportes/api/reportes-externos"

describe("celdaCsv", () => {
  it("deja el texto simple tal cual y los vacíos en blanco", () => {
    expect(celdaCsv("Sexto", ";")).toBe("Sexto")
    expect(celdaCsv(null, ";")).toBe("")
    expect(celdaCsv(undefined, ";")).toBe("")
    expect(celdaCsv(12, ";")).toBe("12")
  })

  it("entrecomilla lo que lleva separador, comillas o saltos de línea", () => {
    expect(celdaCsv("Calle 5; casa 2", ";")).toBe('"Calle 5; casa 2"')
    expect(celdaCsv('Barrio "El Prado"', ";")).toBe('"Barrio ""El Prado"""')
    expect(celdaCsv("línea 1\nlínea 2", ";")).toBe('"línea 1\nlínea 2"')
    expect(celdaCsv("a\tb", "\t")).toBe('"a\tb"')
  })
})

describe("archivoTexto", () => {
  const encabezados = ["Grado", "Documento", "SRPA"]
  const filas = [
    ["Sexto", "101", null],
    ["Séptimo", "102", "No aplica"],
  ]

  it("CSV con punto y coma y una línea por fila", () => {
    expect(archivoTexto(encabezados, filas, "CSV")).toBe("Grado;Documento;SRPA\r\nSexto;101;\r\nSéptimo;102;No aplica")
  })

  it("texto plano separado por tabuladores", () => {
    expect(archivoTexto(encabezados, filas, "TEXTO")).toBe("Grado\tDocumento\tSRPA\r\nSexto\t101\t\r\nSéptimo\t102\tNo aplica")
  })
})
