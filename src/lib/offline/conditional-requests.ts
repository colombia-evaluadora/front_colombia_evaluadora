/**
 * Lecturas condicionales (ETag / `If-None-Match` → 304) para "Preparar sin
 * conexión" incremental (`add-offline-preparar-incremental`).
 *
 * El backend (query-service, sso) manda `ETag` = hash del cuerpo en cada
 * lectura GET o POST de consulta y responde 304 sin cuerpo si el cliente
 * manda el mismo valor en `If-None-Match`. El problema es que una query de
 * TanStack no es UNA request: su `queryFn` puede pedir varias y mapearlas, y
 * lo que se guarda en el equipo es el resultado ya mapeado, no los cuerpos.
 * Por eso el 304 no se usa dentro de la `queryFn` (no habría cuerpo que
 * devolverle) sino ANTES de correrla:
 *
 * 1. Cuando "Preparar" baja una query, se GRABAN las lecturas que hizo su
 *    `queryFn` (método, URL, cuerpo y `ETag` de la respuesta): son sus
 *    "validadores" y se guardan junto a la fila de la query (`query-persister`).
 * 2. En la siguiente preparación, si la query ya está en el equipo, se repiten
 *    esas lecturas con `If-None-Match` (`probeValidators`). Si TODAS responden
 *    304, la `queryFn` daría exactamente el mismo resultado: no se corre, no
 *    se baja nada, no se reescribe nada; solo se anota "verificado a las…".
 * 3. Si alguna responde 200 (cambió), se corre la `queryFn` normal. La
 *    respuesta 200 del sondeo no se tira: queda un momento en `stash` y la
 *    misma request de la `queryFn` la toma sin volver a la red.
 *
 * La grabación es por ventana de tiempo (las tareas de Preparar van en serie):
 * se graban las lecturas que ARRANCAN mientras corre la tarea. Si el docente
 * navega a la vez, alguna lectura de la pantalla puede colarse en los
 * validadores; no rompe nada (son lecturas: repetirlas es inocuo y, si
 * cambiaron, solo provocan una descarga de más). Lo que nunca se graba ni se
 * repite es una escritura.
 *
 * Una lectura sin `ETag` (otro microservicio, backend viejo) deja la query
 * sin validadores: se baja completa como siempre.
 */
import Axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Grabación de validadores a la que pertenece la request (interno). */
    recordingId?: number
    /** Es una lectura que se puede repetir con `If-None-Match` (interno). */
    recordingRead?: boolean
  }
}

export interface RecordedRequest {
  method: string
  /** URL absoluta dentro del origen (`/api/eval-col/...?a=1`). */
  url: string
  /** Cuerpo JSON tal como salió (string) o `undefined` en un GET. */
  data?: string
  etag: string
}

export type ProbeVerdict = "unchanged" | "changed" | "error"

/** Más lecturas que esto en una sola query: no vale la pena sondearla. */
export const MAX_VALIDATORS = 25
/** Cuánto vive una respuesta 200 de un sondeo esperando a su `queryFn`. */
const STASH_TTL_MS = 60_000
const STASH_MAX = 16

interface Recording {
  id: number
  requests: RecordedRequest[]
  unknown: boolean
}

interface Stashed {
  data: unknown
  headers: Record<string, string>
  at: number
}

let instance: AxiosInstance | null = null
let probeClient: AxiosInstance | null = null
let active: Recording | null = null
let nextRecordingId = 1
const stash = new Map<string, Stashed>()

export interface ConditionalStats {
  /** Requests enviadas con `If-None-Match`. */
  conditional: number
  /** De esas, cuántas volvieron 304 (sin cuerpo). */
  notModified: number
  /** Respuestas de un sondeo que se reusaron en la descarga (no se pidieron dos veces). */
  reused: number
}

let stats: ConditionalStats = { conditional: 0, notModified: 0, reused: 0 }

export function getConditionalStats(): ConditionalStats {
  return { ...stats }
}

