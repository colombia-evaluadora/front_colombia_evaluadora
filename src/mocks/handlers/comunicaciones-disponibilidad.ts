import { http, HttpResponse, delay } from "msw"

import type { MiDisponibilidad } from "@/features/comunicaciones/chat/api/types"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"

/**
 * Disponibilidad del chat (comms-service, `comunicaciones.tdisponibilidad`). En memoria y de un
 * solo usuario. Los directos no traen estado: el mock difunde la presencia con `enLinea`.
 */

// `*` delante: también matchea con `msw/node` en los tests (URL absoluta).
const URL = (path: string) => `*/api/eval-col/comunicaciones/${path}`
const ESTADOS = ["EN_LINEA", "AUSENTE", "OCUPADO", "INVISIBLE"]
const PERFILES: PerfilChat[] = ["DIRECTIVO", "DOCENTE", "ACUDIENTE", "ESTUDIANTE"]

export const miDisponibilidad: MiDisponibilidad = {
  estado: "EN_LINEA",
  origen: "MANUAL",
  cambiadoEn: null,
  respuestaAutomatica: null,
  visiblePara: PERFILES,
  inactividadMinutos: 10,
}

interface DisponibilidadBody {
  ESTADO?: string
  RESPUESTA_AUTOMATICA?: string
  VISIBLE_PARA?: string[]
}

export const comunicacionesDisponibilidadHandlers = [
  http.get(URL("disponibilidad"), async () => {
    await delay(100)
    return HttpResponse.json({ rows: [miDisponibilidad] })
  }),

  http.get(URL("disponibilidad/directos"), async () => {
    await delay(100)
    return HttpResponse.json({ rows: [] })
  }),

  http.patch(URL("disponibilidad"), async ({ request }) => {
    await delay(150)
    const b = (await request.json()) as DisponibilidadBody
    if (b.ESTADO !== undefined) {
      if (!ESTADOS.includes(b.ESTADO)) {
        return HttpResponse.json({ message: "Estado de disponibilidad inválido." }, { status: 400 })
      }
      miDisponibilidad.estado = b.ESTADO as MiDisponibilidad["estado"]
      miDisponibilidad.origen = "MANUAL"
      miDisponibilidad.cambiadoEn = new Date().toISOString()
    }
    if (b.RESPUESTA_AUTOMATICA !== undefined) {
      const r = b.RESPUESTA_AUTOMATICA.trim()
      if (r.length > 500) {
        return HttpResponse.json({ message: "La respuesta automática admite hasta 500 caracteres." }, { status: 400 })
      }
      miDisponibilidad.respuestaAutomatica = r || null
    }
    if (b.VISIBLE_PARA !== undefined) {
      if (b.VISIBLE_PARA.some((p) => !PERFILES.includes(p as PerfilChat))) {
        return HttpResponse.json({ message: "Perfil inválido." }, { status: 400 })
      }
      miDisponibilidad.visiblePara = PERFILES.filter((p) => b.VISIBLE_PARA?.includes(p))
    }
    return HttpResponse.json({ rows: [miDisponibilidad] })
  }),
]
