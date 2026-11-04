import { describe, expect, it } from "vitest"

import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import {
  actualizarCasoInput,
  crearCasoInput,
  desdeCaso,
  fechasDe,
  validarCaso,
  type ContextoValidacion,
  type ValoresCaso,
} from "@/features/gestion-estudiantil/convivencia/utils/caso-form"

const ctx: ContextoValidacion = {
  grave: false,
  tipoI: false,
  secuelas: false,
  fechasCambiaron: false,
  involucradoConError: () => false,
}

const valido = (patch: Partial<ValoresCaso> = {}): ValoresCaso => ({
  ...desdeCaso(undefined),
  tipo: "1",
  manifestacion: "2",
  fechaConocida: false,
  fechaConocimiento: "2026-01-10",
  lugar: "3",
  descripcion: "Descripción suficientemente larga.",
  estudiantes: [{ fk_matricula: 7, nombre: "Ana", grado: "5A", rol: "9" }],
  ...patch,
})

const caso = {
  id: 40,
  numero: 12,
  fk_tlv_tipo: 1,
  tipo_codigo: "TIPO_I",
  tipo_nombre: "Tipo I",
  estado_codigo: "REPORTADO",
  estado_nombre: "Reportado",
  fecha_conocimiento: "2026-01-10T00:00:00",
  acceso_completo: true,
  fk_tlv_manifestacion: 2,
  fecha_hechos_conocida: true,
  fecha_hechos: "2026-01-09T00:00:00",
  hora_hechos_conocida: true,
  hora_hechos: "08:30:00",
  fk_tlv_lugar: 3,
  descripcion: "Hechos",
  estudiantes: [
    { id: 1, fk_matricula: 7, nombre: "Ana", grado_grupo: "5A", fk_tlv_rol: 9 },
    { id: 2, fk_matricula: 8, nombre: "Luis", grado_grupo: null, fk_tlv_rol: 9 },
  ],
  otros_involucrados: [{ id: 5, fk_tlv_tipo_involucrado: 4, nombre: "Pedro", fk_tlv_rol: 9, fk_funcionario: null }],
} as unknown as CasoDetalle

describe("desdeCaso", () => {
  it("arranca vacío al crear, con la fecha de conocimiento de hoy", () => {
    const v = desdeCaso(undefined)
    expect(v.tipo).toBe("")
    expect(v.fechaConocida).toBeNull()
    expect(v.fechaConocimiento).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("carga el caso al modificar", () => {
    const v = desdeCaso(caso)
    expect(v).toMatchObject({ tipo: "1", fechaHechos: "2026-01-09", hora: "08:30", horaConocida: true })
    expect(v.estudiantes[0]).toMatchObject({ id: 1, rol: "9", rolOriginal: "9", grado: "5A" })
    expect(v.involucrados[0]).toMatchObject({ key: "inv-5", id: 5, tipo: "4" })
  })
})

describe("validarCaso", () => {
  it("un caso completo no tiene errores", () => {
    expect(validarCaso(valido(), ctx)).toEqual({})
  })

  it("exige fecha y hora cuando se conocen", () => {
    const e = validarCaso(valido({ fechaConocida: true }), ctx)
    expect(e.fechaHechos).toBe("La fecha de los hechos es obligatoria.")
    expect(e.horaConocida).toBe("Indique si se conoce la hora.")
  })

  it("la fecha de los hechos no supera la de conocimiento", () => {
    const e = validarCaso(valido({ fechaConocida: true, fechaHechos: "2026-01-11", horaConocida: false }), ctx)
    expect(e.fechaHechos).toBe("No puede ser posterior a la fecha de conocimiento.")
  })

  it("Tipo I pide dos personas y el rol de cada estudiante", () => {
    expect(validarCaso(valido(), { ...ctx, tipoI: true }).estudiantes).toMatch(/al menos dos personas/)
    const sinRol = valido({ estudiantes: [{ fk_matricula: 7, nombre: "Ana", grado: "", rol: "" }] })
    expect(validarCaso(sinRol, ctx).estudiantes).toBe("Elija el rol de cada estudiante.")
  })

  it("marca involucrados con error y exige motivo si cambian las fechas", () => {
    const v = valido({ involucrados: [{ key: "k", tipo: "", nombre: "", tipoDoc: "", numDoc: "", rol: "", fk_funcionario: null }] })
    const e = validarCaso(v, { ...ctx, involucradoConError: () => true, fechasCambiaron: true })
    expect(e.involucrados).toBe("Revise los otros involucrados marcados.")
    expect(e.motivo).toBe("El motivo de la corrección es obligatorio.")
  })

  it("en Tipo II/III exige los datos del SIUCE", () => {
    const e = validarCaso(valido(), { ...ctx, grave: true })
    expect(Object.keys(e).sort()).toEqual(["agresion", "repetitiva", "tiposDano"])
  })
})

describe("fechasDe", () => {
  it("ignora la fecha y la hora cuando no se conocen", () => {
    const a = valido({ fechaConocida: false, fechaHechos: "2026-01-01" })
    const b = valido({ fechaConocida: false, fechaHechos: "" })
    expect(fechasDe(a)).toBe(fechasDe(b))
  })
})

describe("body de crear y modificar", () => {
  it("crear manda todas las personas", () => {
    const input = crearCasoInput(valido({ fechaConocida: false }), false)
    expect(input).toMatchObject({ tipoId: 1, soporte: null, estudiantes: [{ fk_matricula: 7, fk_tlv_rol: 9 }], involucrados: [] })
    expect(input.datos).toMatchObject({ FECHA_HECHOS: null, HORA_HECHOS_CONOCIDA: null, SECUELAS_FISICAS: null })
  })

  it("modificar manda el diff de personas frente a lo guardado", () => {
    const v = desdeCaso(caso)
    v.estudiantes = [{ ...v.estudiantes[0], rol: "10" }, { fk_matricula: 99, nombre: "Nuevo", grado: "", rol: "9" }]
    v.involucrados = [{ key: "n", tipo: "4", nombre: " Eva ", tipoDoc: "", numDoc: "x", rol: "9", fk_funcionario: null }]
    v.motivo = " corrección de fecha "
    const input = actualizarCasoInput(caso, v, false, true)
    expect(input.estudiantesNuevos).toEqual([{ fk_matricula: 99, fk_tlv_rol: 9 }])
    expect(input.estudiantesQuitados).toEqual([2])
    expect(input.rolesCambiados).toEqual([{ id: 1, fk_tlv_rol: 10 }])
    expect(input.involucradosNuevos).toEqual([
      { fk_tlv_tipo_involucrado: 4, fk_funcionario: null, nombre: "Eva", fk_tlv_tipo_documento: null, numero_documento: null, fk_tlv_rol: 9 },
    ])
    expect(input.involucradosQuitados).toEqual([5])
    expect(input.motivoCorreccion).toBe("corrección de fecha")
  })
})
