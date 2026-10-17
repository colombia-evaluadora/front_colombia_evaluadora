import "fake-indexeddb/auto"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { __closeDbForTests, DB_NAME } from "@/lib/offline/db"
import { __resetOutboxStoreForTests, deleteOps, outboxStore, putOps, setOutboxUser } from "@/lib/offline/outbox/store"
import type { OutboxOp } from "@/lib/offline/outbox/types"
import { exportSyncPackage, importSyncPackage, SyncPackageError } from "@/lib/offline/sync-package"

const A = "docente@example.com"

const op = (id: string): OutboxOp => ({
  id,
  seq: 1,
  userSub: A,
  kind: "asistencia.registrar",
  handlerVersion: 1,
  entityKey: "e1",
  dependsOn: [],
  payload: { nota: 4 },
  blobRefs: [],
  idempotencyKey: `k-${id}`,
  status: "pending",
  attempts: 0,
  nextAttemptAt: 0,
  lastError: null,
  conflict: null,
  resultNote: null,
  createdAt: Date.UTC(2026, 2, 1),
  updatedAt: 0,
  appBuild: "test",
})

beforeEach(async () => {
  __resetOutboxStoreForTests()
  await __closeDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
  await setOutboxUser(A)
})

afterEach(() => {
  __resetOutboxStoreForTests()
})

describe("paquete de sincronización USB", () => {
  it("exporta, importa sin duplicar y conserva la captura", async () => {
    await putOps([op("o1")])
    const { blob, count } = await exportSyncPackage(A, "frase segura")
    expect(count).toBe(1)
    const text = await blob.text()
    expect(text).not.toContain("nota")

    await deleteOps(["o1"])
    expect(outboxStore.getOps()).toHaveLength(0)
    expect(await importSyncPackage(text, "frase segura", A)).toEqual({ agregados: 1, yaEstaban: 0 })
    expect(outboxStore.getOps()[0]).toMatchObject({ idempotencyKey: "k-o1", createdAt: Date.UTC(2026, 2, 1) })
    expect(await importSyncPackage(text, "frase segura", A)).toEqual({ agregados: 0, yaEstaban: 1 })
  }, 60_000)

  it("rechaza frase incorrecta, archivo alterado y otro usuario", async () => {
    await putOps([op("o2")])
    const text = await (await exportSyncPackage(A, "frase segura")).blob.text()
    await expect(importSyncPackage(text, "otra frase", A)).rejects.toThrow("Frase incorrecta")
    const file = JSON.parse(text)
    const alterado = JSON.stringify({ ...file, count: 99 })
    await expect(importSyncPackage(alterado, "frase segura", A)).rejects.toThrow(/firma/)
    await expect(importSyncPackage(text, "frase segura", "otro@x.co")).rejects.toBeInstanceOf(SyncPackageError)
  }, 60_000)
})
