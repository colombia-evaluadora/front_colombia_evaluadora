import { delay, http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// El interceptor lee `window.location` (login / redirect). En node no existe.
const location = { pathname: "/app/planeador/actividades", href: "/app/planeador/actividades" }
vi.stubGlobal("window", { location })

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

const { api, setAuthToken } = await import("@/lib/api-client")
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
