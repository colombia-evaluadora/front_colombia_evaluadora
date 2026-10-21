import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { onlineManager } from "@tanstack/react-query"

import {
  __connectivityEventsForTests as events,
  __resetConnectivityForTests,
  connectivityStore,
} from "@/lib/offline/connectivity"
import { getOfflineBannerMessage } from "@/lib/offline/banner-message"

type Reply = () => Promise<Response> | Response

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
const ok: Reply = () => json({ status: "ok" })
const html: Reply = () => new Response("<html>login</html>", { headers: { "content-type": "text/html" } })
const fail: Reply = () => Promise.reject(new TypeError("Failed to fetch"))

let replies: Reply[] = []
const fetchMock = vi.fn((url: string, init?: RequestInit) => {
  void url
  void init
  const next = replies.shift() ?? ok
  return Promise.resolve().then(next)
})

/** Corre timers y microtareas hasta `ms`. */
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms)

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockClear()
  replies = []
  __resetConnectivityForTests("online")
})

afterEach(() => {
  __resetConnectivityForTests("online")
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("connectivityStore", () => {
  it("el heartbeat va a /eval-col/health sin auth y sin cache", async () => {
    connectivityStore.start()
    await advance(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/eval-col/health")
    expect(init).toMatchObject({ cache: "no-store", credentials: "omit", redirect: "manual" })
    expect(connectivityStore.getState().status).toBe("online")
  })

  it("el evento offline pasa a offline de inmediato", () => {
    events.handleOffline()
    expect(connectivityStore.getState().status).toBe("offline")
  })

  it("2 errores de red en 60 s pasan a degraded", () => {
    connectivityStore.reportNetworkFailure()
    expect(connectivityStore.getState().status).toBe("online")
    connectivityStore.reportNetworkFailure()
    expect(connectivityStore.getState().status).toBe("degraded")
  })

  it("errores separados por más de 60 s no degradan", () => {
    connectivityStore.reportNetworkFailure()
    vi.advanceTimersByTime(61_000)
    connectivityStore.reportNetworkFailure()
    expect(connectivityStore.getState().status).toBe("online")
  })

  it("reportSuccess sale de degraded por red", () => {
    connectivityStore.reportNetworkFailure()
    connectivityStore.reportNetworkFailure()
    connectivityStore.reportSuccess()
    expect(connectivityStore.getState().status).toBe("online")
  })

  it("portal cautivo (HTML) → degraded con aviso de Wi-Fi", async () => {
    replies = [html]
    connectivityStore.start()
    await advance(0)
    const state = connectivityStore.getState()
    expect(state).toMatchObject({ status: "degraded", reason: "captive-portal" })
    expect(getOfflineBannerMessage(state, "/app/planeador/actividades")).toContain(
      "Puede que la red Wi-Fi requiera iniciar sesión.",
    )
  })

  it("portal cautivo (302) → degraded", async () => {
    replies = [() => new Response(null, { status: 302, headers: { location: "http://portal" } })]
    connectivityStore.start()
    await advance(0)
    expect(connectivityStore.getState()).toMatchObject({ status: "degraded", reason: "captive-portal" })
  })

  it("JSON sin campo conocido se trata como portal", async () => {
    replies = [() => json({ foo: 1 })]
    connectivityStore.start()
    await advance(0)
    expect(connectivityStore.getState().reason).toBe("captive-portal")
  })

  it("503 de eval-col → degraded sin culpar a la red", async () => {
    replies = [() => json({ status: "down" }, 503)]
    connectivityStore.start()
    await advance(0)
    const state = connectivityStore.getState()
    expect(state).toMatchObject({ status: "degraded", reason: "server" })
    expect(getOfflineBannerMessage(state, "/app")).toBe("No pudimos comunicarnos con el servidor")
  })

  it("latencia > 4 s → degraded", async () => {
    replies = [() => new Promise<Response>((resolve) => setTimeout(() => resolve(json({ status: "ok" })), 4_500))]
    connectivityStore.start()
    await advance(5_000)
    expect(connectivityStore.getState()).toMatchObject({ status: "degraded", reason: "slow" })
  })

  it("2 fallas seguidas del heartbeat pasan a offline (1 sola no)", async () => {
    replies = [fail, fail]
    connectivityStore.start()
    await advance(0)
    expect(connectivityStore.getState().status).toBe("degraded")
    await advance(10_000)
    expect(connectivityStore.getState().status).toBe("offline")
  })

  it("un heartbeat que falla justo después de una respuesta OK de la API no cuenta (hilo ocupado, no red)", async () => {
    replies = [fail, fail]
    connectivityStore.reportSuccess()
    connectivityStore.start()
    await advance(0)
    expect(connectivityStore.getState().status).toBe("online")
  })

  it("si el timeout del heartbeat dispara tarde (hilo bloqueado) da un margen en vez de abortar", async () => {
    let soltar: (r: Response) => void = () => undefined
    replies = [() => new Promise<Response>((resolve) => (soltar = resolve))]
    connectivityStore.start()
    await advance(0)
    // El hilo estuvo bloqueado: el reloj avanza 15 s sin correr timers.
    vi.setSystemTime(Date.now() + 15_000)
    await advance(10_000)
    // El timer disparó 15 s tarde → margen de 2 s; la respuesta llega dentro.
    soltar(json({ status: "ok" }))
    await advance(0)
    // Respondió (no se abortó): a lo sumo "lento", nunca una falla de red.
    expect(connectivityStore.getState()).toMatchObject({ status: "degraded", reason: "slow" })
  })

  it("offline → online exige 2 heartbeats OK separados 3 s", async () => {
    connectivityStore.start()
    await advance(0)
    events.handleOffline()
    events.handleOnline()
    await advance(0)
    // Primer OK: sigue offline.
    expect(connectivityStore.getState().status).toBe("offline")
    await advance(2_999)
    expect(connectivityStore.getState().status).toBe("offline")
    await advance(1)
    expect(connectivityStore.getState().status).toBe("online")
  })

  it("red intermitente: un OK suelto entre fallas no vuelve a online", async () => {
    connectivityStore.start()
    await advance(0)
    events.handleOffline()
    replies = [ok, fail, ok, fail]
    events.handleOnline()
    await advance(0) // OK 1
    await advance(3_000) // falla → resetea
    await advance(10_000) // OK
    await advance(3_000) // falla
    expect(connectivityStore.getState().status).toBe("offline")
  })

  it("alimenta el onlineManager de TanStack Query", () => {
    events.handleOffline()
    expect(onlineManager.isOnline()).toBe(false)
    __resetConnectivityForTests("online")
    connectivityStore.reportNetworkFailure()
    connectivityStore.reportNetworkFailure()
    connectivityStore.reportSuccess()
    expect(onlineManager.isOnline()).toBe(true)
  })
})

describe("getOfflineBannerMessage", () => {
  const since = 0
  it("oculto en online", () => {
    expect(getOfflineBannerMessage({ status: "online", since }, "/app")).toBeNull()
  })
  it("offline en vista que funciona sin conexión", () => {
    expect(getOfflineBannerMessage({ status: "offline", since }, "/app/asistencia")).toBe(
      "Estás sin conexión. Puedes seguir consultando y registrando asistencia y calificaciones; se enviarán cuando vuelva la conexión.",
    )
  })
  it("offline en vista solo en línea", () => {
    expect(getOfflineBannerMessage({ status: "offline", since }, "/app/cobertura/matricula")).toBe(
      "Estás sin conexión. Esta sección necesita conexión; tus datos guardados siguen disponibles en Planeador, Planilla, Asistencia, Informes y Referentes.",
    )
  })
  it("degradado", () => {
    expect(getOfflineBannerMessage({ status: "degraded", since, reason: "network" }, "/app")).toBe(
      "La conexión está lenta o inestable. Lo que guardes se enviará apenas se estabilice.",
    )
  })
})
