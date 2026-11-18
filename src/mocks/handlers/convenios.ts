import { delay, http, HttpResponse } from "msw"

import {
  cambiarEstado,
  crearConvenios,
  listarConvenios,
  opcionesConvenio,
  previaAceptar,
  previaRenovar,
  renovar,
} from "@/mocks/db/convenios"

const BASE = "*/api/eval-col/cobertura-academica/matricula-complementaria/convenios"

type Res = { error: string; status: number } | { data: unknown }
const responder = (r: Res) =>
  "error" in r
    ? HttpResponse.json({ message: r.error }, { status: r.status })
    : HttpResponse.json({ rows: r.data == null ? [] : Array.isArray(r.data) ? r.data : [r.data] })

const motivoDe = async (request: Request) => ((await request.json()) as { MOTIVO: string }).MOTIVO ?? ""

// Rutas estáticas antes que las de `:id`.
export const conveniosHandlers = [
  http.post(`${BASE}/query`, async ({ request }) => {
    await delay(250)
    const b = (await request.json()) as { SEARCH: string | null; ANIO: number | null; PAGE_INDEX: number; PAGE_SIZE: number }
    return HttpResponse.json({ rows: listarConvenios({ search: b.SEARCH, anio: b.ANIO, pageIndex: b.PAGE_INDEX, pageSize: b.PAGE_SIZE }) })
  }),
  http.get(`${BASE}/opciones`, async () => {
    await delay(200)
    return HttpResponse.json({ rows: [opcionesConvenio()] })
  }),
  http.post(BASE, async ({ request }) => {
    await delay(400)
    return responder(crearConvenios((await request.json()) as Parameters<typeof crearConvenios>[0]))
  }),
  http.get(`${BASE}/:id/aceptar/previa`, async ({ params }) => {
    await delay(200)
    return HttpResponse.json({ rows: [previaAceptar(Number(params.id))] })
  }),
  http.put(`${BASE}/:id/aceptar`, async ({ params }) => {
    await delay(400)
    return responder(cambiarEstado(Number(params.id), "ACEPTADO", null, ["PROPUESTO"]))
  }),
  http.put(`${BASE}/:id/rechazar`, async ({ params, request }) => {
    await delay(400)
    return responder(cambiarEstado(Number(params.id), "RECHAZADO", await motivoDe(request), ["PROPUESTO"]))
  }),
  http.put(`${BASE}/:id/finalizar`, async ({ params, request }) => {
    await delay(400)
    return responder(cambiarEstado(Number(params.id), "FINALIZADO", await motivoDe(request), ["PROPUESTO", "ACEPTADO"]))
  }),
  http.get(`${BASE}/:id/renovar/previa`, async ({ params }) => {
    await delay(200)
    return HttpResponse.json({ rows: [previaRenovar(Number(params.id))] })
  }),
  http.post(`${BASE}/:id/renovar`, async ({ params, request }) => {
    await delay(400)
    const b = (await request.json()) as { PERIODOS: number[] }
    return responder(renovar(Number(params.id), b.PERIODOS))
  }),
]
