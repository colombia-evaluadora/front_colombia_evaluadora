import "fake-indexeddb/auto"

import { afterEach, describe, expect, it } from "vitest"

import { __closeDbForTests, DB_NAME } from "@/lib/offline/db"
import {
  deleteLocalCredential,
  hasLocalCredential,
  isDeviceSessionLocked,
  lockDeviceSession,
  saveLocalCredential,
  unlockDeviceSession,
  verifyLocalCredential,
} from "@/lib/offline/local-credential"

afterEach(async () => {
  await __closeDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
})

describe("credencial local de la app instalada", () => {
  it("verifica la contraseña sin guardarla en claro", async () => {
    await saveLocalCredential("Docente@x.co", "Secreta-2026")
    expect(await hasLocalCredential("docente@x.co")).toBe(true)
    expect(await verifyLocalCredential("docente@x.co", "Secreta-2026")).toBe(true)
    expect(await verifyLocalCredential("docente@x.co", "otra")).toBe(false)
    // La fila guardada no contiene la contraseña.
    const raw = await new Promise<string>((resolve) => {
      const req = indexedDB.open(DB_NAME)
      req.onsuccess = () => {
        const all = req.result.transaction("meta").objectStore("meta").getAll()
        all.onsuccess = () => {
          req.result.close()
          resolve(JSON.stringify(all.result))
        }
      }
    })
    expect(raw).not.toContain("Secreta-2026")
  }, 30_000)

  it("sin credencial no desbloquea", async () => {
    expect(await verifyLocalCredential("nadie@x.co", "x")).toBe(false)
  })

  it("bloquear y desbloquear la sesión del equipo", async () => {
    expect(await isDeviceSessionLocked("a@x.co")).toBe(false)
    await lockDeviceSession("a@x.co")
    expect(await isDeviceSessionLocked("A@x.co")).toBe(true)
    await unlockDeviceSession("a@x.co")
    expect(await isDeviceSessionLocked("a@x.co")).toBe(false)
  })

  it("borrar la credencial también quita el bloqueo", async () => {
    await saveLocalCredential("a@x.co", "x")
    await lockDeviceSession("a@x.co")
    await deleteLocalCredential("a@x.co")
    expect(await hasLocalCredential("a@x.co")).toBe(false)
    expect(await isDeviceSessionLocked("a@x.co")).toBe(false)
  }, 30_000)
})
