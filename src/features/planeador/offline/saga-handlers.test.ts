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

  it("el 409 de CAS por versión (OFFLINE_CONFLICT) es conflicto con la versión actual del servidor", () => {
    const mensaje = "La actividad cambió en el servidor mientras estabas sin conexión."
    const clasificado = classifyPlaneadorStep(
      errorHttp(409, {
        code: "OFFLINE_CONFLICT",
        message: mensaje,
        detail: JSON.stringify({ current: { titulo: "Fracciones" }, version: 7 }),
      }),
    )
    expect(clasificado?.kind).toBe("conflict")
    expect(clasificado?.error).toMatchObject({ code: PLANEADOR_ERROR_CODES.conflicto, status: 409, message: mensaje })
    expect(clasificado?.kind === "conflict" && clasificado.conflict).toMatchObject({
      serverVersion: "7",
      server: { titulo: "Fracciones" },
    })
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

describe("concurrencia por VERSION (BE-3B)", () => {
  const vista: Actividad = { ...crearActividadVacia(), id: 42, nombre: "Decimales", version: 3 }
  const payload = (check: object) => ({
    actividadId: 42,
    data: { ...vista, nombre: "Decimales (sin red)" },
    check,
    saga: { id: "s2", target: "actividad:42", titulo: "Editar", label: "Datos de la actividad", step: 0, total: 1 },
  })

  beforeEach(() => {
    mocks.fetchActividadDetalle.mockReset()
    mocks.updateActividad.mockReset()
  })

  it("misma versión: escribe y manda BASE_VERSION", async () => {
    mocks.fetchActividadDetalle.mockResolvedValue(vista)
    mocks.updateActividad.mockResolvedValue({})
    await getOutboxHandler(SAGA_KINDS.actividadEditar)!.send(payload({ baseVersion: 3 }) as never, ctx(true))
    expect(mocks.updateActividad.mock.calls[0][0]).toMatchObject({ actividadId: 42, baseVersion: 3 })
  })

  it("versión distinta al sincronizar: conflicto con la versión del servidor, sin escribir", async () => {
    mocks.fetchActividadDetalle.mockResolvedValue({ ...vista, version: 5 })
    const error = await getOutboxHandler(SAGA_KINDS.actividadEditar)!
      .send(payload({ baseVersion: 3 }) as never, ctx(true))
      .catch((e: unknown) => e)
    const clasificado = classifyPlaneadorStep(error)
    expect(clasificado?.kind).toBe("conflict")
    expect(clasificado?.kind === "conflict" && clasificado.conflict?.serverVersion).toBe("5")
    expect(mocks.updateActividad).not.toHaveBeenCalled()
  })

  it("online (sin verificación previa) igual manda BASE_VERSION", async () => {
    mocks.updateActividad.mockResolvedValue({})
    await getOutboxHandler(SAGA_KINDS.actividadEditar)!.send(payload({ baseVersion: 3 }) as never, ctx(false))
    expect(mocks.fetchActividadDetalle).not.toHaveBeenCalled()
    expect(mocks.updateActividad.mock.calls[0][0]).toMatchObject({ baseVersion: 3 })
  })

  it("sin check (no es el primer paso) no manda BASE_VERSION", async () => {
    mocks.updateActividad.mockResolvedValue({})
    await getOutboxHandler(SAGA_KINDS.actividadEditar)!.send(payload(undefined as never) as never, ctx(true))
    expect(mocks.updateActividad.mock.calls[0][0]).toMatchObject({ baseVersion: null })
  })

  it("Conservar mis cambios: el check pasa a la versión actual", () => {
    const handler = getOutboxHandler(SAGA_KINDS.actividadEditar)!
    const rebased = handler.rebase!(payload({ baseVersion: 3 }) as never, { server: null, serverVersion: "5" })
    expect((rebased as { check: unknown }).check).toEqual({ baseVersion: 5 })
  })

  it("una op encolada antes del cambio (huella) se sigue verificando por huella", async () => {
    const sinVersion: Actividad = { ...vista, version: null }
    mocks.fetchActividadDetalle.mockResolvedValue(sinVersion)
    mocks.updateActividad.mockResolvedValue({})
    await getOutboxHandler(SAGA_KINDS.actividadEditar)!.send(
      payload({ baseFingerprint: fingerprintActividad(sinVersion) }) as never,
      ctx(true),
    )
    expect(mocks.updateActividad.mock.calls[0][0]).toMatchObject({ baseVersion: null })
  })
})
