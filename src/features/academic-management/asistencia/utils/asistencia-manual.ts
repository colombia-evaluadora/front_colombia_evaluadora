import type {
  AsistenciaRegistroManual,
  RosterEstudiante,
  TipoAsistencia,
} from "@/features/academic-management/asistencia/api/types/asistencia"
import { formatHora } from "@/features/academic-management/asistencia/api/ui-mappings"

export const TIPOS_ALTA_NUEVA: TipoAsistencia[] = [1, 2, 5]
export const ASISTIO: TipoAsistencia = 1
export const NO_ASISTIO: TipoAsistencia = 2
export const LLEGO_TARDE: TipoAsistencia = 5

// 3 y 6 solo vienen en filas históricas: la excusa es el archivo, no un tipo.
export const BASE_DE_JUSTIFICADO: Partial<Record<TipoAsistencia, TipoAsistencia>> = {
  3: 2,
  6: 5,
}

export function tipoBase(tipo: TipoAsistencia): TipoAsistencia {
  return BASE_DE_JUSTIFICADO[tipo] ?? tipo
}

export interface SesionTab {
  id: string
  fkGrupo: number
  grado: string
  grupo: string
  jornada: string
  fkAsignatura: number
  asignatura: string
  bloque: number | null
  bloques: (number | null)[]
  horasPorBloque: Record<number, { horaInicio: string | null; horaFin: string | null }>
  horaInicio: string | null
  horaFin: string | null
  /** Grupo de Preescolar: la sesión es `actividad`, no `asignatura` -- ver `registrar`/roster mas abajo. */
  esFormativa: boolean
  fkActividad: number | null
  actividad: string | null
}

/** Nombre a mostrar en pestaña/encabezado: la actividad si es formativa, la asignatura si no. */
export function nombreSesion(sesion: Pick<SesionTab, "esFormativa" | "actividad" | "asignatura">): string {
  return sesion.esFormativa ? (sesion.actividad ?? "Actividad") : sesion.asignatura
}

export function formatFechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
}

export function formatEncabezadoSesion(fecha: string, horaInicio: string | null, horaFin: string | null): string {
  const fechaLabel = formatFechaLarga(fecha)
  if (!horaInicio || !horaFin) return fechaLabel
  return `${fechaLabel} (${formatHora(horaInicio)} - ${formatHora(horaFin)})`
}

export function resolverArchivo(
  bloque: number | null,
  fkMatricula: number,
  soporte: Record<number, File>,
  soporteEliminado: Record<number, boolean>,
  rosterPorBloque: Map<number | null, RosterEstudiante[]>,
): File | number | undefined {
  if (soporteEliminado[fkMatricula]) return undefined
  const nuevo = soporte[fkMatricula]
  if (nuevo) return nuevo
  const existente = rosterPorBloque.get(bloque)?.find((r) => r.fk_tmatricula === fkMatricula)?.fk_soporte_archivo
  return existente ?? undefined
}

export function registrosPorBloque(
  bloques: (number | null)[],
  seleccion: Record<number, TipoAsistencia>,
  bloqueTarde: Record<number, number>,
  soporte: Record<number, File>,
  soporteEliminado: Record<number, boolean>,
  rosterPorBloque: Map<number | null, RosterEstudiante[]>,
): Map<number | null, AsistenciaRegistroManual[]> {
  const porBloque = new Map<number | null, AsistenciaRegistroManual[]>(bloques.map((b) => [b, []]))
  const bloquesNumericos = bloques.filter((b): b is number => b !== null)

  for (const [fkMatriculaStr, tipo] of Object.entries(seleccion)) {
    const fkMatricula = Number(fkMatriculaStr)

    if (tipo === LLEGO_TARDE && bloquesNumericos.length > 1) {
      const bloqueLlegada = bloqueTarde[fkMatricula] ?? bloquesNumericos[0]
      for (const bloque of bloquesNumericos) {
        const tipoBloque: TipoAsistencia =
          bloque < bloqueLlegada ? NO_ASISTIO : bloque === bloqueLlegada ? LLEGO_TARDE : ASISTIO
        // El soporte va solo en el bloque "Llegó tarde", no en los que genera la cascada.
        const archivo =
          tipoBloque === LLEGO_TARDE
            ? resolverArchivo(bloque, fkMatricula, soporte, soporteEliminado, rosterPorBloque)
            : undefined
        porBloque.get(bloque)!.push({
          fkMatricula,
          tipoAsistencia: tipoBloque,
          ...(archivo !== undefined && { fkArchivo: archivo }),
        })
      }
      continue
    }

    // Un soporte que quedó de una selección anterior no se re-envía si `tipo` pasó a Asistió.
    const admiteSoporte = tipo === NO_ASISTIO || tipo === LLEGO_TARDE
    for (const bloque of bloques) {
      const archivo = admiteSoporte
        ? resolverArchivo(bloque, fkMatricula, soporte, soporteEliminado, rosterPorBloque)
        : undefined
      porBloque.get(bloque)!.push({
        fkMatricula,
        tipoAsistencia: tipo,
        ...(archivo !== undefined && { fkArchivo: archivo }),
      })
    }
  }

  return porBloque
}

export function registroAutoritativo(
  bloques: (number | null)[],
  rosterPorBloque: Map<number | null, RosterEstudiante[]>,
  fkMatricula: number,
): { bloque: number | null; row: RosterEstudiante } | undefined {
  let candidato: { bloque: number | null; row: RosterEstudiante } | undefined
  for (const bloque of bloques) {
    const row = rosterPorBloque.get(bloque)?.find((r) => r.fk_tmatricula === fkMatricula)
    if (!row || row.tipo_asistencia_valor == null) continue
    if (tipoBase(row.tipo_asistencia_valor) === LLEGO_TARDE) return { bloque, row }
    candidato ??= { bloque, row }
  }
  return candidato
}

/** Regla 75: con una solicitud pendiente el docente ve lo que propuso, no lo oficial. */
export function conCambioPendiente(row: RosterEstudiante): RosterEstudiante {
  if (row.pk_tsolicitud_aprobacion == null || row.cambio_tipo_asistencia_valor == null) return row
  return { ...row, tipo_asistencia_valor: row.cambio_tipo_asistencia_valor }
}

/** Hay algo que corregir respecto a lo que la pantalla ya muestra para ese registro. */
export function cambiaRegistro(registro: AsistenciaRegistroManual, actual: RosterEstudiante, quitaSoporte: boolean): boolean {
  // 3/6 históricos equivalen a 2/5: la excusa es el archivo.
  const tipoActual = actual.tipo_asistencia_valor == null ? null : tipoBase(actual.tipo_asistencia_valor)
  return tipoBase(registro.tipoAsistencia) !== tipoActual || registro.fkArchivo instanceof File || quitaSoporte
}
/** Lo que la página necesita de una pestaña para preguntar antes de cambiar de sesión. */
export interface SesionControl {
  hayCambios: () => boolean
  /** `true` si quedó guardado; con error la pestaña ya avisó y no se cambia. */
  guardar: () => Promise<boolean>
}
