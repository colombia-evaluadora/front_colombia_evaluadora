import { http, HttpResponse, delay } from "msw"

import { especialidadesDb, nextEnfasisId } from "@/mocks/db/academic-period/especialidades"

export const especialidadesHandlers = [
  // `GET /eval-col/areas/:ID/especialidades` (`fn_especialidad_enfasis_listar`).
  // El `:ID` real es el período académico (el backend resuelve el
  // establecimiento a partir de él); el mock ignora el id y devuelve el
  // catálogo completo, igual que haría el backend para cualquier
  // establecimiento de prueba.
  http.get("/api/eval-col/areas/:periodoId/especialidades", async () => {
    await delay(150)
    return HttpResponse.json({ rows: especialidadesDb })
  }),

  // ⚠️ Endpoints de énfasis todavía sin backend real (se están armando en
  // paralelo) — este mock simula el contrato acordado con el front.
  http.post("/api/eval-col/enfasis", async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { NOMBRE: string }
    const id = nextEnfasisId()
    especialidadesDb.push({
      id,
      nombre: body.NOMBRE,
      codigo: body.NOMBRE.slice(0, 3).toUpperCase(),
      origen: "ENFASIS",
    })
    return HttpResponse.json({ rows: [{ fn_enfasis_crear: id }] })
  }),

  http.put("/api/eval-col/enfasis/:id", async ({ request, params }) => {
    await delay(300)
    const body = (await request.json()) as { NOMBRE: string }
    const index = especialidadesDb.findIndex(
      (row) => String(row.id) === String(params.id)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Énfasis no encontrado." },
        { status: 404 }
      )
    }
    especialidadesDb[index] = { ...especialidadesDb[index], nombre: body.NOMBRE }
    return HttpResponse.json({ rows: [{ fn_enfasis_actualizar: especialidadesDb[index].id }] })
  }),

  http.put("/api/eval-col/enfasis/eliminar/:id", async ({ params }) => {
    await delay(300)
    const index = especialidadesDb.findIndex(
      (row) => String(row.id) === String(params.id)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Énfasis no encontrado." },
        { status: 404 }
      )
    }
    const [removed] = especialidadesDb.splice(index, 1)
    return HttpResponse.json({ rows: [{ fn_enfasis_soft_delete: removed.id }] })
  }),
]