/** Al empezar una corrida: contadores en cero y sin sondeos recordados. */
export function resetConditionalStats(): void {
  stats = { conditional: 0, notModified: 0, reused: 0 }
  probeMemo.clear()
}

// ---- Qué es una lectura ----------------------------------------------------------

function isReadConfig(config: { method?: string; url?: string; readOnly?: boolean; background?: boolean; data?: unknown }) {
  if (config.background) return false
  if (typeof FormData !== "undefined" && config.data instanceof FormData) return false
  const method = (config.method ?? "get").toLowerCase()
  if (method === "get") return true
  if (method !== "post") return false
  return Boolean(config.readOnly) || /\/query(?:[/?]|$)/.test(config.url ?? "")
}

function bodyString(data: unknown): string {
  if (data === undefined || data === null) return ""
  return typeof data === "string" ? data : JSON.stringify(data)
}

function keyOf(method: string, url: string, data: string | undefined): string {
  return `${method.toUpperCase()} ${url} ${data ?? ""}`
}

function headerValue(headers: unknown, name: string): string | undefined {
  if (!headers) return undefined
  if (headers instanceof AxiosHeaders) {
    const value = headers.get(name)
    return value == null ? undefined : String(value)
  }
  const record = headers as Record<string, unknown>
  const value = record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()]
  return value == null ? undefined : String(value)
}

// ---- Interceptores de `api` --------------------------------------------------------

/**
 * Engancha la grabación y el reuso de respuestas en la instancia `api`.
 * `probeInterceptors` son los request interceptors que necesita el cliente
 * de sondeo (Bearer y versión): se pasan acá para no importar `api-client`
 * (que importa este módulo) y armar un ciclo.
 */
export function installConditionalRequests(
  api: AxiosInstance,
  probeInterceptors: ((config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig)[] = [],
): void {
  instance = api
  probeClient = Axios.create({ timeout: api.defaults.timeout })
  for (const interceptor of probeInterceptors) probeClient.interceptors.request.use(interceptor)
  api.interceptors.request.use(conditionalRequestInterceptor)
}

export function conditionalRequestInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (!instance) return config
  const read = isReadConfig(config)
  // Toda request de la ventana se marca: una que no sea lectura repetible
  // (o que falle) invalida la grabación, porque el sondeo no la cubriría.
  if (active) {
    config.recordingId = active.id
    config.recordingRead = read
  }
  // Fuera de Preparar el stash está vacío: no se arma la clave.
  if (!read || stash.size === 0) return config
  const url = instance.getUri(config)
  const hit = takeStash(keyOf(config.method ?? "get", url, bodyString(config.data) || undefined))
  if (hit) {
    stats.reused++
    // La respuesta 200 del sondeo, sin volver a la red. Pasa por los response
    // interceptors como cualquier otra (desenvuelve, graba el ETag).
    config.adapter = async (cfg) =>
      ({
        data: hit.data,
        status: 200,
        statusText: "OK",
        headers: AxiosHeaders.from(hit.headers),
        config: cfg,
        request: undefined,
      }) as AxiosResponse
  }
  return config
}

/** Response interceptor de `api`: graba el ETag si la request es de la tarea en curso. */
export function conditionalResponseInterceptor(response: AxiosResponse): AxiosResponse {
  const rec = active
  const config = response.config
  if (!rec || !instance || config?.recordingId !== rec.id) return response
  const etag = headerValue(response.headers, "etag")
  if (!config.recordingRead || !etag || rec.requests.length >= MAX_VALIDATORS) {
    rec.unknown = true
    return response
  }
  rec.requests.push({
    method: (config.method ?? "get").toUpperCase(),
    url: instance.getUri(config),
    data: typeof config.data === "string" && config.data !== "" ? config.data : undefined,
    etag,
  })
  return response
}

