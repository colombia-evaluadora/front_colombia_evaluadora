import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { SendCtx } from "@/lib/offline/outbox/types"

// Regla 37 en la saga de edición (Fase 3 offline): la edición encolada
// verifica el bloqueo contra el detalle del servidor ANTES de escribir, y el
// 409 del backend se clasifica como rechazo con su motivo.

const mocks = vi.hoisted(() => ({
  fetchActividadDetalle: vi.fn(),
  updateActividad: vi.fn(),
}))
vi.mock("@/features/planeador/api/query/use-actividad-detalle-query", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchActividadDetalle: mocks.fetchActividadDetalle,
}))
vi.mock("@/features/planeador/api/mutations/update-actividad", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  updateActividad: mocks.updateActividad,
}))

const { classifyPlaneadorStep, PLANEADOR_ERROR_CODES, SAGA_KINDS } = await import(
  "@/features/planeador/offline/saga-handlers"
)
const { getOutboxHandler } = await import("@/lib/offline/outbox/registry")
const { crearActividadVacia } = await import("@/features/planeador/lib/empty-actividad")
const { fingerprintActividad } = await import("@/features/planeador/offline/fingerprint")

const MOTIVO = 'No puedes editar esta actividad porque ya tiene calificaciones, observaciones o "No presentó" registrados.'

function errorHttp(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
    status,
    statusText: "",
    data,
    headers: {},
    config,
  })
}

describe("classifyPlaneadorStep — Regla 37", () => {
  it("el 409 de la regla 37 (23503 → FK_NOT_FOUND) es un rechazo con el motivo del backend", () => {
    const clasificado = classifyPlaneadorStep(errorHttp(409, { status: 409, code: "FK_NOT_FOUND", message: MOTIVO }))
    expect(clasificado).toEqual({
      kind: "rejected",
      error: { code: PLANEADOR_ERROR_CODES.noEditable, status: 409, message: MOTIVO },
    })
  })

  it("también la actividad base de una recuperación", () => {
    const motivo = "No puedes editar esta actividad porque es la base de una recuperación."
    const clasificado = classifyPlaneadorStep(errorHttp(409, { code: "FK_NOT_FOUND", message: motivo }))
    expect(clasificado?.kind).toBe("rejected")
    expect(clasificado?.error.code).toBe(PLANEADOR_ERROR_CODES.noEditable)
  })

  it("el 409 de CAS (OFFLINE_CONFLICT) sigue siendo conflicto (clasificación por defecto)", () => {
    expect(classifyPlaneadorStep(errorHttp(409, { code: "OFFLINE_CONFLICT", message: MOTIVO }))).toBeNull()
  })

  it("otro 409 sigue la clasificación por defecto", () => {
    expect(classifyPlaneadorStep(errorHttp(409, { code: "DUPLICATE", message: "Ya existe una actividad igual" }))).toBeNull()
  })
})

function ctx(background: boolean): SendCtx {
  return {
    idempotencyKey: "saga:test:0",
    background,
    resolveFile: () => Promise.reject(new Error("sin archivos")),
    getFile: () => Promise.reject(new Error("sin archivos")),
  }
}

describe("paso 'Datos de la actividad' de una edición encolada", () => {
  const vista: Actividad = { ...crearActividadVacia(), id: 41, nombre: "Fracciones" }
  const payload = {
    actividadId: 41,
    data: { ...vista, nombre: "Fracciones (editada sin red)" },
    check: { baseFingerprint: fingerprintActividad(vista) },
    saga: { id: "s1", target: "actividad:41", titulo: "Editar", label: "Datos de la actividad", step: 0, total: 1 },
  }

  beforeEach(() => {
    mocks.fetchActividadDetalle.mockReset()
    mocks.updateActividad.mockReset()
  })

  it("si al sincronizar ya tiene calificaciones, se rechaza con el motivo y no se escribe nada", async () => {
    mocks.fetchActividadDetalle.mockResolvedValue({ ...vista, motivoNoEditable: MOTIVO })
    const handler = getOutboxHandler(SAGA_KINDS.actividadEditar)!
    const error = await handler.send(payload as never, ctx(true)).catch((e: unknown) => e)
    expect(classifyPlaneadorStep(error)).toEqual({
      kind: "rejected",
      error: { code: PLANEADOR_ERROR_CODES.noEditable, message: MOTIVO },
    })
    expect(mocks.updateActividad).not.toHaveBeenCalled()
  })

  it("sin calificaciones y sin cambios en el servidor, escribe", async () => {
    mocks.fetchActividadDetalle.mockResolvedValue(vista)
    mocks.updateActividad.mockResolvedValue({ status: "ok" })
    const handler = getOutboxHandler(SAGA_KINDS.actividadEditar)!
    await handler.send(payload as never, ctx(true))
    expect(mocks.updateActividad).toHaveBeenCalledTimes(1)
  })
})
