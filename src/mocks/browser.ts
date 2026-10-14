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
 * Sin la clave no hacen nada (`return` → sigue el handler real).
 */
function currentFault(): string | null {
  try {
    return sessionStorage.getItem("msw:fault")
  } catch {
    return null
  }
}

const faultHandlers = [
  http.all("/api/*", () => {
    const fault = currentFault()
    if (fault === "network") return HttpResponse.error()
    if (fault === "server") return HttpResponse.json({ status: "DOWN" }, { status: 503 })
  }),
]

export const worker = setupWorker(...faultHandlers, ...handlers)
