import { http, HttpResponse, delay } from "msw"

import type {
  ConfiguracionMensajeria,
  ReporteConversacion,
  SuspensionMensajeria,
} from "@/features/comunicaciones/chat/api/use-moderacion"
import { conversaciones, mensajes, personas } from "@/mocks/db/comunicaciones"
import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"

// Mock de la moderación de comms-service: mismas reglas de rol y de motivo. El alcance por sede del
// coordinador no se simula (el mock no modela sedes de participantes).
const URL = (path: string) => `*/api/eval-col/comunicaciones/${path}`

const primera = conversaciones[0]
export const reportesMock: ReporteConversacion[] = [
  {
    id: 1,
    conversacionId: primera.id,
    conversacion: primera.nombre,
    reportanteId: personas[0].id,
    reportante: personas[0].nombre,
    motivo: "Lenguaje inadecuado en el hilo.",
    estado: "PENDIENTE",
    fecha: "2026-11-02T15:00:00.000Z",
  },
]
export const suspensionesMock: SuspensionMensajeria[] = []
let configuracion: ConfiguracionMensajeria = { horaInicio: "06:00", horaFin: "18:00", incluyeSabado: false }
let siguiente = 100

const roles = (request: Request) => usuarioDe(request)?.roles ?? []
const esRector = (request: Request) => roles(request).includes("CEVAL-RECTOR")
const modera = (request: Request) => esRector(request) || roles(request).includes("CEVAL-COORDINADOR")
const prohibido = () => HttpResponse.json({ message: "No tienes permiso para esta acción." }, { status: 403 })
const ok = () => HttpResponse.json({ rows: [{ ok: true }] })
const motivoInvalido = (motivo?: string) => !motivo?.trim() || motivo.trim().length > 500
const sinMotivo = () => HttpResponse.json({ message: "Indica el motivo." }, { status: 400 })

export const comunicacionesModeracionHandlers = [
  http.post(URL("conversaciones/:id/reportar"), async ({ params, request }) => {
    await delay(100)
    const conv = conversaciones.find((c) => c.id === Number(params.id))
    if (!conv) return HttpResponse.json({ message: "La conversacion no existe." }, { status: 404 })
    const { MOTIVO } = (await request.json()) as { MOTIVO?: string }
    if (motivoInvalido(MOTIVO)) return sinMotivo()
    reportesMock.push({
      id: siguiente++,
      conversacionId: conv.id,
      conversacion: conv.nombre,
      reportanteId: 0,
      reportante: "Usuario actual",
      motivo: (MOTIVO ?? "").trim(),
      estado: "PENDIENTE",
      fecha: new Date().toISOString(),
    })
    return ok()
  }),
  http.get(URL("moderacion/reportes"), ({ request }) =>
    modera(request) ? HttpResponse.json({ rows: reportesMock }) : prohibido(),
  ),
  http.get(URL("moderacion/reportes/:id/mensajes"), ({ params, request }) => {
    if (!modera(request)) return prohibido()
    const r = reportesMock.find((x) => x.id === Number(params.id))
    if (!r) return HttpResponse.json({ message: "El reporte no existe." }, { status: 404 })
    return HttpResponse.json({ rows: mensajes.filter((m) => m.conversacionId === r.conversacionId) })
  }),
  http.patch(URL("moderacion/reportes/:id/revisar"), ({ params, request }) => {
    if (!modera(request)) return prohibido()
    const r = reportesMock.find((x) => x.id === Number(params.id))
    if (r) r.estado = "REVISADO"
    return ok()
  }),
  http.get(URL("moderacion/suspensiones"), ({ request }) =>
    esRector(request) ? HttpResponse.json({ rows: suspensionesMock }) : prohibido(),
  ),
  http.post(URL("moderacion/suspensiones"), async ({ request }) => {
    if (!esRector(request)) return prohibido()
    const b = (await request.json()) as { FK_USUARIO: number; MOTIVO?: string; VENCE_EN?: string }
    if (motivoInvalido(b.MOTIVO)) return sinMotivo()
    if (suspensionesMock.some((s) => s.usuarioId === b.FK_USUARIO)) {
      return HttpResponse.json({ message: "Esa persona ya tiene la mensajeria suspendida." }, { status: 409 })
    }
    suspensionesMock.push({
      id: siguiente++,
      usuarioId: b.FK_USUARIO,
      usuario: personas.find((p) => p.id === b.FK_USUARIO)?.nombre ?? `Persona ${b.FK_USUARIO}`,
      motivo: (b.MOTIVO ?? "").trim(),
      fecha: new Date().toISOString(),
      venceEn: b.VENCE_EN ?? null,
    })
    return ok()
  }),
  http.patch(URL("moderacion/suspensiones/:id/levantar"), ({ params, request }) => {
    if (!esRector(request)) return prohibido()
    const i = suspensionesMock.findIndex((s) => s.id === Number(params.id))
    if (i < 0) return HttpResponse.json({ message: "La suspension no existe o ya se levanto." }, { status: 404 })
    suspensionesMock.splice(i, 1)
    return ok()
  }),
  http.get(URL("moderacion/configuracion"), ({ request }) =>
    esRector(request) ? HttpResponse.json({ rows: [configuracion] }) : prohibido(),
  ),
  http.put(URL("moderacion/configuracion"), async ({ request }) => {
    if (!esRector(request)) return prohibido()
    const b = (await request.json()) as { HORA_INICIO: string; HORA_FIN: string; INCLUYE_SABADO: string }
    if (b.HORA_INICIO >= b.HORA_FIN) {
      return HttpResponse.json({ message: "La hora de inicio debe ser anterior a la de fin." }, { status: 400 })
    }
    configuracion = { horaInicio: b.HORA_INICIO, horaFin: b.HORA_FIN, incluyeSabado: b.INCLUYE_SABADO === "S" }
    return HttpResponse.json({ rows: [configuracion] })
  }),
]
