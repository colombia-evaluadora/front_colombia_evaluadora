import "fake-indexeddb/auto"

import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Credencial del equipo (D-3/D-8): guardado cifrado, rotación en cada canje y
// qué hacer ante revocado / inválido.

const mocks = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { post: mocks.post, get: mocks.get },
}))

const { __closeDbForTests, DB_NAME, getMeta } = await import("@/lib/offline/db")
const { __resetVaultForTests, createVault, lockVault, loadVault } = await import("@/lib/offline/vault")
const deviceToken = await import("@/lib/offline/device-token")
const { actionForRefresh, actionForStatus } = await import("@/lib/offline/device-revocation")

const SUB = "docente@x"

function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, { status, statusText: "", data, headers: {}, config })
}

beforeEach(() => {
  mocks.post.mockReset()
  mocks.get.mockReset()
})

afterEach(async () => {
  __resetVaultForTests()
  await __closeDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
})

describe("guardado del token del equipo", () => {
  it("sin PIN queda cifrado con la clave local no extraíble (nunca en claro)", async () => {
    await deviceToken.saveDeviceToken(SUB, "dev-1", "secreto-del-equipo", null)
    const raw = await getMeta<{ mode: string; sealed: string }>(`device:token:${SUB}`)
    expect(raw?.mode).toBe("key")
    expect(JSON.stringify(raw)).not.toContain("secreto-del-equipo")
    const key = await getMeta<CryptoKey>(`device:key:${SUB}`)
    expect(key?.extractable).toBe(false)
    expect(await deviceToken.readDeviceToken(SUB)).toEqual({ deviceId: "dev-1", token: "secreto-del-equipo", expiresAt: null })
  })

  it("con PIN se sella con la bóveda y no se puede leer con la bóveda cerrada", async () => {
    await loadVault(SUB)
    await createVault(SUB, "123456")
    await deviceToken.saveDeviceToken(SUB, "dev-1", "secreto", null)
    const raw = await getMeta<{ mode: string; sealed: string }>(`device:token:${SUB}`)
    expect(raw?.mode).toBe("pin")
    expect(raw?.sealed.startsWith("enc1:")).toBe(true)
    lockVault()
    expect(await deviceToken.readDeviceToken(SUB)).toBeNull()
  })

  it("al crear el PIN se re-sella con la bóveda", async () => {
    await deviceToken.saveDeviceToken(SUB, "dev-1", "secreto", null)
    await loadVault(SUB)
    await createVault(SUB, "123456")
    await deviceToken.resealDeviceToken(SUB)
    expect((await getMeta<{ mode: string }>(`device:token:${SUB}`))?.mode).toBe("pin")
    expect((await deviceToken.readDeviceToken(SUB))?.token).toBe("secreto")
  })

  it("borrar con forgetId elimina token, clave e id", async () => {
    await deviceToken.getOrCreateDeviceId(SUB)
    await deviceToken.saveDeviceToken(SUB, "dev-1", "secreto", null)
    await deviceToken.deleteDeviceToken(SUB, { forgetId: true })
    expect(await deviceToken.hasDeviceToken(SUB)).toBe(false)
    expect(await getMeta(`device:key:${SUB}`)).toBeUndefined()
    expect(await deviceToken.getDeviceId(SUB)).toBeUndefined()
  })
})

describe("canje y rotación", () => {
  it("guarda el token rotado antes de devolver el access token", async () => {
    await deviceToken.saveDeviceToken(SUB, "dev-1", "t1", null)
    mocks.post.mockResolvedValue({ accessToken: "acc", deviceToken: "t2", expiresAt: "2027-01-01T00:00:00Z", expiresIn: 300 })
    const result = await deviceToken.deviceRefresh(SUB)
    expect(result).toEqual({ kind: "ok", accessToken: "acc" })
    expect(mocks.post).toHaveBeenCalledWith(
      "/auth/device/refresh",
      { deviceId: "dev-1", deviceToken: "t1" },
      expect.objectContaining({ background: true }),
    )
    expect((await deviceToken.readDeviceToken(SUB))?.token).toBe("t2")
  })

  it("dos canjes simultáneos comparten una sola request (no rotan dos veces)", async () => {
    await deviceToken.saveDeviceToken(SUB, "dev-1", "t1", null)
    mocks.post.mockResolvedValue({ accessToken: "acc", deviceToken: "t2", expiresAt: null, expiresIn: 300 })
    await Promise.all([deviceToken.deviceRefresh(SUB), deviceToken.deviceRefresh(SUB)])
    expect(mocks.post).toHaveBeenCalledTimes(1)
  })

  it("revocado con borrado: lo informa y conserva el token (lo necesita el ack)", async () => {
    await deviceToken.saveDeviceToken(SUB, "dev-1", "t1", null)
    mocks.post.mockRejectedValue(httpError(401, { error: "device_revoked", wipe: true }))
    const result = await deviceToken.deviceRefresh(SUB)
    expect(result).toEqual({ kind: "revoked", wipe: true })
    expect(actionForRefresh(result)).toBe("wipe")
    expect(await deviceToken.hasDeviceToken(SUB)).toBe(true)
  })

  it("token inválido o vencido: se borra y toca volver a registrar con contraseña", async () => {
    await deviceToken.saveDeviceToken(SUB, "dev-1", "t1", null)
    mocks.post.mockRejectedValue(httpError(401, { error: "device_expired" }))
    const result = await deviceToken.deviceRefresh(SUB)
    expect(actionForRefresh(result)).toBe("reregister")
    expect(await deviceToken.hasDeviceToken(SUB)).toBe(false)
  })

  it("un error de red se propaga y no toca el token", async () => {
    await deviceToken.saveDeviceToken(SUB, "dev-1", "t1", null)
    mocks.post.mockRejectedValue(new AxiosError("Network Error", "ERR_NETWORK"))
    await expect(deviceToken.deviceRefresh(SUB)).rejects.toBeTruthy()
    expect((await deviceToken.readDeviceToken(SUB))?.token).toBe("t1")
  })

  it("sin token guardado no llama al servidor", async () => {
    expect(await deviceToken.deviceRefresh(SUB)).toEqual({ kind: "none" })
    expect(mocks.post).not.toHaveBeenCalled()
  })
})

describe("decisión ante el estado del equipo", () => {
  const base = { revokedAt: null, revokeReason: null, expiresAt: null }
  it.each([
    [{ ...base, status: "ACTIVE" as const, wipe: false }, "none"],
    [{ ...base, status: "REVOKED" as const, wipe: true }, "wipe"],
    [{ ...base, status: "REVOKED" as const, wipe: false }, "drop-token"],
    [{ ...base, status: "EXPIRED" as const, wipe: false }, "reregister"],
    [{ ...base, status: "UNKNOWN" as const, wipe: false }, "reregister"],
  ])("%o → %s", (status, action) => {
    expect(actionForStatus(status)).toBe(action)
  })
})

describe("claim did", () => {
  const jwt = (payload: object) => `x.${btoa(JSON.stringify(payload))}.y`
  it("detecta un access token emitido por el canje del equipo", () => {
    expect(deviceToken.tokenHasDeviceClaim(jwt({ sub: "a", did: "dev-1" }))).toBe(true)
    expect(deviceToken.tokenHasDeviceClaim(jwt({ sub: "a" }))).toBe(false)
    expect(deviceToken.tokenHasDeviceClaim(null)).toBe(false)
  })
})
