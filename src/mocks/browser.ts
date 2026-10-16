import { http, HttpResponse } from "msw"
import { setupWorker } from "msw/browser"
import { handlers } from "@/mocks/handlers"

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
 * - `"conflict"`: las escrituras de asistencia y planilla responden 409
 *   `OFFLINE_CONFLICT` (CAS de la Fase 2 offline, sso V137/V138), con el
 *   valor actual en `detail`; el resto sigue normal.
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

const faultHandlers = [
  http.all("/api/*", () => {
    const fault = currentFault()
    if (fault === "network") return HttpResponse.error()
    if (fault === "server") return HttpResponse.json({ status: "DOWN" }, { status: 503 })
  }),
  http.post("/api/eval-col/asistencias/registrar", () => conflictFault()),
  http.patch("/api/eval-col/asistencias/:id", () => conflictFault()),
  http.put("/api/eval-col/planeador/actividades/estudiantes/:id/calificar", () => conflictFault()),
]

export const worker = setupWorker(...faultHandlers, ...handlers)
