/**
 * Worker de producción: sirve la SPA y reenvía `/api/*` al gateway del SSO.
 *
 * En desarrollo ese reenvío lo hace el dev server de Vite
 * (`server.proxy["/api"]` en vite.config.ts). En producción no existía: el
 * Worker solo declaraba `assets`, así que `/api` caía en el manejo de estáticos
 * y la sesión nunca podía abrirse —
 *   POST /api/auth/login      → 405 (servir assets solo admite GET/HEAD)
 *   GET  /api/eval-col/roles  → 200 con index.html, por `not_found_handling:
 *                               single-page-application`
 * — y el cliente reventaba al parsear HTML como JSON.
 *
 * Se conserva el MISMO origen que el front en vez de apuntar el navegador
 * directo al gateway, por dos motivos que no son de estilo:
 *   - el gateway habla HTTP plano y el sitio es HTTPS: el navegador bloquearía
 *     la llamada por mixed content antes de emitirla;
 *   - la sesión vive en la cookie httpOnly `sso_refresh`, que cross-origin
 *     exigiría CORS con credenciales y `SameSite=None`.
 *
 * Solo `/api` viaja al gateway, igual que en dev: el front no usa ninguna otra
 * ruta fuera de ese prefijo (`api-client.ts` monta todo sobre `env.API_URL`).
 */

/** Única ruta `/api` que acepta upgrade a WebSocket. */
const WS_PATH = "/api/comms/ws"

export default {
  /**
   * @param {Request} request
   * @param {{ API_PROXY_TARGET: string, ASSETS: { fetch: (r: Request) => Promise<Response> } }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url)

    // `run_worker_first` ya enruta solo `/api/*` hacia acá; esto es la red de
    // seguridad por si esa configuración cambia.
    if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request)
    }

    const target = new URL(env.API_PROXY_TARGET)
    target.pathname = url.pathname
    target.search = url.search

    // Tiempo real (comms-service, PR SSO #692): `GET /api/comms/ws?ticket=…`
    // con `Upgrade: websocket`. `run_worker_first: ["/api/*"]` ya lo trae
    // acá; el upgrade se reenvía tal cual y se devuelve la respuesta 101 SIN
    // reconstruirla (`new Response` no admite 101 ni conserva `webSocket`).
    // Cloudflare hace el puente wss (navegador) ↔ ws/wss (gateway). El socket
    // lo autentica el ticket de un solo uso; el JWT no viaja en la URL.
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      if (url.pathname !== WS_PATH) return new Response("Not Found", { status: 404 })
      return fetch(new Request(target, request))
    }

    // `redirect: "manual"` para que un 3xx del gateway llegue tal cual al
    // navegador; si el Worker lo siguiera, el cliente nunca vería la redirección
    // ni las cookies que la acompañan.
    const response = await fetch(new Request(target, request), { redirect: "manual" })

    // Se reconstruye para que la respuesta sea mutable río abajo. El body va como
    // stream y los `Set-Cookie` (incluido `sso_refresh`) se conservan.
    const proxied = new Response(response.body, response)
    // BE-10 (plan offline): ninguna respuesta de la API debe quedar en caches
    // HTTP (navegador, proxies, Cache API del service worker). Se toca solo
    // este header: `headers.set` no altera los `Set-Cookie` copiados arriba.
    proxied.headers.set("Cache-Control", "no-store")
    return proxied
  },
}
