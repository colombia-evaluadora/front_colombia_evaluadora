import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { asistenciaKeys } from "@/features/academic-management/asistencia/api/query-keys"

/** Fila de `GET /asistencias/por-grupo` (sso V542.11): una por (sesión, estudiante). */
interface AsistenciaPorGrupoRow {
  fk_tasignatura: number
  asignatura: string
  fecha: string
  bloque: number | null
  sesion_registrada: boolean
  fk_tmatricula: number
  estudiante: string
  documento: string
  /** 1 Asistió · 2 No asistió · 5 Llegó tarde · null sin marca. */
  tipo_valor: 1 | 2 | 5 | null
  justificada: boolean
  /** `false`: no estaba en el grupo esa fecha (no cuenta en sus totales). */
  en_grupo: boolean
  /** Llegó tarde sin excusa en un día de varios bloques: el bloque en que llegó (0-based). */
  bloque_llegada?: number | null
}

export type MarcaAsistencia = "ASISTIO" | "FALLA" | "RETRASO" | null

export interface SesionGrupo {
  /** `fkAsignatura-fecha-bloque`. */
  id: string
  fkAsignatura: number
  asignatura: string
  fecha: string
  bloque: number | null
  registrada: boolean
}

export interface CeldaAsistencia {
  marca: MarcaAsistencia
  justificada: boolean
  enGrupo: boolean
  bloqueLlegada: number | null
}

export interface EstudianteGrupo {
  fkMatricula: number
  nombre: string
  documento: string
  /** Por id de sesión. */
  celdas: Map<string, CeldaAsistencia>
}

export interface AsistenciaPorGrupo {
  sesiones: SesionGrupo[]
  estudiantes: EstudianteGrupo[]
}

export interface AsistenciaPorGrupoParams {
  GRUPO: number
  PERIODO: number
  ASIGNATURA?: number
}

const MARCA: Record<1 | 2 | 5, MarcaAsistencia> = { 1: "ASISTIO", 2: "FALLA", 5: "RETRASO" }

/** Pivota las filas largas a sesiones (columnas) y estudiantes (filas). */
export function toAsistenciaPorGrupo(rows: AsistenciaPorGrupoRow[]): AsistenciaPorGrupo {
  const sesiones = new Map<string, SesionGrupo>()
  const estudiantes = new Map<number, EstudianteGrupo>()
  for (const row of rows) {
    const fecha = row.fecha.slice(0, 10)
    const id = `${row.fk_tasignatura}-${fecha}-${row.bloque ?? "x"}`
    if (!sesiones.has(id)) {
      sesiones.set(id, {
        id,
        fkAsignatura: row.fk_tasignatura,
        asignatura: row.asignatura,
        fecha,
        bloque: row.bloque,
        registrada: row.sesion_registrada,
      })
    }
    let estudiante = estudiantes.get(row.fk_tmatricula)
    if (!estudiante) {
      estudiante = { fkMatricula: row.fk_tmatricula, nombre: row.estudiante, documento: row.documento, celdas: new Map() }
      estudiantes.set(row.fk_tmatricula, estudiante)
    }
    estudiante.celdas.set(id, {
      marca: row.tipo_valor ? MARCA[row.tipo_valor] : null,
      justificada: row.justificada,
      enGrupo: row.en_grupo,
      bloqueLlegada: row.bloque_llegada == null ? null : Number(row.bloque_llegada),
    })
  }
  const ordenadas = [...sesiones.values()].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || (a.bloque ?? -1) - (b.bloque ?? -1) || a.asignatura.localeCompare(b.asignatura),
  )
  return { sesiones: ordenadas, estudiantes: [...estudiantes.values()] }
}

async function fetchAsistenciaPorGrupo(params: AsistenciaPorGrupoParams): Promise<AsistenciaPorGrupo> {
  const raw = await api.get<{ rows: AsistenciaPorGrupoRow[] } | AsistenciaPorGrupoRow[]>(
    "/eval-col/asistencias/por-grupo",
    { params },
  )
  return toAsistenciaPorGrupo(Array.isArray(raw) ? raw : (raw.rows ?? []))
}

export function useAsistenciaPorGrupoQuery(params: AsistenciaPorGrupoParams | null) {
  return useQuery({
    queryKey: asistenciaKeys.porGrupo(params ?? "none"),
    queryFn: () => fetchAsistenciaPorGrupo(params!),
    enabled: params != null,
    placeholderData: (prev) => prev,
  })
}

interface PeriodoEvaluacionRow {
  pk_tperiodo_evaluacion: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  en_curso: boolean
}

export interface PeriodoEvaluacionOpcion {
  id: number
  nombre: string
  enCurso: boolean
}

async function fetchPeriodosGrupo(grupo: number): Promise<PeriodoEvaluacionOpcion[]> {
  const raw = await api.get<{ rows: PeriodoEvaluacionRow[] } | PeriodoEvaluacionRow[]>(
    "/eval-col/asistencias/por-grupo/periodos",
    { params: { GRUPO: grupo } },
  )
  const rows = Array.isArray(raw) ? raw : (raw.rows ?? [])
  return rows.map((r) => ({ id: r.pk_tperiodo_evaluacion, nombre: r.nombre, enCurso: r.en_curso }))
}

export function usePeriodosGrupoQuery(grupo: number | undefined) {
  return useQuery({
    queryKey: asistenciaKeys.porGrupoPeriodos(grupo ?? "none"),
    queryFn: () => fetchPeriodosGrupo(grupo!),
    enabled: grupo != null,
    staleTime: 5 * 60_000,
  })
}

export interface TotalesEstudiante {
  fallas: number
  justificadas: number
  retrasos: number
  /** `null` sin sesiones registradas. */
  porcentaje: number | null
}

/** Totales del período (Sección 7): fallas, justificadas, retrasos y % de
 *  asistencia = sesiones con Asistió o Llegó tarde sobre las registradas. Las
 *  sesiones en que no estaba en el grupo no cuentan. */
export function totalesEstudiante(estudiante: EstudianteGrupo, sesiones: SesionGrupo[]): TotalesEstudiante {
  let fallas = 0
  let justificadas = 0
  let retrasos = 0
  let presentes = 0
  let registradas = 0
  for (const sesion of sesiones) {
    const celda = estudiante.celdas.get(sesion.id)
    if (!celda?.enGrupo || celda.marca == null) continue
    registradas += 1
    if (celda.marca === "FALLA") fallas += 1
    if (celda.marca === "RETRASO") retrasos += 1
    if (celda.marca !== "FALLA") presentes += 1
    if (celda.justificada) justificadas += 1
  }
  return { fallas, justificadas, retrasos, porcentaje: registradas > 0 ? (presentes / registradas) * 100 : null }
}
