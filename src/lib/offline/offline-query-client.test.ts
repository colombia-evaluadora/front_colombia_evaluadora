import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MutationObserver, QueryObserver, onlineManager } from "@tanstack/react-query"

import { AUTO_NETWORK_MODE, OfflineAwareQueryClient, applyAutoNetworkMode, autoNetworkMode } from "@/lib/offline/offline-query-client"
import { queryConfig } from "@/lib/react-query"

/** Error con la forma de un `Network Error` de axios (sin `response`). */
function networkError() {
  return Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK" })
}

function makeClient() {
  return new OfflineAwareQueryClient({ defaultOptions: queryConfig })
}

/** Espera a que el observador deje de estar `fetching` (o venza el tiempo). */
async function settle(observer: { getCurrentResult(): { fetchStatus: string } }, ms = 200) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (observer.getCurrentResult().fetchStatus !== "fetching") return
    await new Promise((r) => setTimeout(r, 5))
  }
}

describe("autoNetworkMode / applyAutoNetworkMode", () => {
  it("sin datos corre siempre, con datos espera la red", () => {
    expect(autoNetworkMode(false)).toBe("always")
    expect(autoNetworkMode(true)).toBe("online")
  })

  it("respeta un networkMode explícito", () => {
    const explicit = { networkMode: "online" as const }
    expect(applyAutoNetworkMode(explicit, false)).toBe(explicit)
  })

  it("marca y recalcula el modo automático", () => {
    const auto = applyAutoNetworkMode({} as { networkMode?: "online" | "always" | "offlineFirst" }, false)
    expect(auto).toMatchObject({ networkMode: "always", [AUTO_NETWORK_MODE]: true })
    expect(applyAutoNetworkMode(auto, true)).toMatchObject({ networkMode: "online", [AUTO_NETWORK_MODE]: true })
    // Sin cambios devuelve la misma referencia.
    expect(applyAutoNetworkMode(auto, false)).toBe(auto)
  })
})

describe("OfflineAwareQueryClient sin red", () => {
  let client: OfflineAwareQueryClient

  beforeEach(() => {
    client = makeClient()
    client.mount()
    onlineManager.setOnline(false)
  })

  afterEach(() => {
    onlineManager.setOnline(true)
    client.clear()
    client.unmount()
  })

  it("una query sin datos falla rápido en vez de quedar pausada", async () => {
    const queryFn = vi.fn().mockRejectedValue(networkError())
    const observer = new QueryObserver(client, { queryKey: ["sin-datos"], queryFn })
    const unsubscribe = observer.subscribe(() => undefined)
    await settle(observer)
    const result = observer.getCurrentResult()
    unsubscribe()
    expect(queryFn).toHaveBeenCalledTimes(1) // sin reintentos sin red
    expect(result.isPending).toBe(false)
    expect(result.isError).toBe(true)
    expect(result.fetchStatus).toBe("idle")
  })

  it("una query con datos guardados pausa el refetch y conserva el éxito", async () => {
    client.setQueryData(["con-datos"], { valor: 1 }, { updatedAt: Date.now() - 10 * 60_000 })
    const queryFn = vi.fn().mockRejectedValue(networkError())
    const observer = new QueryObserver(client, { queryKey: ["con-datos"], queryFn })
    const unsubscribe = observer.subscribe(() => undefined)
    await new Promise((r) => setTimeout(r, 50))
    const result = observer.getCurrentResult()
    unsubscribe()
    expect(queryFn).not.toHaveBeenCalled()
    expect(result.status).toBe("success")
    expect(result.data).toEqual({ valor: 1 })
  })

  it("una query restaurada sin observador refetchea en modo online (no pisa los datos con un error)", async () => {
    client.setQueryData(["restaurada"], [1, 2, 3])
    const query = client.getQueryCache().find({ queryKey: ["restaurada"] })
    expect(query?.options.networkMode).toBe("online")
  })

  it("respeta networkMode online explícito (la query decide pausar)", async () => {
    const queryFn = vi.fn().mockResolvedValue("ok")
    const observer = new QueryObserver(client, { queryKey: ["explicita"], queryFn, networkMode: "online" })
    const unsubscribe = observer.subscribe(() => undefined)
    await new Promise((r) => setTimeout(r, 30))
    const result = observer.getCurrentResult()
    unsubscribe()
    expect(queryFn).not.toHaveBeenCalled()
    expect(result.fetchStatus).toBe("paused")
  })

  it("al volver la red la query que falló sin datos se vuelve a pedir", async () => {
    const queryFn = vi.fn().mockRejectedValueOnce(networkError()).mockResolvedValue("ok")
    const observer = new QueryObserver(client, { queryKey: ["reconecta"], queryFn })
    const unsubscribe = observer.subscribe(() => undefined)
    await settle(observer)
    expect(observer.getCurrentResult().isError).toBe(true)
    onlineManager.setOnline(true)
    await new Promise((r) => setTimeout(r, 30))
    const result = observer.getCurrentResult()
    unsubscribe()
    expect(result.data).toBe("ok")
  })

  it("las mutaciones no quedan pausadas: fallan y el botón sale de 'Guardando…'", async () => {
    const mutationFn = vi.fn().mockRejectedValue(networkError())
    const observer = new MutationObserver(client, { mutationFn })
    await expect(observer.mutate(undefined)).rejects.toThrow("Network Error")
    expect(mutationFn).toHaveBeenCalledTimes(1)
    expect(observer.getCurrentResult().isPending).toBe(false)
  })
})
