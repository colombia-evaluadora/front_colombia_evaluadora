import { matriculaDb } from "@/mocks/db/matricula"

// Solicitudes de retiro entre establecimientos (Sección 2.2, Regla 71).
// Origen (pk % 5 === 0): matrícula con Retiro solicitado, responde Retirar u Objetar.
// Destino (pk % 11 === 0 y no origen): Anulación pendiente tras «Cerrar sin retiro».

type Estado = "PENDIENTE" | "VENCIDA" | "ATENDIDA" | "OBJETADA" | "POR_ANULAR" | "CERRADA_SIN_RETIRO"

const respuestas = new Map<number, Estado>()

const esOrigen = (pk: number) => pk % 5 === 0
const esDestino = (pk: number) => !esOrigen(pk) && pk % 11 === 0

function estadoDe(pk: number): Estado | null {
  const respondida = respuestas.get(pk)
  if (respondida) return respondida
  if (esOrigen(pk)) return pk % 2 === 0 ? "PENDIENTE" : "VENCIDA"
  if (esDestino(pk)) return "POR_ANULAR"
  return null
}

const cursando = (pk: number) => matriculaDb.find((m) => Number(m.id) === pk)?.status === "Cursando"

/** Origen con la solicitud sin responder: bloquea los cambios académicos. */
export function retiroSolicitadoPor(pk: number): string | null {
  const estado = estadoDe(pk)
  return cursando(pk) && esOrigen(pk) && (estado === "PENDIENTE" || estado === "VENCIDA") ? "IE San José" : null
}

/** Destino con la matrícula por anular. */
export function anulacionPendiente(pk: number): boolean {
  return cursando(pk) && esDestino(pk) && estadoDe(pk) === "POR_ANULAR"
}

export function solicitudDe(pk: number) {
  const estado = estadoDe(pk)
  if (!estado || !cursando(pk)) return null
  const origen = esOrigen(pk)
  const dias = (pk % 9) + 2
  const fecha = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10)
  return {
    pk_tsolicitud_retiro: pk,
    rol: origen ? "ORIGEN" : "DESTINO",
    establecimiento_solicitante: origen ? "IE San José" : "IE Central",
    establecimiento_origen: origen ? "IE Central" : "IE Norte",
    fecha_solicitud: fecha,
    dias_sin_respuesta: dias,
    estado,
    evidencia_nombre: "certificado-estudios.pdf",
    fk_tarchivo_evidencia: 900000 + pk,
    motivo_cierre: origen
      ? null
      : "El estudiante sigue asistiendo en IE Norte; el acudiente no pidió el traslado.",
    // Lo que se anula con la matrícula del destino (Sección 4.4).
    registros: origen ? null : { asistencias: (pk % 7) + 3, notas: pk % 4, anotaciones: pk % 3 },
  }
}

export function retirarPorSolicitud(pk: number): string | null {
  if (retiroSolicitadoPor(pk) == null) return "La matrícula no tiene una solicitud de retiro pendiente."
  respuestas.set(pk, "ATENDIDA")
  const m = matriculaDb.find((x) => Number(x.id) === pk)
  if (m) m.status = "Retirado"
  return null
}

export function objetarSolicitud(pk: number, motivo: string): string | null {
  if (retiroSolicitadoPor(pk) == null) return "La matrícula no tiene una solicitud de retiro pendiente."
  if (motivo.trim().length < 10 || motivo.trim().length > 500) return "El motivo de la objeción debe tener entre 10 y 500 caracteres."
  respuestas.set(pk, "OBJETADA")
  return null
}

export function anularMatricula(pk: number): string | null {
  if (!anulacionPendiente(pk)) return "La matrícula no tiene una anulación pendiente."
  respuestas.set(pk, "CERRADA_SIN_RETIRO")
  const m = matriculaDb.find((x) => Number(x.id) === pk)
  if (m) m.status = "Anulado"
  return null
}
