import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import {
  toMatriculaDetailResult,
  type RawMatriculaDetail,
} from "@/features/coverage/matricula/api/query/use-matricula-detail-query"
import { toSoporte, type Soporte, type SoporteRow } from "@/features/coverage/matricula/api/soportes"
import type { MatriculaDetails, MatriculaRestricciones } from "@/features/coverage/matricula/api/types/matricula"
import { reservaKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-detalle-query"
import { RESERVAS_BASE } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type { EstadoReserva } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

/** Detalle de la reserva (`fn_reserva_obtener_interno`) más el período que arma la ficha. */
interface ReservaRaw {
  id: number
  estudiante: { id: number; nombre: string; documento: string; tipoDocumento: string }
  establecimiento: { id: number; nombre: string }
  origen: string
  fkTmatriculaOrigen: number | null
  codigoGrado: string
  grado: string
  fkTgrado: number | null
  fkTperiodoAcademico: number | null
  periodoAcademico: string | null
  fkTsede: number | null
  sede: string | null
  fkTlvJornada: number | null
  jornada: string | null
  estado: EstadoReserva
  estadoNombre: string
  fkTmatriculaGenerada: number | null
  anio: string | null
  ciclo: string | null
  estadoPeriodo: string | null
  fechaLimiteMatricula: string | null
}

/** Lo que ve el destino de un traslado entrante (Regla 31): sin ficha. */
export interface ReservaEntrante {
  id: number
  estudiante: { nombre: string; documento: string; tipoDocumento: string }
  establecimientoOrigen: string
  gradoActual: string | null
  gradoSolicitado: string
  resultadoAnio: string | null
  motivoTraslado: string | null
  sedePreferida: string | null
  jornadaPreferida: string | null
  observacion: string | null
  hermanoVerificado: boolean
  estadoTraslado: string
  solicitadoAt: string | null
}

type FichaRaw =
  | { entrante: true; reserva: ReservaEntrante }
  | (RawMatriculaDetail & {
      entrante: false
      reserva: ReservaRaw
      fuente: FuenteFicha
      fkTmatriculaFuente: number | null
      sinAutorizacion: boolean
      soportes: SoporteRow[]
    })

/** De dónde salen los datos: la matrícula ya generada, la anterior o (inscrito nuevo) la inscripción. */
export type FuenteFicha = "MATRICULA_GENERADA" | "MATRICULA_ANTERIOR" | "INSCRIPCION"

export interface ReservaFicha {
  entrante: false
  reserva: {
    id: string
    estudiante: string
    estado: EstadoReserva
    estadoNombre: string
    codigoGrado: string
    grado: string
    fkTgrado: number | null
    fkTperiodoAcademico: number | null
    fkTsede: number | null
    sede: string
    fkTlvJornada: number | null
    jornada: string
    anio: string
    /** «2028 · Anual · Ciclo 1» (grupo de admisión del período). */
    ciclo: string
    estadoPeriodo: string
    fechaLimiteMatricula: string | null
    fkTmatriculaGenerada: number | null
    establecimientoId: number
    /** Grupo de la matrícula generada (Matriculada). */
    grupoGenerado: string | null
  }
  fuente: FuenteFicha
  fkTmatriculaFuente: number | null
  /** Regla 81 en el establecimiento de la reserva: datos del estudiante enmascarados y en solo lectura. */
  sinAutorizacion: boolean
  /** Formulario de matrícula precargado (sin la sección 1, que sale de la reserva). */
  details: MatriculaDetails
  soportes: Soporte[]
}

export type ReservaFichaResult = ReservaFicha | { entrante: true; reserva: ReservaEntrante }

const toFicha = (raw: Extract<FichaRaw, { entrante: false }>): ReservaFicha => {
  const { reserva: r } = raw
  const { details, matricula } = toMatriculaDetailResult(raw, undefined)
  return {
    entrante: false,
    reserva: {
      id: String(r.id),
      estudiante: r.estudiante.nombre,
      estado: r.estado,
      estadoNombre: r.estadoNombre,
      codigoGrado: r.codigoGrado,
      grado: r.grado,
      fkTgrado: r.fkTgrado,
      fkTperiodoAcademico: r.fkTperiodoAcademico,
      fkTsede: r.fkTsede,
      sede: r.sede ?? "",
      fkTlvJornada: r.fkTlvJornada,
      jornada: r.jornada ?? "",
      anio: r.anio ?? "",
      ciclo: r.ciclo ?? r.periodoAcademico ?? "",
      estadoPeriodo: r.estadoPeriodo ?? "",
      fechaLimiteMatricula: r.fechaLimiteMatricula,
      fkTmatriculaGenerada: r.fkTmatriculaGenerada,
      establecimientoId: r.establecimiento.id,
      grupoGenerado: raw.fuente === "MATRICULA_GENERADA" ? (matricula?.group ?? null) : null,
    },
    fuente: raw.fuente,
    fkTmatriculaFuente: raw.fkTmatriculaFuente,
    sinAutorizacion: raw.sinAutorizacion,
    // Regla 81 por el establecimiento de la reserva (el detalle de matrícula no la trae).
    details: {
      ...(details as MatriculaDetails),
      restricciones: { ...(details?.restricciones as MatriculaRestricciones), sinAutorizacion: raw.sinAutorizacion },
    },
    soportes: (raw.soportes ?? []).map(toSoporte),
  }
}

/**
 * Ver detalle y Asignar grupo (3.6): la ficha de matrícula de la reserva con la forma del detalle
 * de matrícula (`GET /reservas-cupo/:ID/ficha`, V510).
 */
export function useReservaFichaQuery(id: string) {
  return useQuery({
    queryKey: reservaKeys.ficha(id),
    queryFn: async (): Promise<ReservaFichaResult> => {
      const [row] = await evalCol.getRows<{ datos: FichaRaw }>(`${RESERVAS_BASE}/${id}/ficha`)
      const raw = row?.datos
      if (!raw) throw new Error("No se encontró la reserva de cupo.")
      return raw.entrante ? { entrante: true, reserva: raw.reserva } : toFicha(raw)
    },
    enabled: Boolean(id),
  })
}

/** Fila de `fn_reserva_grupos_disponibles_interno`. */
export interface GrupoDisponible {
  id: number
  nombre: string
  cupoLibre: number
  cupoContratadoLibre: number
  alcanza: boolean
}

/** Grupos del grado de la reserva con cupo (Regla 30): el select de Asignar grupo ofrece los que alcanzan. */
export function useGruposDisponiblesQuery(id: string, enabled: boolean) {
  return useQuery({
    queryKey: reservaKeys.grupos(id),
    queryFn: async (): Promise<GrupoDisponible[]> => {
      const [row] = await evalCol.postRows<{
        datos: { fkTgrupo: number; grupo: string; cupoLibre: number; cupoContratadoLibre: number; alcanza: boolean }[]
      }>(`${RESERVAS_BASE}/grupos-disponibles`, { RESERVAS: [Number(id)] })
      return (row?.datos ?? []).map((g) => ({
        id: g.fkTgrupo,
        nombre: g.grupo,
        cupoLibre: g.cupoLibre,
        cupoContratadoLibre: g.cupoContratadoLibre,
        alcanza: g.alcanza,
      }))
    },
    enabled: Boolean(id) && enabled,
  })
}
