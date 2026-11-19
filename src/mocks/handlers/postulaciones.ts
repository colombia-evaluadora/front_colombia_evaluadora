import { delay, http, HttpResponse } from "msw"

import {
  anular,
  cambiarCupo,
  cambiarEspecialidad,
  liberar,
  listarPostulaciones,
  matricular,
  obtenerPostulacion,
  opcionesPostulacion,
  postular,
  previaEspecialidad,
  previaMatricula,
  principalesPostulables,
} from "@/mocks/db/postulaciones"
import { CATALOGOS_MATRICULA_NUEVOS } from "@/mocks/db/metodologia"

const BASE = "*/api/eval-col/cobertura-academica/matricula-complementaria/postulaciones"
const ESPECIALIDAD = "*/api/eval-col/cobertura-academica/matricula/:id/complementaria/especialidad"

type Res = { error: string; status: number } | { data: unknown }
const responder = (r: Res) =>
  "error" in r ? HttpResponse.json({ message: r.error }, { status: r.status }) : HttpResponse.json({ rows: r.data == null ? [] : [r.data] })

const param = (request: Request, k: string) => new URL(request.url).searchParams.get(k)

// Rutas estáticas antes que las de `:id`.
export const postulacionesHandlers = [
  http.post(`${BASE}/query`, async ({ request }) => {
    await delay(250)
    const b = (await request.json()) as { SEARCH: string | null; FK_CONVOCATORIA: number | null; GRADO: string | null; PAGE_INDEX: number; PAGE_SIZE: number }
    return HttpResponse.json({
      rows: listarPostulaciones({ search: b.SEARCH, convocatoria: b.FK_CONVOCATORIA, grado: b.GRADO, pageIndex: b.PAGE_INDEX, pageSize: b.PAGE_SIZE }),
    })
  }),
  http.get(`${BASE}/principales`, async ({ request }) => {
    await delay(200)
    return HttpResponse.json({ rows: principalesPostulables(param(request, "Q") ?? "") })
  }),
  http.get(`${BASE}/opciones`, async ({ request }) => {
    await delay(200)
    return HttpResponse.json({ rows: [opcionesPostulacion(Number(param(request, "FK_MATRICULA")))] })
  }),
  http.post(BASE, async ({ request }) => {
    await delay(400)
    return responder(postular((await request.json()) as Parameters<typeof postular>[0]))
  }),
  http.put(`${BASE}/:id/cupo`, async ({ params, request }) => {
    await delay(400)
    const b = (await request.json()) as { FK_CUPO: number; LISTA_ESPERA: "S" | "N" }
    return responder(cambiarCupo(Number(params.id), b.FK_CUPO, b.LISTA_ESPERA === "S"))
  }),
  http.put(`${BASE}/:id/anular`, async ({ params, request }) => {
    await delay(300)
    const b = (await request.json()) as { FK_TLV_MOTIVO_ANULACION: number }
    const motivo = CATALOGOS_MATRICULA_NUEVOS.MOTIVO_ANULACION_POSTULACION.find((m) => m.pk_lista_valor === b.FK_TLV_MOTIVO_ANULACION)
    if (!motivo) return HttpResponse.json({ message: "Elija el motivo de anulación." }, { status: 400 })
    return responder(anular(Number(params.id), motivo.nombre))
  }),
  http.put(`${BASE}/:id/liberar`, async ({ params }) => {
    await delay(300)
    return responder(liberar(Number(params.id)))
  }),
  http.get(`${BASE}/:id/matricula/previa`, async ({ params }) => {
    await delay(200)
    return responder(previaMatricula(Number(params.id)))
  }),
  http.post(`${BASE}/:id/matricula`, async ({ params }) => {
    await delay(400)
    return responder(matricular(Number(params.id)))
  }),
  http.get(`${BASE}/:id`, async ({ params }) => {
    await delay(200)
    const p = obtenerPostulacion(Number(params.id))
    return p ? HttpResponse.json({ rows: [p] }) : HttpResponse.json({ message: "No se encontró la postulación." }, { status: 404 })
  }),
  http.get(`${ESPECIALIDAD}/previa`, async ({ params }) => {
    await delay(200)
    return HttpResponse.json({ rows: [previaEspecialidad(Number(params.id))] })
  }),
  http.put(ESPECIALIDAD, async ({ params, request }) => {
    await delay(400)
    const b = (await request.json()) as { FK_ESPECIALIDAD: number }
    return responder(cambiarEspecialidad(Number(params.id), b.FK_ESPECIALIDAD))
  }),
]
