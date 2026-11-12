import { delay, http, HttpResponse } from "msw"

import {
  anulacionPendiente,
  anularMatricula,
  objetarSolicitud,
  retirarPorSolicitud,
  retiroSolicitadoPor,
  solicitudDe,
} from "@/mocks/db/solicitud-retiro"
import { matriculaDb } from "@/mocks/db/matricula"

const BASE = "*/api/eval-col/cobertura-academica/matricula/:id"

export const solicitudRetiroHandlers = [
  // Estática, antes que las de :id.
  http.get("*/api/eval-col/matricula/solicitudes-pendientes", async () => {
    await delay(200)
    const pks = matriculaDb.map((m) => Number(m.id))
    return HttpResponse.json({
      rows: [
        {
          retiros_sin_responder: pks.filter((pk) => retiroSolicitadoPor(pk)).length,
          anulaciones_pendientes: pks.filter((pk) => anulacionPendiente(pk)).length,
        },
      ],
    })
  }),

  http.get(`${BASE}/solicitud-retiro`, async ({ params }) => {
    await delay(250)
    const solicitud = solicitudDe(Number(params.id))
    if (!solicitud) return HttpResponse.json({ message: "La matrícula no tiene una solicitud de retiro." }, { status: 404 })
    return HttpResponse.json({ rows: [{ solicitud }] })
  }),

  http.post(`${BASE}/solicitud-retiro/retirar`, async ({ params }) => {
    await delay(400)
    const error = retirarPorSolicitud(Number(params.id))
    if (error) return HttpResponse.json({ message: error }, { status: 400 })
    return HttpResponse.json({ rows: [{ respuesta: { estado: "ATENDIDA" } }] })
  }),

  http.post(`*/api/files/eval-col/cobertura-academica/matricula/:id/solicitud-retiro/objetar`, async ({ params, request }) => {
    await delay(400)
    const form = await request.formData()
    const error = objetarSolicitud(Number(params.id), String(form.get("MOTIVO") ?? ""))
    if (error) return HttpResponse.json({ message: error }, { status: 400 })
    return HttpResponse.json({ rows: [{ respuesta: { estado: "OBJETADA" } }] })
  }),

  http.post(`${BASE}/anular`, async ({ params }) => {
    await delay(400)
    const error = anularMatricula(Number(params.id))
    if (error) return HttpResponse.json({ message: error }, { status: 400 })
    return HttpResponse.json({ rows: [{ anulacion: { estado: "Anulado" } }] })
  }),
]
