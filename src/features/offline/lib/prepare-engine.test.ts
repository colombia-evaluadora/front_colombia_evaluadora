import "fake-indexeddb/auto"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient } from "@tanstack/react-query"

import { __resetConnectivityForTests } from "@/lib/offline/connectivity"
import { __closeDbForTests, DB_NAME } from "@/lib/offline/db"
import {
  __resetPrepareForTests,
  isPreparing,
  prepareStore,
  runPrepare,
  type PrepareTask,
} from "@/features/offline/lib/prepare-engine"

function task(key: string, run: PrepareTask["run"], extra: Partial<PrepareTask> = {}): PrepareTask {
  return { queryKey: [key], run, ...extra }
}

beforeEach(() => {
  __resetPrepareForTests()
  __resetConnectivityForTests("online")
})

afterEach(async () => {
  await __closeDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
})

describe("motor de Preparar", () => {
  it("corre en serie, suma las tareas hijas y deja 'datos guardados'", async () => {
    const orden: string[] = []
    const hija = task("hija", async () => {
      orden.push("hija")
    })
    const padre = task(
      "padre",
      async () => {
        orden.push("padre")
        return [hija]
      },
      { expands: true },
    )
    const result = await runPrepare(new QueryClient(), [padre], { origin: "manual" })
    expect(orden).toEqual(["padre", "hija"])
    expect(result).toMatchObject({ running: false, done: 2, total: 2, lastOutcome: "ok", failed: [] })
    expect(result.lastPrepareAt).toBeTypeOf("number")
  })

  it("una tarea opcional que falla no cuenta como error", async () => {
    const result = await runPrepare(
      new QueryClient(),
      [
        task("rol", () => Promise.reject(new Error("403")), { optional: true }),
        task("obligatoria", () => Promise.reject(new Error("500"))),
      ],
      { origin: "manual" },
    )
    expect(result.failed.map((t) => t.queryKey[0])).toEqual(["obligatoria"])
    expect(result.lastOutcome).toBe("parcial")
  })

  it("una sola corrida a la vez: la segunda se une a la primera", async () => {
    let soltar: () => void = () => undefined
    let empezo: () => void = () => undefined
    const arranco = new Promise<void>((resolve) => (empezo = resolve))
    const lenta = task("lenta", () => {
      empezo()
      return new Promise<void>((resolve) => (soltar = resolve))
    })
    const otra = vi.fn(async () => undefined)
    const primera = runPrepare(new QueryClient(), [lenta], { origin: "auto" })
    const segunda = runPrepare(new QueryClient(), [task("otra", otra)], { origin: "manual" })
    expect(isPreparing()).toBe(true)
    expect(prepareStore.getSnapshot()).toMatchObject({ running: true, origin: "auto" })
    await arranco
    soltar()
    expect(await segunda).toBe(await primera)
    expect(otra).not.toHaveBeenCalled()
  })

  it("al reanudar, no salta una tarea del checkpoint cuyo dato ya no está en el cache", async () => {
    // Checkpoint de una corrida anterior (otro usuario, o datos borrados al
    // cerrar sesión): dice que la lista ya se bajó, pero el cache está vacío.
    const store = new Map<string, string>()
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    localStorage.setItem(
      "ce-offline-prepare-checkpoint",
      JSON.stringify({ startedAt: Date.now(), done: ['["lista"]', '["con-dato"]'] }),
    )
    const client = new QueryClient()
    client.setQueryData(["con-dato"], 1)
    const lista = vi.fn(async () => undefined)
    const conDato = vi.fn(async () => undefined)
    await runPrepare(client, [task("lista", lista), task("con-dato", conDato)], { origin: "manual", resume: true })
    expect(lista).toHaveBeenCalledOnce()
    expect(conDato).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it("se corta sin red y no marca la preparación como hecha", async () => {
    __resetConnectivityForTests("offline")
    const run = vi.fn(async () => undefined)
    const result = await runPrepare(new QueryClient(), [task("x", run)], { origin: "auto" })
    expect(run).not.toHaveBeenCalled()
    expect(result.lastOutcome).toBe("sin-conexion")
    expect(result.lastPrepareAt).toBeNull()
  })
})
