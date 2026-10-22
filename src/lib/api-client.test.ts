import { delay, http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// El interceptor lee `window.location` (login / redirect). En node no existe.
const location = { pathname: "/app/planeador/actividades", href: "/app/planeador/actividades" }
vi.stubGlobal("window", { location })

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

const {
  api,
  setAuthToken,
  getAuthToken,
  __resetAuthRefreshForTests,
  beginLogout,
  finishLogout,
  endSession,
  setPrepareRequestScope,
  SESSION_TOAST_ID,
} = await import("@/lib/api-client")
const { getUser } = await import("@/lib/auth")
const { NetworkSessionError } = await import("@/lib/network-error")
const { connectivityStore, __resetConnectivityForTests } = await import("@/lib/offline/connectivity")
const { queryClient } = await import("@/lib/query-client")

const BASE = "http://localhost/api"
api.defaults.baseURL = BASE
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
beforeEach(() => {
  toastError.mockClear()
  __resetConnectivityForTests()
  vi.restoreAllMocks()
  location.href = location.pathname
  __resetAuthRefreshForTests()
  setAuthToken(null)
})

const TOKEN = `${btoa(JSON.stringify({ alg: "none" }))}.${btoa(
  JSON.stringify({ sub: "a@b.co", name: "A", roles: [] }),
)}.`

describe("getUser", () => {
  it("devuelve null ante 401 del refresh", async () => {
    server.use(http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })))
    await expect(getUser()).resolves.toBeNull()
  })

  it("lanza NetworkSessionError ante error de red", async () => {
    server.use(http.post(`${BASE}/auth/refresh`, () => HttpResponse.error()))
    await expect(getUser()).rejects.toBeInstanceOf(NetworkSessionError)
  })

  it("lanza NetworkSessionError ante 503", async () => {
    server.use(http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 503 })))
    await expect(getUser()).rejects.toBeInstanceOf(NetworkSessionError)
  })

  it("devuelve el usuario con token válido", async () => {
    server.use(http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ token: TOKEN })))
    await expect(getUser()).resolves.toMatchObject({ email: "a@b.co" })
  })
})

describe("interceptor de respuesta", () => {
  it("403 con refresh caído por red no limpia cache ni redirige y reporta degraded", async () => {
    setAuthToken("viejo")
    queryClient.setQueryData(["algo"], 1)
    server.use(
      http.get(`${BASE}/eval-col/cosa`, () => new HttpResponse(null, { status: 403 })),
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.error()),
    )
    const spy = vi.spyOn(connectivityStore, "reportNetworkFailure")
    // La conectividad degrada con 2 fallas en la ventana: una previa + la del refresh.
    connectivityStore.reportNetworkFailure("network")
    await expect(api.get("/eval-col/cosa")).rejects.toMatchObject({ response: { status: 403 } })
    expect(spy).toHaveBeenLastCalledWith("network")
    expect(queryClient.getQueryData(["algo"])).toBe(1)
    expect(location.href).toBe(location.pathname)
    expect(connectivityStore.getState().status).toBe("degraded")
    expect(toastError).not.toHaveBeenCalled()
  })

  it("un timeout no tostea y pasa a degraded", async () => {
    server.use(
      http.get(`${BASE}/eval-col/lenta`, async () => {
        await delay("infinite")
      }),
    )
    await expect(api.get("/eval-col/lenta", { timeout: 50 })).rejects.toBeTruthy()
    await expect(api.get("/eval-col/lenta", { timeout: 50 })).rejects.toMatchObject({
      code: "ECONNABORTED",
    })
    expect(connectivityStore.getState().status).toBe("degraded")
    expect(toastError).not.toHaveBeenCalled()
  })

  it("un 409 de negocio sí tostea y no degrada", async () => {
    server.use(
      http.post(`${BASE}/eval-col/x`, () =>
        HttpResponse.json({ message: "Conflict: ERROR: ya existe" }, { status: 409 }),
      ),
    )
    await expect(api.post("/eval-col/x")).rejects.toBeTruthy()
    expect(toastError).toHaveBeenCalledWith("ya existe")
    expect(connectivityStore.getState().status).toBe("online")
  })
})

it("un 503 del gateway reporta reason server", async () => {
  server.use(http.get(`${BASE}/eval-col/caido`, () => new HttpResponse(null, { status: 503 })))
  await expect(api.get("/eval-col/caido")).rejects.toBeTruthy()
  await expect(api.get("/eval-col/caido")).rejects.toBeTruthy()
  expect(connectivityStore.getState()).toMatchObject({ status: "degraded", reason: "server" })
  expect(toastError).not.toHaveBeenCalled()
})

