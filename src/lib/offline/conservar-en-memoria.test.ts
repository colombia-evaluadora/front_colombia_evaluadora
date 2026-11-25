// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"

import { OfflineAwareQueryClient } from "./offline-query-client"
import { setDeviceMode } from "./query-persister"

afterEach(async () => {
  vi.useRealTimers()
  await setDeviceMode("compartido")
})

async function trasUnaHora(queryKey: string[]) {
  vi.useFakeTimers()
  const client = new OfflineAwareQueryClient()
  await client.fetchQuery({ queryKey, queryFn: () => Promise.resolve(1) })
  await vi.advanceTimersByTimeAsync(60 * 60_000)
  return client.getQueryData(queryKey)
}

describe("lo preparado no se descarta de memoria", () => {
  it("equipo personal: sigue ahí una hora después, sin pantalla abierta", async () => {
    await setDeviceMode("personal")
    expect(await trasUnaHora(["conservacion-datos", "politicas"])).toBe(1)
  })
  it("equipo compartido: se descarta como siempre", async () => {
    expect(await trasUnaHora(["conservacion-datos", "politicas"])).toBeUndefined()
  })
})
