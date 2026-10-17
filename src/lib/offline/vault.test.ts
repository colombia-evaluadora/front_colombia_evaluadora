import "fake-indexeddb/auto"

import { afterEach, describe, expect, it, vi } from "vitest"

import { __closeDbForTests, DB_NAME } from "@/lib/offline/db"
import {
  __resetVaultForTests,
  createVault,
  isEncrypted,
  loadVault,
  lockVault,
  MAX_PIN_ATTEMPTS,
  openString,
  sealString,
  unlockVault,
  vaultStore,
} from "@/lib/offline/vault"

afterEach(async () => {
  __resetVaultForTests()
  await __closeDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
})

describe("bóveda local", () => {
  it("sin PIN no cifra", async () => {
    await loadVault("a@x")
    expect(vaultStore.get()).toBe("sin-pin")
    expect(await sealString("hola")).toBe("hola")
  })

  it("cifra con AES-GCM y descifra tras desbloquear con el PIN correcto", async () => {
    await createVault("a@x", "123456")
    const sealed = await sealString('{"nota":4.5}')
    expect(isEncrypted(sealed)).toBe(true)
    expect(sealed).not.toContain("nota")

    lockVault()
    await expect(openString(sealed)).rejects.toThrow()
    expect(await unlockVault("a@x", "123456", vi.fn())).toEqual({ ok: true })
    expect(await openString(sealed)).toBe('{"nota":4.5}')
  }, 30_000)

  it("PIN incorrecto descuenta intentos y al agotarlos borra", async () => {
    await createVault("a@x", "123456")
    lockVault()
    const wipe = vi.fn(async () => undefined)
    const first = await unlockVault("a@x", "000000", wipe)
    expect(first).toEqual({ ok: false, remaining: MAX_PIN_ATTEMPTS - 1, wiped: false })
    let last = first
    for (let i = 1; i < MAX_PIN_ATTEMPTS; i++) last = await unlockVault("a@x", "000000", wipe)
    expect(last).toMatchObject({ wiped: true })
    expect(wipe).toHaveBeenCalledOnce()
  }, 120_000)
})
