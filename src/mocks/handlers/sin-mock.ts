import { http, HttpResponse } from "msw"

/**
 * Red de seguridad de los datos de prueba: va AL FINAL de los handlers y atiende toda `/api/*` que
 * ningún mock respondió.
 *
 * Sin ella, una ruta sin mock salía al backend real por el proxy de Vite. Allá el token de prueba no
 * vale: respondía 401, el cliente lo tomaba como sesión vencida y mandaba al login. Al volver, la
 * pantalla repetía la consulta y se armaba un bucle (Inscritos, el Observador…). Además, una escritura
 * sin mock podía llegar al servidor de verdad.
 *
 * - Lecturas (GET, o POST de consulta: `/query`, `/consultar`, `/selector`, `/opciones`…): responden
 *   vacío, con el envelope `{ rows: [] }` que desenvuelve `evalCol`. La pantalla carga y muestra su
 *   estado vacío.
 * - Escrituras: 501 con un mensaje claro; no se simula un guardado que no pasó.
 *
 * Cada caso deja un aviso en la consola con el método y la ruta: es un mock que falta escribir.
 */
const LECTURA_POST = /\/(query|consultar|selector|buscar|listar|opciones|resolver)(\/|$)|\/query\//

export const sinMockHandlers = [
  // Solo rutas que EMPIEZAN con /api/: `*/api/*` atrapaba también los módulos de Vite
  // (`/src/features/auth/api/...`) y les respondía JSON en lugar del código.
  http.all(/^https?:\/\/[^/]+\/api\//, ({ request }) => {
    const url = new URL(request.url)
    const lectura = request.method === "GET" || (request.method === "POST" && LECTURA_POST.test(url.pathname))
    console.warn(`[MSW] Sin mock (${lectura ? "lectura vacía" : "escritura rechazada"}): ${request.method} ${url.pathname}`)
    if (lectura) return HttpResponse.json({ rows: [] })
    return HttpResponse.json(
      { message: "Esta acción no tiene datos de prueba todavía." },
      { status: 501 },
    )
  }),
]
