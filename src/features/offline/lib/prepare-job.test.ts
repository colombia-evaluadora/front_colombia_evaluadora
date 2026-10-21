import "fake-indexeddb/auto"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient } from "@tanstack/react-query"

import { __resetConnectivityForTests } from "@/lib/offline/connectivity"
import { __closeDbForTests, DB_NAME } from "@/lib/offline/db"
import {
  __resetPrepareForTests,
  cancelPrepare,
  isPreparing,
  prepareStore,
  runPrepare,
  type PrepareTask,
} from "@/features/offline/lib/prepare-engine"
import { describePrepareKey, failedCountText } from "@/features/offline/lib/prepare-labels"

function task(key: string, run: PrepareTask["run"]): PrepareTask {
  return { queryKey: [key], run }
}

beforeEach(() => {
  __resetPrepareForTests()
  __resetConnectivityForTests("online")
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await __closeDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
})

describe("Preparar como trabajo en segundo plano", () => {
  it("cede el hilo entre tareas: un evento de la pantalla corre en medio de la corrida", async () => {
    const orden: string[] = []
    const corrida = runPrepare(
      new QueryClient(),
      [
        task("a", async () => {
          orden.push("a")
          // La pantalla agenda trabajo (un clic, un render) mientras corre.
          setTimeout(() => orden.push("pantalla"), 0)
        }),
        task("b", async () => void orden.push("b")),
      ],
      { origin: "manual" },
    )
    await corrida
    expect(orden).toEqual(["a", "pantalla", "b"])
  })

  it("no bloquea al llamador: runPrepare devuelve enseguida y el progreso se observa en el store", async () => {
    let soltar: (() => void) | null = null
    const lenta = task("lenta", () => new Promise<void>((resolve) => (soltar = resolve)))
    const corrida = runPrepare(new QueryClient(), [lenta, task("b", async () => undefined)], {
      origin: "manual",
    })
    expect(isPreparing()).toBe(true)
    await vi.waitFor(() => expect(soltar).not.toBeNull())
    expect(prepareStore.getSnapshot()).toMatchObject({ running: true, total: 2, done: 0 })
    soltar!()
    const result = await corrida
    expect(result).toMatchObject({ running: false, done: 2, lastOutcome: "ok" })
  })

  it("Cancelar corta la corrida, deja 'cancelada' y no marca 'datos guardados'", async () => {
    const b = vi.fn(async () => undefined)
    const corrida = runPrepare(
      new QueryClient(),
      [task("a", async () => cancelPrepare()), task("b", b)],
      { origin: "manual" },
    )
    const result = await corrida
    expect(b).not.toHaveBeenCalled()
    expect(result.lastOutcome).toBe("cancelada")
    expect(result.lastPrepareAt).toBeNull()
    expect(isPreparing()).toBe(false)
  })

  it("una sola corrida entre pestañas: sin el Web Lock no corre nada", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      locks: { request: (_n: string, _o: unknown, cb: (lock: null) => Promise<void>) => cb(null) },
    })
    const run = vi.fn(async () => undefined)
    await runPrepare(new QueryClient(), [task("x", run)], { origin: "manual" })
    expect(run).not.toHaveBeenCalled()
  })

  it("muestra el progreso de la corrida de OTRA pestaña (BroadcastChannel) y no arranca otra", async () => {
    const otraPestania = new BroadcastChannel("ce-offline-prepare")
    // Engancha el canal de esta "pestaña".
    const run = vi.fn(async () => undefined)
    await runPrepare(new QueryClient(), [], { origin: "manual" })
    otraPestania.postMessage({ type: "progress", origin: "auto", done: 3, total: 10 })
    await vi.waitFor(() =>
      expect(prepareStore.getSnapshot().remote).toEqual({ origin: "auto", done: 3, total: 10 }),
    )
    expect(isPreparing()).toBe(true)
    await runPrepare(new QueryClient(), [task("x", run)], { origin: "manual" })
    expect(run).not.toHaveBeenCalled()
    otraPestania.postMessage({ type: "done", lastPrepareAt: 123 })
    await vi.waitFor(() =>
      expect(prepareStore.getSnapshot()).toMatchObject({ remote: null, lastPrepareAt: 123 }),
    )
    otraPestania.close()
  })
})

describe("textos de Preparar", () => {
  it("nombre legible de una key y gramática del conteo", () => {
    expect(describePrepareKey(["planeador", "planilla", { grupoId: 12, periodoId: 3 }])).toBe(
      "Planeador › Planilla (grupo 12, periodo 3)",
    )
    expect(failedCountText(1)).toBe("No se pudo descargar 1 elemento.")
    expect(failedCountText(4)).toBe("No se pudieron descargar 4 elementos.")
  })
})
