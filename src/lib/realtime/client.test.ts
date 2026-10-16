import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { backoffDelay, BACKOFF_MAX_MS } from "@/lib/realtime/backoff"
import { createRealtimeClient } from "@/lib/realtime/client"
import type { ConnectivityState } from "@/lib/offline/connectivity"
import {
  __resetMockRealtime,
  dropAll,
  forgetHistory,
  issueTicket,
  mockRealtimeTransport,
  publish,
} from "@/mocks/realtime/server"

function fakeConnectivity(initial: ConnectivityState["status"] = "online") {
  let state: ConnectivityState = { status: initial, since: 0 }
  const listeners = new Set<(s: ConnectivityState) => void>()
  return {
    getState: () => state,
    subscribe: (l: (s: ConnectivityState) => void) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    set(status: ConnectivityState["status"]) {
      state = { status, since: 0 }
      for (const l of listeners) l(state)
    },
  }
}

function setup(sub = "user@example.com") {
  const connectivity = fakeConnectivity()
  const refreshSession = vi.fn(async () => true)
  const fetchTicket = vi.fn(async () => issueTicket(sub).ticket)
  const client = createRealtimeClient({
    transport: mockRealtimeTransport,
    fetchTicket,
    refreshSession,
    connectivity,
    random: () => 0,
  })
  return { client, connectivity, refreshSession, fetchTicket }
}

async function flush(ms = 100) {
  await vi.advanceTimersByTimeAsync(ms)
}

describe("backoffDelay", () => {
  it("crece exponencialmente con tope y jitter", () => {
    expect(backoffDelay(0, () => 0)).toBe(500)
    expect(backoffDelay(0, () => 1)).toBe(1000)
    expect(backoffDelay(3, () => 0)).toBe(4000)
    expect(backoffDelay(20, () => 1)).toBe(BACKOFF_MAX_MS)
  })
})

describe("createRealtimeClient", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    __resetMockRealtime()
  })
  afterEach(() => vi.useRealTimers())

  it("conecta con ticket, se suscribe y recibe eventos en vivo", async () => {
    const { client } = setup()
    const onEvent = vi.fn()
    client.subscribe("canal:1", { onEvent })
    client.start()
    await flush()
    expect(client.getStatus()).toBe("open")
    publish("canal:1", "mensaje.creado", { id: 1 })
    await flush(0)
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ seq: 1, event: "mensaje.creado" }))
  })

  it("reanuda por cursor sin duplicados tras un corte", async () => {
    const { client } = setup()
    const seen: number[] = []
    client.subscribe("canal:1", { onEvent: (e) => seen.push(e.seq ?? -1) })
    client.start()
    await flush()
    publish("canal:1", "a", null)
    await flush(0)
    dropAll()
    publish("canal:1", "b", null)
    publish("canal:1", "c", null)
    await flush(2_000)
    expect(client.getStatus()).toBe("open")
    expect(seen).toEqual([1, 2, 3])
    expect(client.getCursor("canal:1")).toBe(3)
  })

  it("pide resync si el historial ya no está", async () => {
    const { client } = setup()
    const onResync = vi.fn()
    client.subscribe("canal:1", { onEvent: vi.fn(), onResync })
    client.start()
    await flush()
    publish("canal:1", "a", null)
    await flush(0)
    dropAll()
    publish("canal:1", "b", null)
    publish("canal:1", "c", null)
    forgetHistory()
    await flush(2_000)
    expect(onResync).toHaveBeenCalledTimes(1)
  })

  it("ante 4001 refresca la sesión y reconecta; ante 4003 no reintenta", async () => {
    const { client, refreshSession, fetchTicket } = setup()
    client.start()
    await flush()
    dropAll(4001)
    await flush()
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(client.getStatus()).toBe("open")
    const tickets = fetchTicket.mock.calls.length
    dropAll(4003)
    await flush(60_000)
    expect(client.getStatus()).toBe("forbidden")
    expect(fetchTicket.mock.calls.length).toBe(tickets)
  })

  it("no reintenta sin red y reconecta al volver", async () => {
    const { client, connectivity, fetchTicket } = setup()
    client.start()
    await flush()
    connectivity.set("offline")
    expect(client.getStatus()).toBe("offline")
    const tickets = fetchTicket.mock.calls.length
    await flush(60_000)
    expect(fetchTicket.mock.calls.length).toBe(tickets)
    connectivity.set("online")
    await flush()
    expect(client.getStatus()).toBe("open")
  })

  it("rechaza la bandeja de otro usuario y cierra en stop", async () => {
    const { client } = setup("a@example.com")
    const onEvent = vi.fn()
    client.subscribe("user:b@example.com", { onEvent })
    client.start()
    await flush()
    publish("user:b@example.com", "notificacion.creada", {})
    await flush(0)
    expect(onEvent).not.toHaveBeenCalled()
    client.stop()
    expect(client.getStatus()).toBe("idle")
  })
})
