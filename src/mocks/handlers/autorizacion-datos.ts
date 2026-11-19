import { http, HttpResponse, delay } from "msw"

import { autorizarEn, misPendientesDb } from "@/mocks/db/autorizacion-datos"

// Mi cuenta › Autorizaciones (sso V425/V426 y V579.6). Las de inscripciones del listado
// (`/:id/autorizar` de un id que no es de Mi cuenta) las atiende `inscripciones.ts`.
const BASE = "*/api/eval-col/cobertura-academica/inscripciones"
const conDatos = (datos: unknown) => HttpResponse.json({ rows: [{ datos }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

const pendientes = () => misPendientesDb.filter((p) => p.establecimientos.some((e) => !e.autorizado))

/** Valida `ESTABLECIMIENTOS`; null si está bien. */
function validar(ids: unknown, ajenos: (id: number) => boolean) {
  if (!Array.isArray(ids) || ids.length === 0) return error(400, "Marque al menos un establecimiento.")
  if (ids.some((id) => ajenos(Number(id)))) return error(400, "Hay establecimientos que no son de la inscripción.")
  return null
}

export const autorizacionDatosHandlers = [
  // Antes que `${BASE}/:id`.
  http.get(`${BASE}/autorizaciones-pendientes`, async () => {
    await delay(200)
    return HttpResponse.json({ rows: structuredClone(pendientes()) })
  }),

  http.post(`${BASE}/:id/autorizar`, async ({ params, request }) => {
    const fila = misPendientesDb.find((p) => p.tipo === "INSCRIPCION" && p.inscripcionId === Number(params.id))
    // Inscripción del listado: la atiende el handler de inscripciones.
    if (!fila) return undefined
    await delay(300)
    const { ESTABLECIMIENTOS } = (await request.json()) as { ESTABLECIMIENTOS: number[] }
    const invalido = validar(ESTABLECIMIENTOS, (id) => !fila.establecimientos.some((e) => e.establecimientoId === id))
    if (invalido) return invalido
    return conDatos(structuredClone(autorizarEn(fila.establecimientos, ESTABLECIMIENTOS.map(Number))))
  }),

  http.post("*/api/eval-col/usuarios/mi-autorizacion-datos", async ({ request }) => {
    await delay(300)
    const fila = misPendientesDb.find((p) => p.tipo === "FUNCIONARIO")
    if (!fila) return error(400, "No tiene autorizaciones pendientes como funcionario.")
    const { ESTABLECIMIENTOS } = (await request.json()) as { ESTABLECIMIENTOS: number[] }
    const invalido = validar(ESTABLECIMIENTOS, (id) => !fila.establecimientos.some((e) => e.establecimientoId === id))
    if (invalido) return invalido
    autorizarEn(fila.establecimientos, ESTABLECIMIENTOS.map(Number))
    return conDatos({
      autorizados: ESTABLECIMIENTOS.length,
      pendientes: fila.establecimientos.filter((e) => !e.autorizado),
    })
  }),
]
