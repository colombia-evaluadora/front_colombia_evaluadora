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
    // Destino: días sin anular desde el cierre sin retiro (SOL.7).
    const dias_sin_anular = solicitud.rol === "DESTINO" ? 1 + (Number(params.id) % 4) : null
    return HttpResponse.json({ rows: [{ solicitud: { ...solicitud, dias_sin_anular } }] })
  }),

  http.post(`${BASE}/solicitud-retiro/retirar`, async ({ params, request }) => {
    await delay(400)
    const body = (await request.json().catch(() => ({}))) as { FECHA_RETIRO?: string }
    const hoy = new Date().toISOString().slice(0, 10)
    if (!body.FECHA_RETIRO || body.FECHA_RETIRO > hoy) {
      return HttpResponse.json({ message: "La fecha de retiro es obligatoria y no puede ser futura." }, { status: 400 })
    }
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

  // SOL.1: el destino pide el retiro al matricular; la evidencia es obligatoria.
  http.post(`*/api/files/eval-col/cobertura-academica/matricula/:id/solicitud-retiro`, async ({ request }) => {
    await delay(400)
    const form = await request.formData()
    if (!(form.get("ARCHIVO") instanceof File)) {
      return HttpResponse.json({ message: "La evidencia es obligatoria." }, { status: 400 })
    }
    return HttpResponse.json({ rows: [{ solicitud: { estado: "PENDIENTE" } }] })
  }),

  http.post(`${BASE}/anular`, async ({ params }) => {
    await delay(400)
    const error = anularMatricula(Number(params.id))
    if (error) return HttpResponse.json({ message: error }, { status: 400 })
    return HttpResponse.json({ rows: [{ anulacion: { estado: "Anulado" } }] })
  }),
]
