import { describe, expect, it } from "vitest"

import {
  asistentesVigentes,
  casoVacio,
  desdeSesion,
  filaDeCargoVacio,
  filaIntegranteVacia,
  hayQuorum,
  integrantesVigentesEn,
  integranteInput,
  invitadoVacio,
  periodoPorDefecto,
  quorumMinimo,
  sesionInput,
  soloSeguimiento,
  validarFilaIntegrante,
  validarSesion,
  vigenteEn,
  valoresSesionVacios,
  type ValoresSesion,
} from "@/features/gestion-estudiantil/convivencia/utils/comite"

const integ = (id: number, desde: string, hasta: string | null) => ({ id, desde, hasta })

describe("vigencia", () => {
  it("desde <= fecha y hasta vacío o posterior", () => {
    expect(vigenteEn({ desde: "2026-02-01", hasta: null } as never, "2026-02-01")).toBe(true)
    expect(vigenteEn({ desde: "2026-02-02", hasta: null } as never, "2026-02-01")).toBe(false)
    expect(vigenteEn({ desde: "2026-02-01", hasta: "2026-06-01" } as never, "2026-05-31")).toBe(true)
    expect(vigenteEn({ desde: "2026-02-01", hasta: "2026-06-01" } as never, "2026-06-01")).toBe(false)
  })
  it("sin fecha nadie es vigente", () => {
    expect(vigenteEn({ desde: "2026-02-01", hasta: null } as never, "")).toBe(false)
  })
  it("filtra y descarta asistentes que dejaron de ser vigentes", () => {
    const todos = [integ(1, "2026-01-01", null), integ(2, "2026-01-01", "2026-03-01"), integ(3, "2026-04-01", null)]
    const vig = integrantesVigentesEn(todos, "2026-03-15")
    expect(vig.map((i) => i.id)).toEqual([1])
    expect(asistentesVigentes([1, 2, 3], vig)).toEqual([1])
  })
})

describe("quórum", () => {
  it("floor(M/2)+1", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(quorumMinimo)).toEqual([1, 2, 2, 3, 3, 4, 4])
  })
  it("con quórum desde la mayoría simple", () => {
    expect(hayQuorum(3, 5)).toBe(true)
    expect(hayQuorum(2, 5)).toBe(false)
    expect(hayQuorum(2, 4)).toBe(false)
    expect(hayQuorum(3, 4)).toBe(true)
  })
  it("sin integrantes vigentes no hay quórum", () => {
    expect(hayQuorum(0, 0)).toBe(false)
  })
})

describe("período por defecto", () => {
  it("el abierto; si no hay, el primero", () => {
    const a = { fk_periodo: 1, abierto: false } as never
    const b = { fk_periodo: 2, abierto: true } as never
    expect(periodoPorDefecto([a, b])).toBe(b)
    expect(periodoPorDefecto([a])).toBe(a)
    expect(periodoPorDefecto([])).toBeUndefined()
  })
})

describe("integrantes", () => {
  const cargo = { fk_tlv_cargo: 7, cargo_codigo: "RECTOR", cargo_nombre: "Rector", dato: "FUNCIONARIO" as const }

  it("la fila de un cargo vacío trae cargo y dato", () => {
    const f = filaDeCargoVacio(cargo, "2026-01-20")
    expect(f).toMatchObject({ fk_tlv_cargo: "7", dato: "FUNCIONARIO", desde: "2026-01-20", hasta: "" })
  })
  it("exige persona según el dato del cargo", () => {
    const f = filaDeCargoVacio(cargo, "2026-01-20")
    expect(validarFilaIntegrante(f, "2026-01-20").persona).toBeTruthy()
    expect(validarFilaIntegrante({ ...f, fk_funcionario: 5 }, "2026-01-20")).toEqual({})
    const n = { ...f, dato: "NOMBRE" as const, nombre: "ab" }
    expect(validarFilaIntegrante(n, "2026-01-20").persona).toBeTruthy()
    expect(validarFilaIntegrante({ ...n, nombre: "Ana Paz" }, "2026-01-20")).toEqual({})
  })
  it("desde no anterior al inicio del período y hasta posterior a desde", () => {
    const f = { ...filaDeCargoVacio(cargo, "2026-01-10"), fk_funcionario: 5 }
    expect(validarFilaIntegrante(f, "2026-01-20").desde).toBeTruthy()
    expect(validarFilaIntegrante({ ...f, desde: "2026-02-01", hasta: "2026-02-01" }, "2026-01-20").hasta).toBeTruthy()
  })
  it("exige el cargo y la persona en una fila vacía", () => {
    const e = validarFilaIntegrante(filaIntegranteVacia("2026-01-20"), "2026-01-20")
    expect(e.cargo).toBeTruthy()
    expect(e.persona).toBeUndefined()
  })
  it("el input lleva solo el dato que aplica", () => {
    const f = { ...filaDeCargoVacio(cargo, "2026-01-20"), fk_funcionario: 5, nombre: "x", fk_matricula: 9 }
    expect(integranteInput(f)).toEqual({ fk_tlv_cargo: 7, fk_funcionario: 5, desde: "2026-01-20" })
  })
})

