import { HttpResponse, delay, http } from "msw"

import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"
import { setUsuarioChatActual } from "@/mocks/realtime/chat"
import { dropAll, forgetHistory, issueTicket } from "@/mocks/realtime/server"

/**
 * `POST /comms/ws-ticket` (D-1.2 de `add-tiempo-real-gateway`): exige Bearer y
 * devuelve un ticket de un solo uso válido 30 s para abrir el socket simulado.
 */
export const realtimeHandlers = [
  http.post("/api/comms/ws-ticket", async ({ request }) => {
    await delay(80)
    const usuario = usuarioDe(request)
    if (!usuario) return HttpResponse.json({ message: "Sesión no válida." }, { status: 401 })
    setUsuarioChatActual(usuario.email)
    return HttpResponse.json(issueTicket(usuario.email))
  }),
]

// Atajos de consola para probar reconexión y `resync` a mano en el prototipo:
// `__realtimeMock.dropAll()`, `__realtimeMock.dropAll(4001)`, `__realtimeMock.forgetHistory()`.
if (typeof window !== "undefined") {
  Object.assign(window, { __realtimeMock: { dropAll, forgetHistory } })
}
