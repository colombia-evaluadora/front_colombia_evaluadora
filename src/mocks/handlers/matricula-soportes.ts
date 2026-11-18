import { delay, http, HttpResponse } from "msw"

import {
  cargarSoporte,
  documentosConvenioDe,
  marcarDocumentoConvenio,
  quitarSoporte,
  revisarSoporte,
  soportesDe,
  urlSoporte,
} from "@/mocks/db/matricula-soportes"

const BASE = "*/api/eval-col/cobertura-academica/matricula/:id"

const error = (message: string) => HttpResponse.json({ message }, { status: 400 })

// Bloque 14 (pendientes-back, tarea 19). Va antes que planeador por el view-token.
export const matriculaSoportesHandlers = [
  http.get(`${BASE}/soportes`, async ({ params }) => {
    await delay(200)
    return HttpResponse.json({ rows: soportesDe(String(params.id)) })
  }),

  http.post("*/api/files/eval-col/cobertura-academica/matricula/:id/soportes", async ({ params, request }) => {
    await delay(400)
    const form = await request.formData()
    const archivo = form.get("ARCHIVO")
    if (!(archivo instanceof File)) return error("Seleccione el archivo.")
    const pk = form.get("PK_TMATRICULA_ARCHIVO")
    const fallo = cargarSoporte(
      String(params.id),
      String(form.get("TIPO")) as Parameters<typeof cargarSoporte>[1],
      pk ? Number(pk) : null,
      archivo,
    )
    return fallo ? error(fallo) : HttpResponse.json({ rows: [{ ok: true }] })
  }),

  http.put(`${BASE}/soportes/:pk/revision`, async ({ params, request }) => {
    await delay(300)
    const body = (await request.json()) as { RESULTADO: string; OBSERVACION: string | null }
    const fallo = revisarSoporte(
      String(params.id),
      Number(params.pk),
      body.RESULTADO as Parameters<typeof revisarSoporte>[2],
      body.OBSERVACION,
    )
    return fallo ? error(fallo) : HttpResponse.json({ rows: [{ ok: true }] })
  }),

  http.put(`${BASE}/soportes/:pk/quitar`, async ({ params }) => {
    await delay(300)
    const fallo = quitarSoporte(String(params.id), Number(params.pk))
    return fallo ? error(fallo) : HttpResponse.json({ rows: [{ ok: true }] })
  }),

  http.get(`${BASE}/documentos-convenio`, async ({ params }) => {
    await delay(150)
    return HttpResponse.json({ rows: documentosConvenioDe(String(params.id)) })
  }),

  http.put(`${BASE}/documentos-convenio/:pk`, async ({ params, request }) => {
    await delay(200)
    const body = (await request.json()) as { ENTREGADO: "S" | "N" }
    const fallo = marcarDocumentoConvenio(String(params.id), Number(params.pk), body.ENTREGADO)
    return fallo ? error(fallo) : HttpResponse.json({ rows: [{ ok: true }] })
  }),

  // Sin respuesta MSW sigue con el siguiente view-token (planeador y demás).
  http.post("*/api/files/view-token/:archivoId", async ({ params }) => {
    const url = urlSoporte(Number(params.archivoId))
    if (!url) return undefined
    await delay(100)
    return HttpResponse.json({ token: "mock", url, expiresIn: 300 })
  }),
]