/** Una request de la ventana que falló: la grabación no sirve para sondear. */
export function conditionalErrorInterceptor(error: unknown): Promise<never> {
  const config = (error as { config?: { recordingId?: number } } | null)?.config
  if (active && config?.recordingId === active.id) active.unknown = true
  return Promise.reject(error)
}

// ---- Grabación por tarea -------------------------------------------------------------

export interface RecordingHandle {
  readonly id: number
}

/** Empieza a grabar las lecturas que arranquen desde ahora (una sola a la vez). */
export function beginRecording(): RecordingHandle {
  const rec: Recording = { id: nextRecordingId++, requests: [], unknown: false }
  active = rec
  return rec
}

/**
 * Termina la grabación. `null` = no se puede sondear esta query (alguna
 * lectura vino sin ETag, eran demasiadas o no hubo ninguna).
 */
export function endRecording(handle: RecordingHandle): RecordedRequest[] | null {
  const rec = handle as Recording
  if (active === rec) active = null
  if (rec.unknown || rec.requests.length === 0) return null
  // La misma lectura dos veces (la pantalla y la tarea) se sondea una vez.
  const unique = new Map<string, RecordedRequest>()
  for (const r of rec.requests) unique.set(keyOf(r.method, r.url, r.data), r)
  return [...unique.values()]
}

// ---- Sondeo ------------------------------------------------------------------------

function putStash(key: string, value: Stashed) {
  stash.set(key, value)
  while (stash.size > STASH_MAX) stash.delete(stash.keys().next().value as string)
}

function takeStash(key: string): Stashed | undefined {
  const hit = stash.get(key)
  if (!hit) return undefined
  stash.delete(key)
  return Date.now() - hit.at <= STASH_TTL_MS ? hit : undefined
}

type ProbeResult = "not-modified" | "modified" | "error"

/**
 * Sondeos de la corrida en curso, por request: si dos queries comparten una
 * lectura (un catálogo dentro de dos `queryFn`), se pregunta una sola vez.
 * Se vacía al empezar cada corrida (`resetConditionalStats`).
 */
const probeMemo = new Map<string, Promise<ProbeResult>>()

function probeOne(v: RecordedRequest): Promise<ProbeResult> {
  const key = `${keyOf(v.method, v.url, v.data)} ${v.etag}`
  const memo = probeMemo.get(key)
  if (memo) return memo
  const promise = (async (): Promise<ProbeResult> => {
    if (!probeClient) return "error"
    stats.conditional++
    let response: AxiosResponse
    try {
      response = await probeClient.request({
        method: v.method,
        url: v.url,
        data: v.data,
        headers: {
          "If-None-Match": v.etag,
          ...(v.data !== undefined && { "Content-Type": "application/json" }),
        },
        validateStatus: (status) => status === 304 || (status >= 200 && status < 300),
      })
    } catch {
      return "error"
    }
    if (response.status === 304) {
      stats.notModified++
      return "not-modified"
    }
    const headers: Record<string, string> = {}
    for (const [name, value] of Object.entries(AxiosHeaders.from(response.headers as never).toJSON())) {
      if (typeof value === "string") headers[name] = value
    }
    putStash(keyOf(v.method, v.url, v.data), { data: response.data, headers, at: Date.now() })
    return "modified"
  })()
  probeMemo.set(key, promise)
  return promise
}

/**
 * Repite las lecturas de una query con `If-None-Match` (en paralelo: son
 * independientes). Nunca tira: un error (red, 401, 5xx) es `"error"` y quien
 * llama baja la query normal (que reporta el error como siempre).
 */
export async function probeValidators(validators: readonly RecordedRequest[]): Promise<ProbeVerdict> {
  if (!probeClient || validators.length === 0) return "error"
  const results = await Promise.all(validators.map(probeOne))
  if (results.includes("error")) return "error"
  return results.includes("modified") ? "changed" : "unchanged"
}

/** Solo para tests. */
export function __resetConditionalForTests() {
  instance = null
  probeClient = null
  active = null
  stash.clear()
  probeMemo.clear()
  resetConditionalStats()
}
