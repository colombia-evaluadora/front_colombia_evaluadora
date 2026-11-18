import { delay, http, HttpResponse } from "msw"

import { asignarGrupo, gruposContinuidad, listarContinuidad } from "@/mocks/db/continuidad"

const BASE = "*/api/eval-col/cobertura-academica/matricula-complementaria/continuidad"

export const continuidadHandlers = [
  http.post(`${BASE}/query`, async ({ request }) => {
    await delay(250)
    const b = (await request.json()) as {
      SEARCH: string | null
      FK_CONVOCATORIA: number | null
      ESTADO: string | null
      ESPECIALIDAD: string | null
      PAGE_INDEX: number
      PAGE_SIZE: number
    }
    return HttpResponse.json({
      rows: listarContinuidad({
        search: b.SEARCH,
        convocatoria: b.FK_CONVOCATORIA,
        estado: b.ESTADO,
        especialidad: b.ESPECIALIDAD,
        pageIndex: b.PAGE_INDEX,
        pageSize: b.PAGE_SIZE,
      }),
    })
  }),
  http.get(`${BASE}/:id/grupos`, async ({ params }) => {
    await delay(200)
    return HttpResponse.json({ rows: gruposContinuidad(Number(params.id)) })
  }),
  http.post(`${BASE}/:id/asignar-grupo`, async ({ params, request }) => {
    await delay(400)
    const b = (await request.json()) as { FK_TGRUPO: number }
    const r = asignarGrupo(Number(params.id), b.FK_TGRUPO)
    return "error" in r ? HttpResponse.json({ message: r.error }, { status: r.status }) : HttpResponse.json({ rows: [r.data] })
  }),
]
