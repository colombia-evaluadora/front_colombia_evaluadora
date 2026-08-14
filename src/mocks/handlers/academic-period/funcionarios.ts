import { http, HttpResponse, delay } from "msw"

import { funcionariosDb } from "@/mocks/db/academic-period/funcionarios"

// `fn_funcionario_sede_listar` (id_query 68) — no tenía NINGÚN mock; la
// pestaña de Grupos (resolución de director) y Asignación docente
// dependían de este catálogo y caían al mismo bug de logout que Criterio
// de promoción (request sin match → pasa al backend real → 401).
export const funcionariosHandlers = [
  http.get("/api/eval-col/sedes/:sedeId/funcionarios", async ({ request }) => {
    await delay(150)
    const filtro = new URL(request.url).searchParams.get("filtro")?.toLowerCase()
    const rows = filtro
      ? funcionariosDb.filter((f) => f.nombre.toLowerCase().includes(filtro))
      : funcionariosDb
    return HttpResponse.json({ rows })
  }),
]
