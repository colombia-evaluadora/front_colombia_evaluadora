import "fake-indexeddb/auto"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient } from "@tanstack/react-query"
import { AxiosError, type AxiosResponse } from "axios"

import {
  __connectivityEventsForTests,
  __resetConnectivityForTests,
  __setConnectivityForTests,
  connectivityStore,
} from "@/lib/offline/connectivity"
import { __closeDbForTests, DB_NAME } from "@/lib/offline/db"
import { __resetAuthRefreshForTests, endSession, setAuthToken } from "@/lib/api-client"
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
  __resetAuthRefreshForTests()
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

  it("un 500 o un timeout de UN elemento no corta la corrida: queda 'parcial', con el detalle, y Reintentar lo repite", async () => {
    const http500 = new AxiosError("Request failed with status code 500", "ERR_BAD_RESPONSE", undefined, undefined, {
      status: 500,
    } as AxiosResponse)
    const timeout = new AxiosError("timeout of 20000ms exceeded", "ECONNABORTED")
    const despues = vi.fn(async () => undefined)
    let planillaOk = false
    const planilla = vi.fn(async () => {
      if (!planillaOk) throw http500
    })
    const client = new QueryClient()
    const result = await runPrepare(
      client,
      [
        { queryKey: ["planeador", "planilla", { grupoId: 12, periodoId: 3 }], run: planilla },
        task("lenta", () => Promise.reject(timeout)),
        task("despues", despues),
      ],
      { origin: "manual" },
    )
    expect(despues).toHaveBeenCalledOnce()
    expect(result.lastOutcome).toBe("parcial")
    expect(result.failedDetails).toEqual([
      { label: "Planeador › Planilla (grupo 12, periodo 3)", message: "el servidor respondió con error 500" },
      { label: "Lenta", message: "el servidor tardó demasiado en responder" },
    ])
    // La red sigue "online": el diálogo deja Reintentar habilitado.
    expect(connectivityStore.getState().status).toBe("online")

    planillaOk = true
    const retry = await runPrepare(client, result.failed, { origin: "manual" })
    expect(planilla).toHaveBeenCalledTimes(2)
    expect(retry.failed.map((t) => t.queryKey[0])).toEqual(["lenta"])
  })

  it("sin red confirmada se PAUSA y sigue sola cuando vuelve (repite lo que falló por la red)", async () => {
    const red = new AxiosError("Network Error", "ERR_NETWORK")
    let intentos = 0
    const segunda = vi.fn(async () => {
      intentos++
      if (intentos === 1) {
        // El heartbeat confirma que se cortó justo durante esta request.
        __connectivityEventsForTests.handleOffline()
        throw red
      }
    })
    const tercera = vi.fn(async () => undefined)
    const corrida = runPrepare(new QueryClient(), [task("a", async () => undefined), task("b", segunda), task("c", tercera)], {
      origin: "manual",
    })
    await vi.waitFor(() => expect(prepareStore.getSnapshot().paused).toBe(true))
    expect(tercera).not.toHaveBeenCalled()
    // El heartbeat confirma que volvió (avisa a los suscriptores).
    __setConnectivityForTests("online")
    const result = await corrida
    expect(segunda).toHaveBeenCalledTimes(2)
    expect(tercera).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ lastOutcome: "ok", failed: [], paused: false })
  })

  it("se corta sin red y no marca la preparación como hecha", async () => {
    __resetConnectivityForTests("offline")
    const run = vi.fn(async () => undefined)
    const result = await runPrepare(new QueryClient(), [task("x", run)], { origin: "auto", maxPauseMs: 0 })
    expect(run).not.toHaveBeenCalled()
    expect(result.lastOutcome).toBe("sin-conexion")
    expect(result.lastPrepareAt).toBeNull()
  })
})

describe("Preparar y el fin de la sesión", () => {
  const http401 = () =>
    new AxiosError("Request failed with status code 401", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 401,
      data: {},
      headers: {},
      statusText: "Unauthorized",
      config: {},
    } as AxiosResponse)

  it("el primer 401 detiene la corrida: no se pide ninguna tarea más", async () => {
    const despues = vi.fn(async () => undefined)
    const result = await runPrepare(
      new QueryClient(),
      [task("a", async () => undefined), task("b", () => Promise.reject(http401())), task("c", despues), task("d", despues)],
      { origin: "auto" },
    )
    expect(despues).not.toHaveBeenCalled()
    expect(result.lastOutcome).toBe("sesion")
    expect(result.failed).toEqual([])
    // No cuenta como "datos guardados": queda para "Continuar".
    expect(result.lastPrepareAt).toBeNull()
  })

  it("logout a mitad de la corrida la corta y no deja arrancar otra", async () => {
    setAuthToken("tok")
    let soltar: () => void = () => undefined
    let empezo: () => void = () => undefined
    const arranco = new Promise<void>((resolve) => (empezo = resolve))
    const lenta = task("lenta", () => {
      empezo()
      return new Promise<void>((resolve) => (soltar = resolve))
    })
    const despues = vi.fn(async () => undefined)
    const run = runPrepare(new QueryClient(), [lenta, task("x", despues), task("y", despues)], { origin: "manual" })
    await arranco
    endSession("logout")
    soltar()
    const result = await run
    expect(despues).not.toHaveBeenCalled()
    expect(result.lastOutcome).toBe("sesion")
    expect(isPreparing()).toBe(false)
    // Con la sesión terminada no arranca otra (ni la automática).
    const otra = vi.fn(async () => undefined)
    await runPrepare(new QueryClient(), [task("z", otra)], { origin: "auto" })
    expect(otra).not.toHaveBeenCalled()
  })
})