describe("Idempotency-Key", () => {
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  it("va en mutaciones y no en lecturas por POST", async () => {
    const keys: (string | null)[] = []
    server.use(
      http.all(`${BASE}/eval-col/*`, ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key"))
        return HttpResponse.json({ rows: [] })
      }),
    )
    await api.post("/eval-col/a", {})
    await api.put("/eval-col/a", {})
    await api.query("/eval-col/a", {})
    await api.post("/eval-col/a", {}, { readOnly: true })
    await api.get("/eval-col/a")
    expect(keys[0]).toMatch(UUID_V4)
    expect(keys[1]).toMatch(UUID_V4)
    expect(keys[0]).not.toBe(keys[1])
    expect(keys.slice(2)).toEqual([null, null, null])
  })

  it("conserva la clave si la operación se reenvía con la misma", async () => {
    let recibida: string | null = null
    server.use(
      http.post(`${BASE}/eval-col/a`, ({ request }) => {
        recibida = request.headers.get("Idempotency-Key")
        return HttpResponse.json({})
      }),
    )
    await api.post("/eval-col/a", {}, { headers: { "Idempotency-Key": "fija" } })
    expect(recibida).toBe("fija")
  })
})

describe("refresh de sesión single-flight", () => {
  const nuevoToken = (n: number) =>
    `${btoa(JSON.stringify({ alg: "none" }))}.${btoa(JSON.stringify({ sub: "a@b.co", name: "A", roles: [], n }))}.`

  function contarRefresh(respuesta: () => Response | Promise<Response> = () => HttpResponse.json({ token: nuevoToken(1) })) {
    const llamadas = { n: 0 }
    server.use(
      http.post(`${BASE}/auth/refresh`, async () => {
        llamadas.n++
        await delay(20)
        return respuesta()
      }),
    )
    return llamadas
  }

  it("tres 403 concurrentes piden UN refresh y no cierran la sesión", async () => {
    setAuthToken("viejo")
    queryClient.setQueryData(["algo"], 1)
    const refresh = contarRefresh()
    const auths: (string | null)[] = []
    server.use(
      http.get(`${BASE}/eval-col/planeador/docentes/:x`, ({ request }) => {
        auths.push(request.headers.get("Authorization"))
        return HttpResponse.json({ message: "No tienes acceso" }, { status: 403 })
      }),
    )
    const results = await Promise.allSettled([
      api.get("/eval-col/planeador/docentes/grupos"),
      api.get("/eval-col/planeador/docentes/grado-asignatura"),
      api.get("/eval-col/planeador/docentes/periodos"),
    ])
    expect(refresh.n).toBe(1)
    expect(results.every((r) => r.status === "rejected")).toBe(true)
    // Cada una se reintentó UNA vez, con el token nuevo.
    expect(auths.filter((a) => a === "Bearer viejo")).toHaveLength(3)
    expect(auths.filter((a) => a === `Bearer ${nuevoToken(1)}`)).toHaveLength(3)
    expect(getAuthToken()).toBe(nuevoToken(1))
    expect(location.href).toBe(location.pathname)
    expect(queryClient.getQueryData(["algo"])).toBe(1)
  })

  it("un 403 que se repite en el mismo endpoint no vuelve a pedir refresh", async () => {
    setAuthToken("viejo")
    const refresh = contarRefresh()
    server.use(http.get(`${BASE}/eval-col/prohibido`, () => new HttpResponse(null, { status: 403 })))
    await expect(api.get("/eval-col/prohibido")).rejects.toMatchObject({ response: { status: 403 } })
    await expect(api.get("/eval-col/prohibido")).rejects.toMatchObject({ response: { status: 403 } })
    await expect(api.get("/eval-col/prohibido?otra=1")).rejects.toMatchObject({ response: { status: 403 } })
    expect(refresh.n).toBe(1)
  })

  it("un 403 en otro endpoint justo después de un refresh no pide otro (cool-down)", async () => {
    setAuthToken("viejo")
    const refresh = contarRefresh()
    server.use(
      http.get(`${BASE}/eval-col/a`, () => new HttpResponse(null, { status: 403 })),
      http.get(`${BASE}/eval-col/b`, () => new HttpResponse(null, { status: 403 })),
    )
    await expect(api.get("/eval-col/a")).rejects.toBeTruthy()
    await expect(api.get("/eval-col/b")).rejects.toBeTruthy()
    expect(refresh.n).toBe(1)
  })

  it("si el reintento con el token nuevo funciona, la request resuelve", async () => {
    setAuthToken("viejo")
    const refresh = contarRefresh()
    server.use(
      http.get(`${BASE}/eval-col/mio`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer viejo"
          ? new HttpResponse(null, { status: 403 })
          : HttpResponse.json({ ok: true }),
      ),
    )
    await expect(api.get("/eval-col/mio")).resolves.toEqual({ ok: true })
    expect(refresh.n).toBe(1)
    expect(toastError).not.toHaveBeenCalled()
  })

  it("getUser() concurrente con la revalidación de un 403 comparte el mismo refresh", async () => {
    setAuthToken("viejo")
    const refresh = contarRefresh()
    server.use(http.get(`${BASE}/eval-col/x403`, () => new HttpResponse(null, { status: 403 })))
    await Promise.allSettled([api.get("/eval-col/x403"), getUser(), getUser()])
    expect(refresh.n).toBe(1)
  })

  it("un 401 renueva una vez y reintenta; si el refresh dice que no hay sesión, cierra", async () => {
    setAuthToken("viejo")
    const refresh = contarRefresh(() => new HttpResponse(null, { status: 401 }))
    server.use(http.get(`${BASE}/eval-col/y401`, () => new HttpResponse(null, { status: 401 })))
    await Promise.allSettled([api.get("/eval-col/y401"), api.get("/eval-col/y401"), api.get("/eval-col/y401")])
    expect(refresh.n).toBe(1)
    expect(location.href).toContain("/login")
  })

  it("un 401 con el refresh vivo reintenta y resuelve sin cerrar la sesión", async () => {
    setAuthToken("vencido")
    const refresh = contarRefresh()
    server.use(
      http.get(`${BASE}/eval-col/z`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer vencido"
          ? HttpResponse.json({ error: "invalid_token" }, { status: 401 })
          : HttpResponse.json({ ok: 1 }),
      ),
    )
    await expect(api.get("/eval-col/z")).resolves.toEqual({ ok: 1 })
    expect(refresh.n).toBe(1)
    expect(location.href).toBe(location.pathname)
  })

  it("un 429 del refresh no cierra la sesión", async () => {
    setAuthToken("viejo")
    contarRefresh(() => new HttpResponse(null, { status: 429 }))
    server.use(http.get(`${BASE}/eval-col/w`, () => new HttpResponse(null, { status: 403 })))
    await expect(api.get("/eval-col/w")).rejects.toMatchObject({ response: { status: 403 } })
    expect(location.href).toBe(location.pathname)
  })
})

