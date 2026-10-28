import { describe, expect, it } from "vitest"

import type { OutboxOp } from "@/lib/offline/outbox/types"
import {
  MENSAJE_ACTIVIDAD_CON_RESULTADOS_NO_ELIMINABLE,
  MENSAJE_ACTIVIDAD_NO_EDITABLE,
  motivoNoEliminable,
  tieneResultadosDeFila,
  motivoNoEditable,
  motivoNoEditableDeFila,
  resultadosSinSincronizar,
} from "@/features/planeador/lib/actividad-editable"

describe("motivoNoEditable (Regla 37)", () => {
  it("el motivo del backend manda", () => {
    expect(
      motivoNoEditable({ motivoNoEditable: "No puedes editar esta actividad porque es la base de una recuperación.", evaluados: 0 }),
    ).toBe("No puedes editar esta actividad porque es la base de una recuperación.")
  })

  it("sin motivo, una fila con evaluados igual queda bloqueada", () => {
    expect(motivoNoEditable({ motivoNoEditable: undefined, evaluados: 3 })).toBe(MENSAJE_ACTIVIDAD_NO_EDITABLE)
  })

  it("sin resultados se puede editar", () => {
    expect(motivoNoEditable({ motivoNoEditable: undefined, evaluados: 0 })).toBeUndefined()
    expect(motivoNoEditable(undefined)).toBeUndefined()
  })
})

describe("motivoNoEditableDeFila", () => {
  it("lee motivo_no_editable de la fila del backend", () => {
    expect(motivoNoEditableDeFila({ editable: "N", motivo_no_editable: "  Ya tiene calificaciones.  " })).toBe(
      "Ya tiene calificaciones.",
    )
  })

  it("editable = N sin motivo cae al mensaje por defecto", () => {
    expect(motivoNoEditableDeFila({ editable: "N", motivo_no_editable: null })).toBe(MENSAJE_ACTIVIDAD_NO_EDITABLE)
  })

  it("editable = S o una respuesta vieja sin columnas: editable", () => {
    expect(motivoNoEditableDeFila({ editable: "S", motivo_no_editable: null })).toBeUndefined()
    expect(motivoNoEditableDeFila({})).toBeUndefined()
  })
})

function op(kind: string, payload: unknown, status: OutboxOp["status"] = "pending"): OutboxOp {
  return {
    id: crypto.randomUUID(),
    seq: 1,
    userSub: "docente@example.com",
    kind,
    handlerVersion: 1,
    entityKey: "k",
    dependsOn: [],
    payload,
    blobRefs: [],
    idempotencyKey: "i",
    status,
    attempts: 0,
    nextAttemptAt: 0,
    lastError: null,
    conflict: null,
    resultNote: null,
    createdAt: 0,
    updatedAt: 0,
    appBuild: "test",
  } as OutboxOp
}

describe("resultadosSinSincronizar", () => {
  it("cuenta calificaciones, observaciones y No presentó de ESA actividad que siguen en la outbox", () => {
    const ops = [
      op("planilla.calificar", { actividadId: 7, pkTactividadEstudiante: 1 }),
      op("planilla.calificar-bulk", { actividadId: 7 }, "retry"),
      op("planilla.observacion", { actividadId: 7 }, "inflight"),
      op("planilla.estado-resultado", { actividadId: 7, estado: "NO_PRESENTO" }, "blocked"),
    ]
    expect(resultadosSinSincronizar(ops, 7)).toBe(4)
  })

  it("no cuenta lo ya enviado, lo rechazado, otra actividad, otros tipos ni quitar el No presentó", () => {
    const ops = [
      op("planilla.calificar", { actividadId: 7 }, "done"),
      op("planilla.calificar", { actividadId: 7 }, "rejected"),
      op("planilla.calificar", { actividadId: 8 }),
      op("planilla.calificar", { pkTactividadEstudiante: 1 }),
      op("planeador.actividad.editar", { actividadId: 7 }),
      op("planilla.soporte", { actividadId: 7 }),
      op("planilla.estado-resultado", { actividadId: 7, estado: "PENDIENTE" }),
    ]
    expect(resultadosSinSincronizar(ops, 7)).toBe(0)
  })
})

describe("motivoNoEliminable (Reglas 38/39)", () => {
  it("con resultados devuelve el texto de conservación de datos", () => {
    expect(motivoNoEliminable({ tieneResultados: true, evaluados: 0 })).toBe(
      "No se puede eliminar una actividad con resultados registrados por normativa de conservación de datos",
    )
  })

  it("el backend manda sobre evaluados", () => {
    expect(motivoNoEliminable({ tieneResultados: false, evaluados: 4 })).toBeUndefined()
  })

  it("sin la columna se infiere de evaluados", () => {
    expect(motivoNoEliminable({ tieneResultados: undefined, evaluados: 2 })).toBe(
      MENSAJE_ACTIVIDAD_CON_RESULTADOS_NO_ELIMINABLE,
    )
    expect(motivoNoEliminable({ tieneResultados: undefined, evaluados: 0 })).toBeUndefined()
  })

  it("tieneResultadosDeFila lee S/N y deja undefined si no viene", () => {
    expect(tieneResultadosDeFila({ tiene_resultados: "S" })).toBe(true)
    expect(tieneResultadosDeFila({ tiene_resultados: "N" })).toBe(false)
    expect(tieneResultadosDeFila({})).toBeUndefined()
  })
})
