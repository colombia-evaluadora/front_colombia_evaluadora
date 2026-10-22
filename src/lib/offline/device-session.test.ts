import "fake-indexeddb/auto"

import { beforeEach, describe, expect, it, vi } from "vitest"

// Orden de la sesión en un equipo registrado: primero el token del equipo
// (access token con `did`), la cookie solo de respaldo; y qué pasa con la
// credencial según el servidor.

const mocks = vi.hoisted(() => ({
  deviceRefresh: vi.fn(),
  readDeviceToken: vi.fn(),
  hasDeviceToken: vi.fn(),
  getDeviceId: vi.fn(),
  fetchDeviceStatus: vi.fn(),
  registerDevice: vi.fn(),
  deleteDeviceToken: vi.fn(),
  locked: vi.fn(),
  mode: "personal" as "personal" | "compartido",
  offlineMode: "full",
}))
vi.mock("@/lib/offline/device-token", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  deviceRefresh: mocks.deviceRefresh,
  readDeviceToken: mocks.readDeviceToken,
  hasDeviceToken: mocks.hasDeviceToken,
  getDeviceId: mocks.getDeviceId,
  fetchDeviceStatus: mocks.fetchDeviceStatus,
  registerDevice: mocks.registerDevice,
  deleteDeviceToken: mocks.deleteDeviceToken,
}))
vi.mock("@/lib/offline/local-credential", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  isDeviceSessionLocked: mocks.locked,
}))
vi.mock("@/lib/offline/query-persister", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDeviceMode: () => mocks.mode,
  getLastUserSub: async () => "docente@x",
}))
vi.mock("@/lib/offline/offline-mode", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getOfflineMode: () => mocks.offlineMode,
}))

const session = await import("@/lib/offline/device-session")
const { deviceRevocationStore, clearRemoteWipeRequest } = await import("@/lib/offline/device-revocation")
const { getAuthToken, setAuthToken } = await import("@/lib/api-client")

const { deleteMeta } = await import("@/lib/offline/db")

const jwt = (payload: object) => `x.${btoa(JSON.stringify(payload))}.y`

beforeEach(async () => {
  await deleteMeta("device:optout:docente@x")
  for (const fn of Object.values(mocks)) if (typeof fn === "function") fn.mockReset()
  mocks.mode = "personal"
  mocks.offlineMode = "full"
  mocks.locked.mockResolvedValue(false)
  mocks.deleteDeviceToken.mockResolvedValue(undefined)
  clearRemoteWipeRequest()
  setAuthToken(null)
})

describe("tryDeviceSession", () => {
  it("devuelve el access token del equipo", async () => {
    mocks.deviceRefresh.mockResolvedValue({ kind: "ok", accessToken: "acc-did" })
    expect(await session.tryDeviceSession()).toBe("acc-did")
  })

  it("equipo compartido o modo offline apagado: ni lo intenta (va la cookie)", async () => {
    mocks.mode = "compartido"
    expect(await session.tryDeviceSession()).toBeNull()
    mocks.mode = "personal"
    mocks.offlineMode = "off"
    expect(await session.tryDeviceSession()).toBeNull()
    expect(mocks.deviceRefresh).not.toHaveBeenCalled()
  })

  it("app bloqueada tras 'Cerrar sesión': el token del equipo no la reabre", async () => {
    mocks.locked.mockResolvedValue(true)
    expect(await session.tryDeviceSession()).toBeNull()
    expect(mocks.deviceRefresh).not.toHaveBeenCalled()
  })

  it("revocado con borrado: pide el borrado remoto y deja seguir con la cookie", async () => {
    mocks.deviceRefresh.mockResolvedValue({ kind: "revoked", wipe: true })
    expect(await session.tryDeviceSession()).toBeNull()
    expect(deviceRevocationStore.get()?.sub).toBe("docente@x")
  })

  it("revocado sin borrado: olvida el token", async () => {
    mocks.deviceRefresh.mockResolvedValue({ kind: "revoked", wipe: false })
    expect(await session.tryDeviceSession()).toBeNull()
    expect(mocks.deleteDeviceToken).toHaveBeenCalledWith("docente@x")
    expect(deviceRevocationStore.get()).toBeNull()
  })

  it("sin red: el error se propaga (no se confunde con 'sin sesión')", async () => {
    mocks.deviceRefresh.mockRejectedValue(new Error("Network Error"))
    await expect(session.tryDeviceSession()).rejects.toThrow()
  })
})

