import { HttpResponse, http } from "msw"

/**
 * Heartbeat de conectividad (BE-4, `lib/offline/connectivity.ts`). Responde
 * JSON con `status` (campo que valida el store para descartar portales
 * cautivos) y sin cache, como el endpoint real.
 */
export const healthHandlers = [
  http.get("/api/eval-col/health", () =>
    HttpResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } }),
  ),
]
