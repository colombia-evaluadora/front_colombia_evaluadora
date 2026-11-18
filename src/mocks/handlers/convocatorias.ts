import { delay, http, HttpResponse } from "msw"

import {
  eliminarConvocatoria,
  guardarConvocatoria,
  listaSorteo,
  listarConvocatorias,
  obtenerConvocatoria,
  opcionesConvocatoria,
  resultadoSeleccion,
  seleccionar,
  seleccionCupo,
} from "@/mocks/db/convocatorias"

const BASE = "*/api/eval-col/cobertura-academica/matricula-complementaria/convocatorias"

type Resultado = { error: string; status: number } | { data: unknown }
const responder = (r: Resultado) =>
  "error" in r ? HttpResponse.json({ message: r.error }, { status: r.status }) : HttpResponse.json({ rows: r.data == null ? [] : [r.data] })

const cupoDe = (request: Request) => Number(new URL(request.url).searchParams.get("FK_CUPO"))

// Rutas estáticas antes que las de `:id` (MSW usa el primer match).
export const convocatoriasHandlers = [
  http.post(`${BASE}/query`, async ({ request }) => {
    await delay(250)
    const body = (await request.json()) as { PAGE_INDEX: number; PAGE_SIZE: number; SORTING?: { DESC: boolean } }
    return HttpResponse.json({ rows: listarConvocatorias(body.PAGE_INDEX, body.PAGE_SIZE, body.SORTING?.DESC ?? true) })
  }),
  http.get(`${BASE}/opciones`, async ({ request }) => {
    await delay(200)
    const anio = Number(new URL(request.url).searchParams.get("ANIO"))
    return HttpResponse.json({ rows: [opcionesConvocatoria(anio)] })
  }),
  http.post(BASE, async ({ request }) => {
    await delay(400)
    return responder(guardarConvocatoria(null, (await request.json()) as Parameters<typeof guardarConvocatoria>[1]))
  }),
  http.get(`${BASE}/:id/seleccion`, async ({ params, request }) => {
    await delay(250)
    return responder(seleccionCupo(Number(params.id), cupoDe(request)))
  }),
  http.post(`${BASE}/:id/seleccionar`, async ({ params, request }) => {
    await delay(500)
    const body = (await request.json()) as { FK_CUPO: number }
    return responder(seleccionar(Number(params.id), body.FK_CUPO))
  }),
  http.get(`${BASE}/:id/resultado`, async ({ params }) => {
    await delay(250)
    return responder(resultadoSeleccion(Number(params.id)))
  }),
  http.get(`${BASE}/:id/sorteo`, async ({ params, request }) => {
    await delay(250)
    return responder(listaSorteo(Number(params.id), cupoDe(request)))
  }),
  http.put(`${BASE}/:id/eliminar`, async ({ params }) => {
    await delay(300)
    return responder(eliminarConvocatoria(Number(params.id)))
  }),
  http.put(`${BASE}/:id`, async ({ params, request }) => {
    await delay(400)
    return responder(guardarConvocatoria(Number(params.id), (await request.json()) as Parameters<typeof guardarConvocatoria>[1]))
  }),
  http.get(`${BASE}/:id`, async ({ params }) => {
    await delay(200)
    const c = obtenerConvocatoria(Number(params.id))
    return c ? HttpResponse.json({ rows: [c] }) : HttpResponse.json({ message: "No se encontró la convocatoria." }, { status: 404 })
  }),
]