describe("ensureDeviceAccessToken (antes de cada sincronización)", () => {
  it("un token de contraseña (sin did) se cambia por uno del equipo", async () => {
    setAuthToken(jwt({ sub: "docente@x" }))
    mocks.readDeviceToken.mockResolvedValue({ deviceId: "d", token: "t", expiresAt: null })
    mocks.deviceRefresh.mockResolvedValue({ kind: "ok", accessToken: jwt({ sub: "docente@x", did: "d" }) })
    expect(await session.ensureDeviceAccessToken("docente@x")).toBe(true)
    expect(getAuthToken()).toContain(".")
    expect(mocks.deviceRefresh).toHaveBeenCalledTimes(1)
  })

  it("con un token del equipo vigente no canjea, pero mira la revocación al sincronizar", async () => {
    setAuthToken(jwt({ sub: "docente@x", did: "d" }))
    mocks.getDeviceId.mockResolvedValue("d")
    mocks.fetchDeviceStatus.mockResolvedValue({ status: "REVOKED", wipe: true, revokedAt: "r", revokeReason: "USUARIO", expiresAt: null })
    expect(await session.ensureDeviceAccessToken("docente@x")).toBe(true)
    expect(mocks.deviceRefresh).not.toHaveBeenCalled()
    expect(deviceRevocationStore.get()?.sub).toBe("docente@x")
  })

  it("sin token del equipo sigue el camino de siempre", async () => {
    mocks.readDeviceToken.mockResolvedValue(null)
    expect(await session.ensureDeviceAccessToken("docente@x")).toBe(false)
  })
})

describe("reconcileDevice", () => {
  it("equipo personal sin credencial: lo registra", async () => {
    mocks.getDeviceId.mockResolvedValue(undefined)
    mocks.hasDeviceToken.mockResolvedValue(false)
    await session.reconcileDevice("docente@x")
    expect(mocks.registerDevice).toHaveBeenCalledWith("docente@x")
  })

  it("REVOKED con borrado: borrado remoto, sin registrar", async () => {
    mocks.getDeviceId.mockResolvedValue("d")
    mocks.hasDeviceToken.mockResolvedValue(true)
    mocks.fetchDeviceStatus.mockResolvedValue({ status: "REVOKED", wipe: true, revokedAt: "2026-10-01", revokeReason: "ADMIN", expiresAt: null })
    await session.reconcileDevice("docente@x")
    expect(deviceRevocationStore.get()).toEqual({ sub: "docente@x", revokedAt: "2026-10-01" })
    expect(mocks.registerDevice).not.toHaveBeenCalled()
  })

  it("UNKNOWN o EXPIRED con sesión: lo vuelve a registrar", async () => {
    mocks.getDeviceId.mockResolvedValue("d")
    mocks.hasDeviceToken.mockResolvedValue(true)
    mocks.fetchDeviceStatus.mockResolvedValue({ status: "EXPIRED", wipe: false, revokedAt: null, revokeReason: null, expiresAt: null })
    await session.reconcileDevice("docente@x")
    expect(mocks.deleteDeviceToken).toHaveBeenCalled()
    expect(mocks.registerDevice).toHaveBeenCalledWith("docente@x")
  })

  it("revocado sin borrado por su dueño: no se vuelve a registrar solo", async () => {
    mocks.getDeviceId.mockResolvedValue("d")
    mocks.hasDeviceToken.mockResolvedValueOnce(true).mockResolvedValue(false)
    mocks.fetchDeviceStatus.mockResolvedValue({ status: "REVOKED", wipe: false, revokedAt: "x", revokeReason: "USUARIO", expiresAt: null })
    await session.reconcileDevice("docente@x")
    await session.reconcileDevice("docente@x")
    expect(mocks.registerDevice).not.toHaveBeenCalled()
  })
})
