import { delay, http, HttpResponse } from "msw"

import {
  ampliarPlazo,
  anularPromocion,
  areasDelAnio,
  corregirNivelacion,
  detallePromocion,
  listarPendientes,
  listarReprobados,
  opcionesPromocion,
  previaPromover,
  promover,
  registrarNivelacion,
  type FiltrosPromocion,
} from "@/mocks/db/promocion-nivelacion"

const BASE = "*/api/eval-col/cobertura-academica/promocion-nivelacion"
const FILES = "*/api/files/eval-col/cobertura-academica/promocion-nivelacion"

const filas = (data: unknown) => HttpResponse.json({ rows: Array.isArray(data) ? data : data == null ? [] : [data] })
const resultado = (error: string | null) => (error ? HttpResponse.json({ message: error }, { status: 400 }) : filas({ ok: true }))

// Sección 4.7 (pendientes-back, tarea 28). Rutas estáticas antes que las de `:id`.
export const promocionNivelacionHandlers = [
  http.get(`${BASE}/opciones`, async () => {
    await delay(150)
    return filas(opcionesPromocion())
  }),
  http.post(`${BASE}/reprobados/query`, async ({ request }) => {
    await delay(250)
    return filas(listarReprobados((await request.json()) as FiltrosPromocion))
  }),
  http.get(`${BASE}/reprobados/:id/areas`, async ({ params }) => {
    await delay(200)
    return filas(areasDelAnio(Number(params.id)))
  }),
  http.post(`${BASE}/promover/previa`, async ({ request }) => {
    await delay(200)
    return filas(previaPromover(((await request.json()) as { IDS: number[] }).IDS))
  }),
  http.post(`${BASE}/promover`, async ({ request }) => {
    await delay(400)
    return filas(promover((await request.json()) as Parameters<typeof promover>[0]))
  }),
  http.post(`${BASE}/pendientes/query`, async ({ request }) => {
    await delay(250)
    return filas(listarPendientes((await request.json()) as FiltrosPromocion))
  }),
  http.get(`${BASE}/pendientes/:id`, async ({ params }) => {
    await delay(200)
    const d = detallePromocion(Number(params.id))
    return d ? filas(d) : HttpResponse.json({ message: "La promoción no existe." }, { status: 404 })
  }),
  http.put(`${BASE}/pendientes/:id/anular`, async ({ params }) => {
    await delay(400)
    return resultado(anularPromocion(Number(params.id)))
  }),
  http.put(`${BASE}/pendientes/:id/plazo`, async ({ params, request }) => {
    await delay(300)
    return resultado(ampliarPlazo(Number(params.id), ((await request.json()) as { PLAZO: string }).PLAZO))
  }),
  http.post(`${FILES}/pendientes/:id/areas/:areaId/nivelacion`, async ({ params, request }) => {
    await delay(400)
    const form = await request.formData()
    const observacion = form.get("OBSERVACION")
    return resultado(
      registrarNivelacion(Number(params.id), Number(params.areaId), {
        fecha: String(form.get("FECHA")),
        nota: Number(form.get("NOTA")),
        responsable: `Funcionario ${String(form.get("FK_TFUNCIONARIO"))}`,
        observacion: observacion ? String(observacion) : null,
        soporte: form.get("SOPORTE") instanceof File,
      }),
    )
  }),
  http.put(`${BASE}/pendientes/:id/areas/:areaId/nivelacion`, async ({ params, request }) => {
    await delay(300)
    const b = (await request.json()) as { FECHA: string; NOTA: number }
    return resultado(corregirNivelacion(Number(params.id), Number(params.areaId), { fecha: b.FECHA, nota: b.NOTA }))
  }),
]
