import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { invalidarMatriculas, matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

// Solicitud de retiro entre establecimientos (Sección 2.2, Regla 71): el origen
// responde Retirar u Objetar; tras «Cerrar sin retiro», el destino anula.

export type EstadoSolicitudRetiro =
  | "PENDIENTE"
  | "VENCIDA"
  | "ATENDIDA"
  | "OBJETADA"
  | "POR_ANULAR"
  | "CERRADA_SIN_RETIRO"

export const ESTADO_SOLICITUD_LABEL: Record<EstadoSolicitudRetiro, string> = {
  PENDIENTE: "Pendiente",
  VENCIDA: "Vencida",
  ATENDIDA: "Atendida",
  OBJETADA: "Objetada",
  POR_ANULAR: "Por anular en el destino",
  CERRADA_SIN_RETIRO: "Cerrada sin retiro",
}

export interface SolicitudRetiro {
  id: number
  rol: "ORIGEN" | "DESTINO"
  establecimientoSolicitante: string
  establecimientoOrigen: string
  /** yyyy-MM-dd */
  fecha: string
  diasSinRespuesta: number
  estado: EstadoSolicitudRetiro
  evidenciaNombre: string
  evidenciaArchivoId: number | null
  motivoCierre: string | null
  /** Destino: lo que se anula con la matrícula. */
  registros: { asistencias: number; notas: number; anotaciones: number } | null
}

interface SolicitudRow {
  pk_tsolicitud_retiro: number
  rol: "ORIGEN" | "DESTINO"
  establecimiento_solicitante: string
  establecimiento_origen: string
  fecha_solicitud: string
  dias_sin_respuesta: number
  estado: EstadoSolicitudRetiro
  evidencia_nombre: string
  fk_tarchivo_evidencia: number | null
  motivo_cierre: string | null
  registros: { asistencias: number; notas: number; anotaciones: number } | null
}

const toSolicitud = (r: SolicitudRow): SolicitudRetiro => ({
  id: r.pk_tsolicitud_retiro,
  rol: r.rol,
  establecimientoSolicitante: r.establecimiento_solicitante,
  establecimientoOrigen: r.establecimiento_origen,
  fecha: r.fecha_solicitud,
  diasSinRespuesta: r.dias_sin_respuesta ?? 0,
  estado: r.estado,
  evidenciaNombre: r.evidencia_nombre,
  evidenciaArchivoId: r.fk_tarchivo_evidencia,
  motivoCierre: r.motivo_cierre,
  registros: r.registros,
})

export function useSolicitudRetiroQuery(matriculaId: string, enabled = true) {
  return useQuery({
    queryKey: matriculaKeys.solicitudRetiro(matriculaId),
    queryFn: async () => {
      const row = await evalCol.getRow<{ solicitud: SolicitudRow }>(
        `/cobertura-academica/matricula/${matriculaId}/solicitud-retiro`,
      )
      return toSolicitud(row.solicitud)
    },
    enabled,
  })
}

export type RespuestaSolicitud =
  | { matriculaId: string; accion: "retirar" }
  | { matriculaId: string; accion: "objetar"; motivo: string; evidencia: File | null }

/**
 * Retirar usa los motivos fijos de la Sección 2.2 (Traslado a otro
 * establecimiento / Requerimiento de otra entidad territorial o
 * establecimiento): el back los pone, no se mandan.
 */
async function responderSolicitud(input: RespuestaSolicitud) {
  const base = `/cobertura-academica/matricula/${input.matriculaId}/solicitud-retiro`
  if (input.accion === "retirar") {
    await evalCol.postRow(`${base}/retirar`, {})
    return
  }
  await postMultipart(`/eval-col${base}/objetar`, { MOTIVO: input.motivo.trim() }, { EVIDENCIA: input.evidencia })
}

export function useResponderSolicitudRetiro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: responderSolicitud,
    onSuccess: (_, { matriculaId }) => {
      invalidarMatriculas(queryClient)
      queryClient.invalidateQueries({ queryKey: matriculaKeys.solicitudRetiro(matriculaId) })
    },
  })
}

/** Destino: Motivo de anulación «Matrícula duplicada por solicitud de retiro», fijo. */
async function anularMatricula(matriculaId: string) {
  await evalCol.postRow(`/cobertura-academica/matricula/${matriculaId}/anular`, {
    MOTIVO_ANULACION: "DUPLICADA_SOLICITUD_RETIRO",
  })
}

export function useAnularMatricula() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: anularMatricula,
    onSuccess: (_, matriculaId) => {
      invalidarMatriculas(queryClient)
      queryClient.invalidateQueries({ queryKey: matriculaKeys.solicitudRetiro(matriculaId) })
    },
  })
}
