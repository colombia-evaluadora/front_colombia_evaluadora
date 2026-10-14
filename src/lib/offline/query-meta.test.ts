import { describe, expect, it } from "vitest"

import { estudiantesMeta, minimizeStudentData, TTL_OFFLINE, offlineMeta } from "@/lib/offline/query-meta"

describe("minimizeStudentData", () => {
  it("conserva pk, nombre y campos de la pantalla y quita documento y contacto", () => {
    const roster = [
      {
        fk_tmatricula: 10,
        fk_testudiante: 20,
        estudiante: "Ana Pérez",
        documento: "1012345678",
        tipo_documento: "TI",
        telefono_acudiente: "3001234567",
        correo: "ana@example.com",
        direccion: "Calle 1",
        tipo_asistencia: "ASISTIO",
        pk_tasistencia: null,
      },
    ]
    expect(minimizeStudentData(roster)).toEqual([
      { fk_tmatricula: 10, fk_testudiante: 20, estudiante: "Ana Pérez", tipo_asistencia: "ASISTIO", pk_tasistencia: null },
    ])
  })

  it("recorre objetos anidados sin mutar la entrada", () => {
    const data = { rows: [{ pk: 1, nombre: "Luis", acudiente: { nombre: "X" }, numeroDocumento: "9" }], totalCount: 1 }
    const copy = structuredClone(data)
    expect(minimizeStudentData(data)).toEqual({ rows: [{ pk: 1, nombre: "Luis" }], totalCount: 1 })
    expect(data).toEqual(copy)
  })

  it("no confunde `eps` con claves que lo contienen", () => {
    expect(minimizeStudentData({ steps: 2, eps: "Sura", fk_eps: 3 })).toEqual({ steps: 2 })
  })
})

describe("offlineMeta", () => {
  it("arma el contrato meta.offline", () => {
    expect(offlineMeta(TTL_OFFLINE.grupo)).toEqual({ offline: { ttl: TTL_OFFLINE.grupo } })
  })

  it("estudiantesMeta usa persistSelect minimizador", () => {
    const meta = estudiantesMeta()
    expect(meta.offline?.ttl).toBe(7 * 24 * 60 * 60 * 1000)
    expect(meta.persistSelect?.([{ pk: 1, documento: "x" }])).toEqual([{ pk: 1 }])
  })
})
