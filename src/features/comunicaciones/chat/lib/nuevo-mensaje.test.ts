import { describe, expect, it } from "vitest"
import { AxiosError, AxiosHeaders } from "axios"

import type { Persona } from "@/features/comunicaciones/chat/api/types"
import {
  ASUNTO_LARGO,
  ASUNTO_OBLIGATORIO,
  MENOR_NO_INICIA,
  SOLO_UNO_INDIVIDUAL,
  mensajeErrorNuevo,
  nuevoMensajeSchema,
} from "@/features/comunicaciones/chat/lib/nuevo-mensaje"

const persona = (id: number): Persona => ({ id, nombre: `Persona ${id}`, correo: "" })
const base = { para: [persona(1)], modo: "INDIVIDUAL" as const, asunto: "Salida", mensaje: "Hola" }

const errores = (v: unknown) => {
  const r = nuevoMensajeSchema.safeParse(v)
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
}

describe("nuevoMensajeSchema", () => {
  it("acepta un individual completo", () => {
    expect(errores(base)).toEqual([])
  })

  it("exige asunto con tope de 120", () => {
    expect(errores({ ...base, asunto: "  " })).toEqual([`asunto: ${ASUNTO_OBLIGATORIO}`])
    expect(errores({ ...base, asunto: "a".repeat(121) })).toEqual([`asunto: ${ASUNTO_LARGO}`])
  })

  it("valida los destinatarios según el modo", () => {
    expect(errores({ ...base, para: [] })).toEqual(["para: Elija al menos un destinatario."])
    expect(errores({ ...base, para: [persona(1), persona(2)] })).toEqual([`para: ${SOLO_UNO_INDIVIDUAL}`])
    expect(errores({ ...base, modo: "SEPARADO", para: [persona(1), persona(2)] })).toEqual([])
    expect(errores({ ...base, modo: "GRUPAL", para: [persona(1), persona(2)] })).toEqual([])
    expect(errores({ ...base, modo: "SEPARADO", para: Array.from({ length: 201 }, (_, i) => persona(i)) })).toHaveLength(1)
  })
})

describe("mensajeErrorNuevo", () => {
  const error = (status: number, data: unknown) =>
    new AxiosError("x", "ERR", undefined, undefined, {
      status,
      data,
      statusText: "",
      headers: {},
      config: { headers: new AxiosHeaders() },
    })

  it("un 403 sin frase es el del estudiante menor", () => {
    expect(mensajeErrorNuevo(error(403, ""))).toBe(MENOR_NO_INICIA)
  })

  it("con frase del servidor la muestra", () => {
    expect(mensajeErrorNuevo(error(403, { message: "La política no permite este mensaje directo." }))).toBe(
      "La política no permite este mensaje directo.",
    )
  })
})
