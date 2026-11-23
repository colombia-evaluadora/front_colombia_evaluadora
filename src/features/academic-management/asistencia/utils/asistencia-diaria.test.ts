import { describe, expect, it } from "vitest"

import {
  etiquetaGrupo,
  opcionesBloqueLlegada,
  toEntradaDiaria,
  totalesPorDia,
} from "@/features/academic-management/asistencia/utils/asistencia-diaria"

const dia = (over: Record<string, unknown>) => ({
  fecha: "2027-03-02",
  dia_registrado: true,
  fk_tmatricula: 1,
  estudiante: "Ana",
  documento: "1",
  tipo_valor: 1,
  justificada: false,
  en_grupo: true,
  bloque_llegada: null,
  ...over,
})

describe("opcionesBloqueLlegada", () => {
  it("ordena y muestra «n · asignatura» con el bloque 1-based", () => {
    const opciones = opcionesBloqueLlegada([
      { bloque: 2, fk_tasignatura: 8, asignatura: "Lenguaje", hora_inicio: null, hora_fin: null, primer_bloque_clase: true },
      { bloque: 1, fk_tasignatura: 7, asignatura: "Aritmética", hora_inicio: null, hora_fin: null, primer_bloque_clase: true },
    ])
    expect(opciones).toEqual([
      { value: 1, label: "2 · Aritmética" },
      { value: 2, label: "3 · Lenguaje" },
    ])
  })

  it("sin horario no hay opciones", () => {
    expect(opcionesBloqueLlegada([])).toEqual([])
  })
})

describe("totalesPorDia", () => {
  it("cuenta cada día una vez y excluye sin marca o fuera del grupo", () => {
    const t = totalesPorDia([
      dia({ fecha: "2027-03-01", tipo_valor: 1 }),
      dia({ fecha: "2027-03-02", tipo_valor: 2, justificada: true }),
      dia({ fecha: "2027-03-03", tipo_valor: 5, bloque_llegada: 1 }),
      dia({ fecha: "2027-03-04", tipo_valor: 2 }),
      dia({ fecha: "2027-03-05", tipo_valor: null, dia_registrado: false }),
      dia({ fecha: "2027-03-08", tipo_valor: 1, en_grupo: false }),
    ] as never)
    expect(t.get(1)).toEqual({ fallas: 2, justificadas: 1, retrasos: 1, porcentaje: 50 })
  })

  it("sin días registrados no hay porcentaje", () => {
    expect(totalesPorDia([dia({ tipo_valor: null })] as never).get(1)?.porcentaje).toBeNull()
  })
})

describe("toEntradaDiaria", () => {
  it("una pendiente vencida se pinta VENCIDA", () => {
    const e = toEntradaDiaria({
      fecha: "2027-03-02T00:00:00",
      fk_tgrupo: 9,
      grupo: "A",
      fk_tgrado: 6,
      grado: "6°",
      fk_tlv_jornada: 1,
      jornada: "Mañana",
      total_estudiantes: 30,
      registrados: 0,
      estado_sesion: "PENDIENTE",
      vencida: true,
    })
    expect(e).toMatchObject({ fecha: "2027-03-02", estado: "VENCIDA", fkGrupo: 9 })
  })
})

describe("etiquetaGrupo", () => {
  it("usa el código del grado como el resto del módulo", () => {
    expect(etiquetaGrupo({ grado: "Sexto", grado_valor: "6", grupo: "A" })).toBe("6°A")
  })

  it("sin código cae al nombre del grado", () => {
    expect(etiquetaGrupo({ grado: "Sexto", grado_valor: null, grupo: "02" })).toBe("Sexto 02")
  })
})
