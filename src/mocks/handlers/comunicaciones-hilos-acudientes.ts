import { http, HttpResponse, delay } from "msw"

import type { Conversacion, Mensaje } from "@/features/comunicaciones/chat/api/types"
import {
  USUARIO_ACTUAL,
  conversaciones,
  mensajes,
  miembrosDe,
  nuevoMensaje,
} from "@/mocks/db/comunicaciones"
import {
  acudientesDeGrupo,
  hilosAcudientes,
  opcionesHilo,
  vistaHilo,
} from "@/mocks/db/comunicaciones-hilos-acudientes"

/**
 * Hilo común del docente con acudientes (Comunicaciones 4.5) para modo mock. El hilo es un GRUPO de
 * `conversaciones`: los mensajes, la bandeja y Reportar los atienden los handlers del chat. Mismo
 * contrato que comms-service (`/comunicaciones/hilos-acudientes/**`).
 */
const URL = (path = "") => `*/api/eval-col/comunicaciones/hilos-acudientes${path}`

const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

function hiloDe(id: unknown) {
  return hilosAcudientes.find((h) => h.conversacionId === Number(id))
}

export const comunicacionesHilosAcudientesHandlers = [
  http.get(URL("/opciones"), async () => {
    await delay(150)
    return HttpResponse.json({ rows: opcionesHilo })
  }),

  http.get(URL(), async () => {
    await delay(100)
    return HttpResponse.json({
      rows: hilosAcudientes.map((h) => ({
        conversacionId: h.conversacionId,
        grupo: h.nombre,
        acudientes: acudientesDeGrupo(h.grupo).length,
        soloLectura: h.soloLectura,
      })),
    })
  }),

  http.post(URL(), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as {
      FK_TGRUPO?: number
      FK_TDOCENTE_ASIGNATURA?: number | null
      ASUNTO?: string
      TEXTO?: string
    }
    const opcion = opcionesHilo.find(
      (o) => o.grupo === body.FK_TGRUPO && (o.asignacion ?? null) === (body.FK_TDOCENTE_ASIGNATURA ?? null),
    )
    if (!opcion) return error(403, "Solo el responsable del grupo puede abrir un hilo con sus acudientes.")
    const asunto = body.ASUNTO?.trim() ?? ""
    const texto = body.TEXTO?.trim() ?? ""
    if (!asunto) return error(400, "Escribe el asunto.")
    if (!texto) return error(400, "Escribe el primer mensaje.")
    const acudientes = acudientesDeGrupo(opcion.grupo)
    const conversacion: Conversacion = {
      id: Math.max(0, ...conversaciones.map((c) => c.id)) + 1,
      nombre: opcion.nombre,
      asunto,
      tipo: "GRUPO",
      categoria: "GENERAL",
      noLeidos: 0,
      actividadAbierta: false,
      esBot: false,
      totalMiembros: acudientes.length + 1,
      miembrosDestacados: acudientes.slice(0, 3).map((a) => a.nombre),
      silenciadoHasta: null,
      archivada: false,
      esCreador: true,
      esAdmin: true,
    }
    conversaciones.push(conversacion)
    miembrosDe(conversacion.id).splice(
      0,
      Infinity,
      { id: USUARIO_ACTUAL.id, nombre: USUARIO_ACTUAL.nombre, rol: "Administrador", enLinea: true, bloqueado: false, esAdmin: true, esCreador: true },
      ...acudientes,
    )
    hilosAcudientes.push({
      conversacionId: conversacion.id,
      grupo: opcion.grupo,
      nombre: opcion.nombre,
      asunto,
      moderador: { id: USUARIO_ACTUAL.id, nombre: USUARIO_ACTUAL.nombre },
      soloLectura: false,
      silenciados: [],
    })
    nuevoMensaje(conversacion.id, texto)
    // Respuesta de un acudiente para poder probar "Ocultar mensaje".
    const a = acudientes[0]
    if (a) nuevoMensaje(conversacion.id, "Gracias, profe. Quedamos atentos.", null, {}, { id: a.id, nombre: a.nombre, enLinea: false })
    return HttpResponse.json({ rows: [conversacion] })
  }),

  http.get(URL("/:id"), async ({ params }) => {
    await delay(100)
    const h = hiloDe(params.id)
    if (!h) return error(404, "El hilo no existe.")
    return HttpResponse.json({ rows: [vistaHilo(h, USUARIO_ACTUAL.id)] })
  }),

  http.patch(URL("/:id/mensajes/:m/ocultar"), async ({ params }) => {
    await delay(150)
    const h = hiloDe(params.id)
    if (!h) return error(404, "El hilo no existe.")
    if (h.moderador.id !== USUARIO_ACTUAL.id) return error(403, "Solo el moderador del hilo puede hacerlo.")
    const m = mensajes.find((x) => x.id === Number(params.m) && x.conversacionId === h.conversacionId)
    if (!m) return error(404, "El mensaje no existe.")
    if (m.esPropio) return error(400, "Solo se ocultan mensajes de otros participantes.")
    Object.assign(m, { ocultoPorModerador: true, texto: "", adjunto: null, adjuntos: [] } satisfies Partial<Mensaje>)
    return HttpResponse.json({ rows: [m] })
  }),

  http.post(URL("/:id/silencios"), async ({ params, request }) => {
    await delay(150)
    const h = hiloDe(params.id)
    if (!h) return error(404, "El hilo no existe.")
    const body = (await request.json()) as { FK_USUARIO?: number; MOTIVO?: string }
    const motivo = body.MOTIVO?.trim() ?? ""
    if (!motivo) return error(400, "Indica el motivo.")
    const a = acudientesDeGrupo(h.grupo).find((x) => x.id === body.FK_USUARIO)
    if (!a) return error(404, "La persona no es acudiente de este hilo.")
    if (h.silenciados.some((s) => s.usuarioId === a.id)) return error(409, "La persona ya está silenciada en este hilo.")
    h.silenciados.push({ usuarioId: a.id, nombre: a.nombre, motivo, silenciadoEn: new Date().toISOString() })
    return HttpResponse.json({ rows: [vistaHilo(h, USUARIO_ACTUAL.id)] })
  }),

  http.patch(URL("/:id/silencios/:u/quitar"), async ({ params }) => {
    await delay(150)
    const h = hiloDe(params.id)
    if (!h) return error(404, "El hilo no existe.")
    const antes = h.silenciados.length
    h.silenciados = h.silenciados.filter((s) => s.usuarioId !== Number(params.u))
    if (h.silenciados.length === antes) return error(404, "La persona no está silenciada en este hilo.")
    return HttpResponse.json({ rows: [vistaHilo(h, USUARIO_ACTUAL.id)] })
  }),
]