describe("fin de sesión: nada sale con el token viejo", () => {
  it("logout aborta las requests en vuelo y bloquea las nuevas (salvo /auth/logout)", async () => {
    setAuthToken("tok")
    const llegaron: string[] = []
    server.use(
      http.get(`${BASE}/eval-col/lenta`, async () => {
        await delay(200)
        return HttpResponse.json({})
      }),
      http.get(`${BASE}/eval-col/*`, ({ request }) => {
        llegaron.push(new URL(request.url).pathname)
        return HttpResponse.json({})
      }),
      http.post(`${BASE}/auth/logout`, () => HttpResponse.json({})),
    )
    const enVuelo = api.get("/eval-col/lenta")
    beginLogout()
    await expect(enVuelo).rejects.toMatchObject({ code: "ERR_CANCELED" })
    await expect(api.get("/eval-col/notificaciones")).rejects.toMatchObject({ code: "ERR_CANCELED" })
    await expect(api.post("/auth/logout")).resolves.toEqual({})
    finishLogout()
    setAuthToken(null)
    await expect(api.get("/eval-col/planeador/x")).rejects.toMatchObject({ code: "ERR_CANCELED" })
    expect(llegaron).toEqual([])
    expect(toastError).not.toHaveBeenCalled()
    // Un login nuevo reabre la sesión.
    setAuthToken("otro")
    await expect(api.get("/eval-col/ok")).resolves.toEqual({})
  })

  it("durante el logout nadie reabre la sesión con un refresh", async () => {
    setAuthToken("tok")
    let refresh = 0
    server.use(http.post(`${BASE}/auth/refresh`, () => (refresh++, HttpResponse.json({ token: TOKEN }))))
    beginLogout()
    await expect(getUser()).resolves.toBeNull()
    expect(refresh).toBe(0)
    finishLogout()
  })

  it("el toast de sesión inválida usa siempre el mismo id (no se apila)", async () => {
    // En /login un 401 no cierra sesión: antes salía un toast por request.
    location.pathname = "/login"
    try {
      server.use(http.get(`${BASE}/eval-col/q`, () => new HttpResponse(null, { status: 401 })))
      await Promise.allSettled([api.get("/eval-col/q"), api.get("/eval-col/q"), api.get("/eval-col/q")])
      expect(toastError).toHaveBeenCalled()
      for (const call of toastError.mock.calls) expect(call[1]).toEqual({ id: SESSION_TOAST_ID })
    } finally {
      location.pathname = "/app/planeador/actividades"
    }
  })

  it("las lecturas de Preparar van en segundo plano: sin toast ni redirect ante 401", async () => {
    setAuthToken("tok")
    server.use(
      http.get(`${BASE}/eval-col/prep`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
    )
    setPrepareRequestScope(true)
    try {
      await expect(api.get("/eval-col/prep")).rejects.toMatchObject({ response: { status: 401 } })
    } finally {
      setPrepareRequestScope(false)
    }
    expect(toastError).not.toHaveBeenCalled()
    expect(location.href).toBe(location.pathname)
  })

  it("sesión vencida: un solo cierre, sin toasts, y lo demás queda cancelado", async () => {
    setAuthToken("tok")
    server.use(
      http.get(`${BASE}/eval-col/v`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
    )
    await Promise.allSettled([api.get("/eval-col/v"), api.get("/eval-col/v"), api.get("/eval-col/v")])
    expect(toastError).not.toHaveBeenCalled()
    expect(location.href).toContain("/login")
    await expect(api.get("/eval-col/v")).rejects.toMatchObject({ code: "ERR_CANCELED" })
    endSession("expired")
  })
})
