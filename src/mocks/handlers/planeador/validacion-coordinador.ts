import { http, HttpResponse, delay } from "msw"

import { findUserByToken } from "@/mocks/db/auth"
import { planeadorDb } from "@/mocks/db/planeador"
import type {
  EstadoValidacionCoordinador,
  ValidacionCoordinadorRow,
} from "@/features/planeador/api/query/use-validacion-coordinador-query"

/**
 * Validación de la planeación de una actividad por el Coordinador (sso
 * V531.x). El alcance por sede del backend real no se modela: acá valida
 * cualquier usuario con el rol CEVAL-COORDINADOR (`coordinador@example.com`).
 * Decisiones en memoria, se pierden al recargar.
 */
const VALIDACION_URL = "/api/eval-col/planeador/actividades/:id/validacion-coordinador"

interface Decision {
  estado: Exclude<EstadoValidacionCoordinador, "NO_REQUIERE" | "PENDIENTE">
  observacion: string | null
  validadoPor: string
  fechaValidacion: string
}

const decisiones = new Map<number, Decision>()

function usuarioDe(request: Request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "") ?? ""
  return findUserByToken(token)
}

function resultado(id: number, puedeValidar: boolean): ValidacionCoordinadorRow["resultado"] | null {
  const actividad = planeadorDb.find((row) => row.id === id)
  if (!actividad) return null
  const decision = decisiones.get(id)
  return {
    pkActividad: id,
    requiereValidacion: actividad.requiereValidacion,
    estado: !actividad.requiereValidacion ? "NO_REQUIERE" : (decision?.estado ?? "PENDIENTE"),
    observacion: decision?.observacion ?? null,
    validadoPor: decision?.validadoPor ?? null,
    fechaValidacion: decision?.fechaValidacion ?? null,
    puedeValidar,
  }
}

export const planeadorValidacionCoordinadorHandlers = [
  http.get(VALIDACION_URL, async ({ params, request }) => {
    await delay(120)
    const esCoordinador = usuarioDe(request)?.roles.includes("CEVAL-COORDINADOR") ?? false
    const data = resultado(Number(params.id), esCoordinador)
    if (!data) return HttpResponse.json({ message: "No se encontró la actividad solicitada" }, { status: 404 })
    return HttpResponse.json({ rows: [{ resultado: data }] })
  }),

  http.post(VALIDACION_URL, async ({ params, request }) => {
    await delay(250)
    const id = Number(params.id)
    const actividad = planeadorDb.find((row) => row.id === id)
    if (!actividad) return HttpResponse.json({ message: "No se encontró la actividad solicitada" }, { status: 404 })
    if (!actividad.requiereValidacion) {
      return HttpResponse.json({ message: `La actividad "${actividad.nombre}" no requiere validación del coordinador` }, { status: 400 })
    }
    const user = usuarioDe(request)
    if (!user?.roles.includes("CEVAL-COORDINADOR")) {
      return HttpResponse.json(
        { message: "Solo el Coordinador académico de la sede de la actividad puede validarla" },
        { status: 403 },
      )
    }
    const body = (await request.json()) as { DECISION?: string; OBSERVACION?: string | null }
    if (body.DECISION !== "APROBADA" && body.DECISION !== "DECLINADA") {
      return HttpResponse.json({ message: "La decisión debe ser APROBADA o DECLINADA" }, { status: 400 })
    }
    const observacion = body.OBSERVACION?.trim() || null
    if (body.DECISION === "DECLINADA" && !observacion) {
      return HttpResponse.json(
        { message: "Escriba la observación con el motivo para declinar la actividad" },
        { status: 400 },
      )
    }
    decisiones.set(id, {
      estado: body.DECISION,
      observacion,
      validadoPor: user.name,
      fechaValidacion: new Date().toISOString(),
    })
    return HttpResponse.json({ rows: [{ resultado: resultado(id, false) }] })
  }),
]
