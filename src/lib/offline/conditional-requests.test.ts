import Axios, { AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  __resetConditionalForTests,
  beginRecording,
  conditionalErrorInterceptor,
  conditionalResponseInterceptor,
  endRecording,
  getConditionalStats,
  installConditionalRequests,
  probeValidators,
} from "@/lib/offline/conditional-requests"

// Servidor de mentira: ETag = contenido; responde 304 si coincide con
// `If-None-Match`. Cuenta cuántas veces se le pidió cada URL.
function fakeServer(bodies: Record<string, unknown>, { etags = true } = {}) {
  const hits: { url: string; status: number }[] = []
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const url = Axios.getUri(config)
    const body = bodies[url]
    const etag = `"${JSON.stringify(body)}"`
    const ifNoneMatch = AxiosHeaders.from(config.headers).get("If-None-Match")
    const notModified = ifNoneMatch === etag
    const status = notModified ? 304 : 200
    hits.push({ url, status })
    const response: AxiosResponse = {
      data: notModified ? "" : JSON.stringify(body),
      status,
      statusText: notModified ? "Not Modified" : "OK",
      headers: AxiosHeaders.from({ ...(etags && { etag }), "content-type": "application/json" }),
      config,
    }
    const validate = config.validateStatus ?? ((s: number) => s >= 200 && s < 300)
    if (!validate(status)) throw new Axios.AxiosError("status", undefined, config, null, response)
    return response
  })
  return { adapter, hits, bodies }
}

function setup(bodies: Record<string, unknown>, options?: { etags?: boolean }) {
  const server = fakeServer(bodies, options)
  Axios.defaults.adapter = server.adapter
  const api = Axios.create({ baseURL: "/api" })
  installConditionalRequests(api)
  api.interceptors.response.use(conditionalResponseInterceptor, conditionalErrorInterceptor)
  api.interceptors.response.use((r) => r.data)
  return { api, server }
}

beforeEach(() => {
  __resetConditionalForTests()
})

describe("lecturas condicionales (ETag / 304)", () => {
  it("graba las lecturas con su ETag mientras corre la tarea", async () => {
    const { api } = setup({ "/api/eval-col/a/query": { rows: [1] }, "/api/eval-col/b": { rows: [2] } })
    const rec = beginRecording()
    await api.post("/eval-col/a/query", { X: 1 })
    await api.get("/eval-col/b")
    const validators = endRecording(rec)
    expect(validators).toEqual([
      { method: "POST", url: "/api/eval-col/a/query", data: '{"X":1}', etag: `"${JSON.stringify({ rows: [1] })}"` },
      { method: "GET", url: "/api/eval-col/b", data: undefined, etag: `"${JSON.stringify({ rows: [2] })}"` },
    ])
  })

  it("una escritura o una lectura fallida en la ventana invalida la grabación (nunca se repite una escritura)", async () => {
    const { api } = setup({ "/api/eval-col/b": { rows: [2] } })
    const rec = beginRecording()
    await api.get("/eval-col/b")
    await api.put("/eval-col/b", { Y: 1 })
    expect(endRecording(rec)).toBeNull()
  })

  it("sin cambios: el sondeo recibe 304 sin cuerpo y no hace falta bajar nada", async () => {
    const { api, server } = setup({ "/api/eval-col/a/query": { rows: [1] } })
    const rec = beginRecording()
    await api.post("/eval-col/a/query", { X: 1 })
    const validators = endRecording(rec)!
    server.hits.length = 0

    expect(await probeValidators(validators)).toBe("unchanged")
    expect(server.hits).toEqual([{ url: "/api/eval-col/a/query", status: 304 }])
    expect(getConditionalStats()).toMatchObject({ conditional: 1, notModified: 1 })
  })

  it("con cambios: el 200 del sondeo se reusa en la descarga (no se pide dos veces)", async () => {
    const { api, server } = setup({ "/api/eval-col/a/query": { rows: [1] } })
    const rec = beginRecording()
    await api.post("/eval-col/a/query", { X: 1 })
    const validators = endRecording(rec)!
    server.bodies["/api/eval-col/a/query"] = { rows: [1, 2] }
    server.hits.length = 0

    expect(await probeValidators(validators)).toBe("changed")
    const rec2 = beginRecording()
    const data = await api.post("/eval-col/a/query", { X: 1 })
    expect(data).toEqual({ rows: [1, 2] })
    // Una sola request a la red (la del sondeo) y el ETag nuevo grabado.
    expect(server.hits).toEqual([{ url: "/api/eval-col/a/query", status: 200 }])
    expect(endRecording(rec2)?.[0].etag).toBe(`"${JSON.stringify({ rows: [1, 2] })}"`)
    expect(getConditionalStats().reused).toBe(1)
  })

  it("una lectura sin ETag deja la query sin validadores (se baja completa)", async () => {
    const { api } = setup({ "/api/eval-col/a/query": { rows: [1] } }, { etags: false })
    const rec = beginRecording()
    await api.post("/eval-col/a/query", { X: 1 })
    expect(endRecording(rec)).toBeNull()
  })

  it("un error del sondeo es 'error' (no tira): la tarea baja normal", async () => {
    Axios.defaults.adapter = async () => {
      throw new Error("Network Error")
    }
    installConditionalRequests(Axios.create({ baseURL: "/api" }))
    expect(await probeValidators([{ method: "GET", url: "/api/x", etag: '"1"' }])).toBe("error")
  })
})