describe("sesión", () => {
  const base = (): ValoresSesion => ({
    ...valoresSesionVacios(),
    tipo: "3",
    fecha: "2026-03-10",
    otros: "Revisión de ruta de atención",
  })

  it("válida con solo otros temas", () => {
    const e = validarSesion(base())
    expect(e.contenido).toBeUndefined()
    expect(e.invitados).toEqual({})
  })
  it("exige tipo, fecha y al menos un caso u otros temas", () => {
    const e = validarSesion({ ...valoresSesionVacios(), fecha: "" })
    expect(e.tipo).toBeTruthy()
    expect(e.fecha).toBeTruthy()
    expect(e.contenido).toBeTruthy()
  })
  it("límites del invitado", () => {
    const i = { ...invitadoVacio(), nombre: "Ab", calidad: "Padre de familia" }
    const e = validarSesion({ ...base(), invitados: [i] })
    expect(e.invitados[i.key].nombre).toBeTruthy()
    expect(e.invitados[i.key].calidad).toBeUndefined()
  })
  it("decisión de 10 a 3000 y caso elegido una sola vez", () => {
    const a = { ...casoVacio(), fk_caso: 1, decision: "corta" }
    const b = { ...casoVacio(), fk_caso: 1, decision: "Se cita al acudiente" }
    const e = validarSesion({ ...base(), casos: [a, b] })
    expect(e.casos[a.key].decision).toBeTruthy()
    expect(e.casos[b.key].caso).toBeTruthy()
  })
  it("fecha de seguimiento obligatoria con responsable y posterior a la sesión", () => {
    const c = { ...casoVacio(), fk_caso: 1, decision: "Se cita al acudiente", responsable: "4" }
    expect(validarSesion({ ...base(), casos: [c] }).casos[c.key].fecha).toBeTruthy()
    expect(validarSesion({ ...base(), casos: [{ ...c, fecha_seguimiento: "2026-03-10" }] }).casos[c.key].fecha).toBeTruthy()
    expect(validarSesion({ ...base(), casos: [{ ...c, fecha_seguimiento: "2026-03-11" }] }).casos).toEqual({})
  })
  it("solo Tipo II y III limitan el responsable a roles de seguimiento", () => {
    expect(soloSeguimiento("TIPO_I")).toBe(false)
    expect(soloSeguimiento("TIPO_II")).toBe(true)
    expect(soloSeguimiento("TIPO_III")).toBe(true)
    expect(soloSeguimiento("")).toBe(false)
  })
  it("el input omite lo opcional vacío y manda el seguimiento solo con responsable", () => {
    const c = { ...casoVacio(), fk_caso: 8, decision: " Se cita al acudiente ", fecha_seguimiento: "2026-04-01" }
    const input = sesionInput({ ...base(), asistentes: [1, 2], casos: [c], otros: "" })
    expect(input).toEqual({
      FK_TLV_TIPO: 3,
      FECHA: "2026-03-10",
      ASISTENTES: [1, 2],
      INVITADOS: [],
      CASOS: [{ fk_caso: 8, decision: "Se cita al acudiente" }],
    })
  })
  it("precarga solo a quienes asistieron", () => {
    const v = desdeSesion({
      fk_tlv_tipo: 3,
      fecha: "2026-03-10T00:00:00",
      otros_temas: null,
      asistentes: [
        { fk_integrante: 1, asistio: true },
        { fk_integrante: 2, asistio: false },
      ],
      invitados: [{ nombre: "Ana", calidad: "Personera" }],
      casos: [{ fk_caso: 5, numero: 12, decision: "x", tipo_codigo: "TIPO_III", tipo_nombre: "Tipo III", fk_funcionario_responsable: 4, fecha_seguimiento: "2026-04-01" }],
    } as never)
    expect(v).toMatchObject({ tipo: "3", fecha: "2026-03-10", asistentes: [1] })
    expect(v.casos[0]).toMatchObject({ fk_caso: 5, tipo_codigo: "TIPO_III", responsable: "4", fecha_seguimiento: "2026-04-01" })
  })
})
