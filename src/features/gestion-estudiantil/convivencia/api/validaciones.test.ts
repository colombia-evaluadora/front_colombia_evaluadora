import { describe, expect, it } from "vitest"

import type { InvolucradoFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import {
  campoDeMensaje,
  errorLargo,
  erroresInvolucrado,
  siuceBody,
  validarSiuce,
} from "@/features/gestion-estudiantil/convivencia/api/validaciones"

describe("campoDeMensaje", () => {
  it.each([
    ["Este estudiante ya está en el caso.", "estudiantes"],
    ["Para un docente, directivo docente o administrativo elija el funcionario", "involucrados"],
    ["En un caso Tipo II o III el tipo de agresión es obligatorio", "agresion"],
    ["La fecha de conocimiento no puede ser futura", "fechaConocimiento"],
    ["El motivo de la corrección es obligatorio", "motivo"],
  ])("%s → %s", (mensaje, campo) => {
    expect(campoDeMensaje(mensaje)).toBe(campo)
  })

  it("un mensaje sin campo no marca nada", () => {
    expect(campoDeMensaje("Error inesperado")).toBeUndefined()
  })
})

describe("errorLargo", () => {
  it("obligatorio y rango", () => {
    expect(errorLargo("  ", 3, 5, "El campo")).toBe("El campo es obligatorio.")
    expect(errorLargo("ab", 3, 5, "El campo")).toBe("El campo debe tener entre 3 y 5 caracteres.")
    expect(errorLargo(" abc ", 3, 5, "El campo")).toBeUndefined()
  })
})

describe("SIUCE", () => {
  const vacio = { tiposDano: [], agresion: "", evento: "", repetitiva: null, secuelas: null }
  it("solo es obligatorio en Tipo II/III", () => {
    expect(validarSiuce(vacio, false, false)).toEqual({})
    expect(Object.keys(validarSiuce(vacio, true, true)).sort()).toEqual(["agresion", "repetitiva", "secuelas", "tiposDano"])
  })
  it("las secuelas solo viajan si están habilitadas", () => {
    expect(siuceBody({ ...vacio, secuelas: true }, false).SECUELAS_FISICAS).toBeNull()
    expect(siuceBody({ ...vacio, tiposDano: ["4"], secuelas: true }, true)).toMatchObject({ TIPOS_DANO: [4], SECUELAS_FISICAS: true })
  })
})

describe("erroresInvolucrado", () => {
  const fila = (p: Partial<InvolucradoFila>): InvolucradoFila => ({
    key: "a",
    tipo: "1",
    nombre: "Pedro Pérez",
    tipoDoc: "",
    numDoc: "",
    rol: "2",
    fk_funcionario: null,
    ...p,
  })
  it("una fila completa no tiene errores", () => {
    expect(erroresInvolucrado(fila({}), "PADRE", "TESTIGO")).toBeUndefined()
  })
  it("solo un funcionario puede ser afectado", () => {
    expect(erroresInvolucrado(fila({}), "PADRE", "AFECTADO")?.rol).toMatch(/funcionario/)
  })
  it("detecta a la persona repetida por documento", () => {
    const a = fila({ tipoDoc: "1", numDoc: "123" })
    const b = fila({ key: "b", tipoDoc: "1", numDoc: " 123 " })
    expect(erroresInvolucrado(a, "PADRE", "TESTIGO", [a, b])?.numDoc).toBe("Esta persona ya está en el caso.")
  })
})
