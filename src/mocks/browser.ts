import { getResponse, http, HttpResponse } from "msw"
import { setupWorker } from "msw/browser"
import { handlers } from "@/mocks/handlers"
import { hashString } from "@/lib/offline/content-hash"

/**
 * Fallas de red simuladas para los E2E de resiliencia (`e2e/`). MSW responde
 * desde el propio navegador, así que ni `page.route` de Playwright ni
 * `context.setOffline` cortan la API mockeada. Los tests escriben
 * `sessionStorage["msw:fault"]` (sobrevive a la recarga) y estos handlers,
 * antepuestos a los de dominio, lo leen en cada request:
 * - `"network"`: toda `/api/*` falla como `Network Error`.
 * - `"server"`: toda `/api/*` responde 503 JSON (gateway/eval-col caído).
 * - `"writes"`: solo las escrituras de asistencia y planilla fallan como
 *   `Network Error` (la respuesta se pierde); lecturas y heartbeat siguen bien.
 * - `"count"`: calificar celda responde 200 sin validar el pk y cuenta cuántas
 *   veces llegó cada uno en `sessionStorage["msw:calificar-count"]` (E2E de
 *   la outbox: 40 celdas una sola vez, dos pestañas sin duplicados).
 * - `"conflict"`: las escrituras de asistencia y planilla responden 409
 *   `OFFLINE_CONFLICT` (CAS de la Fase 2 offline, sso V137/V138), con el
 *   valor actual en `detail`; el resto sigue normal.
 * - `"planeador-writes"`: las escrituras de actividades y unidades del
 *   planeador (sagas de la Fase 3) fallan como `Network Error`.
 * Sin la clave no hacen nada (`return` → sigue el handler real).
 */
function currentFault(): string | null {
  try {
    return sessionStorage.getItem("msw:fault")
  } catch {
    return null
  }
}

function conflictFault() {
  if (currentFault() === "writes") return HttpResponse.error()
  if (currentFault() !== "conflict") return
  return HttpResponse.json(
    {
      code: "OFFLINE_CONFLICT",
      message: "El dato cambió en el servidor mientras estabas sin conexión.",
      detail: JSON.stringify({ current: 2, version: "2026-10-01T10:00:00.000000" }),
    },
    { status: 409 },
  )
}

function planeadorWritesFault() {
  if (currentFault() === "planeador-writes") return HttpResponse.error()
}

const faultHandlers = [
  http.all("/api/*", () => {
    const fault = currentFault()
    if (fault === "network") return HttpResponse.error()
    if (fault === "server") return HttpResponse.json({ status: "DOWN" }, { status: 503 })
  }),
  http.post("/api/eval-col/asistencias/registrar", () => conflictFault()),
  http.patch("/api/eval-col/asistencias/:id", () => conflictFault()),
  http.put("/api/eval-col/planeador/actividades/estudiantes/:id/calificar", ({ params }) => {
    if (currentFault() !== "count") return conflictFault()
    const counts = JSON.parse(sessionStorage.getItem("msw:calificar-count") ?? "{}") as Record<string, number>
    const pk = String(params.id)
    counts[pk] = (counts[pk] ?? 0) + 1
    sessionStorage.setItem("msw:calificar-count", JSON.stringify(counts))
    return HttpResponse.json({ rows: [{ calificacion: 100, solicitudes_pendientes: [] }] })
  }),
  http.post("/api/eval-col/planeador/unidades", () => planeadorWritesFault()),
  http.put("/api/eval-col/planeador/unidades/:id", () => planeadorWritesFault()),
  http.post("/api/eval-col/planeador/actividades", () => planeadorWritesFault()),
  http.put("/api/eval-col/planeador/actividades/:id", () => planeadorWritesFault()),
]

/**
 * Lecturas condicionales como el backend real (query-service, sso): toda
 * lectura JSON (GET, o POST sin `Idempotency-Key`) que responde 200 lleva
 * `ETag` = hash del cuerpo, y si la request trae ese mismo valor en
 * `If-None-Match` responde 304 sin cuerpo. Envuelve a los handlers de dominio
 * (`getResponse`) en vez de tocar cada uno. Los E2E cuentan los 304 de la
 * segunda preparación (`e2e/offline-prepare-incremental.spec.ts`).
 */
function etagMatches(header: string | null, etag: string): boolean {
  if (!header) return false
  const strip = (v: string) => v.trim().replace(/^W\//, "")
  return header.split(",").some((v) => strip(v) === strip(etag) || v.trim() === "*")
}

const etagHandler = http.all("/api/*", async ({ request }) => {
  const method = request.method.toUpperCase()
  if (method !== "GET" && !(method === "POST" && !request.headers.has("Idempotency-Key"))) return
  const response = await getResponse(handlers, request)
  if (!response) return
  const type = response.headers.get("content-type") ?? ""
  // Passthrough, streams (SSE), binarios y errores: tal cual.
  if (response.status !== 200 || !type.includes("json") || response.headers.has("x-msw-intention")) return response
  const body = await response.text()
  const etag = `"${hashString(body)}"`
  const headers = new Headers(response.headers)
  headers.set("ETag", etag)
  if (etagMatches(request.headers.get("If-None-Match"), etag)) {
    return new HttpResponse(null, { status: 304, headers: { ETag: etag } })
  }
  return new HttpResponse(body, { status: 200, headers })
})

export const worker = setupWorker(...faultHandlers, etagHandler, ...handlers)
