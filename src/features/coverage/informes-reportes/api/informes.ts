import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import type { AgeSituation, MatriculaStatus } from "@/features/coverage/matricula/api/types/matricula"
import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"

// Informes y reportes (Cobertura 3.9): Consulta de matriculados de todos los períodos (Regla 55).

export const MENU_INFORMES_REPORTES = "INFORMES_REPORTES"
const BASE = "/informes-reportes"

const all = ["informes-reportes"] as const
export const informesKeys = {
  all,
  periodos: [...all, "periodos"] as const,
  matriculados: (body: unknown) => [...all, "matriculados", body] as const,
}

export interface PeriodoInforme {
  id: number
  nombre: string
  anio: number | null
  sede: string
  jornada: string
  establecimiento: string
  estado: "ABIERTO" | "CERRADO"
}

export const fetchPeriodosInforme = () => evalCol.getRows<PeriodoInforme>(`${BASE}/periodos`)

export function usePeriodosInformeQuery() {
  return useQuery({
    queryKey: informesKeys.periodos,
    queryFn: fetchPeriodosInforme,
    staleTime: 5 * 60_000,
  })
}

export interface Matriculado {
  id: string
  documento: string
  nombres: string
  apellidos: string
  establecimiento: string
  sede: string
  jornada: string
  grado: number
  grupo: string
  estado: MatriculaStatus
  situacionEdad: AgeSituation
  metodologia: string
  nuevo: boolean
  tipo: "PRINCIPAL" | "COMPLEMENTARIA"
  tieneComplementaria: boolean
  origenAdscripcion: string | null
  anio: number | null
  periodo: string
  periodoCerrado: boolean
}

interface MatriculadoRow {
  id: number
  document_number: string
  first_name: string
  last_name: string
  institution: string
  campus: string
  shift: string
  grade: number
  grupo: string
  status: MatriculaStatus
  age_situation: AgeSituation | null
  metodologia_grupo: string | null
  nuevo: "S" | "N" | null
  tipo_matricula: "PRINCIPAL" | "COMPLEMENTARIA" | null
  tiene_complementaria: "S" | "N" | null
  origen_adscripcion: string | null
  anio: number | null
  periodo: string | null
  periodo_estado: "ABIERTO" | "CERRADO"
  total_count: number
  total_estudiantes: number | null
}

function toMatriculado(r: MatriculadoRow): Matriculado {
  return {
    id: String(r.id),
    documento: r.document_number,
    nombres: r.first_name,
    apellidos: r.last_name,
    establecimiento: r.institution,
    sede: r.campus,
    jornada: r.shift,
    grado: r.grade,
    grupo: r.grupo,
    estado: r.status,
    situacionEdad: r.age_situation ?? "SIN_CALCULAR",
    metodologia: r.metodologia_grupo ?? "",
    nuevo: r.nuevo === "S",
    tipo: r.tipo_matricula ?? "PRINCIPAL",
    tieneComplementaria: r.tiene_complementaria === "S",
    origenAdscripcion: r.origen_adscripcion?.trim() || null,
    anio: r.anio,
    periodo: r.periodo ?? "",
    periodoCerrado: r.periodo_estado === "CERRADO",
  }
}

/** Filtros de la consulta; los reusa el export (mismos que la tabla). */
export const filtrosMatriculados = (s: InformesSearch) => ({
  SEARCH: s.q || null,
  CAMPUS: s.sede || null,
  ANIO: s.anio ?? null,
  SHIFT: s.jornada || null,
  PERIODO: s.periodo ?? null,
  GRADE: s.grado ?? null,
  GROUP: s.grupo || null,
  STATUSES: s.estado ? [s.estado] : null,
  TIPO: s.tipo ?? null,
  SITUACION_EDAD: s.edad ?? null,
  METODOLOGIA: s.metodologia ?? null,
  NUEVO: s.nuevo ?? null,
})

export type Pagina = { pageIndex: number; pageSize: number; sorting: { id: string; desc: boolean }[] }

/** Body de la consulta (también la clave de la query): lo reusa la preparación offline. */
export function matriculadosBody(s: InformesSearch, p: Pagina) {
  const [orden] = p.sorting
  return {
    ...filtrosMatriculados(s),
    PAGEINDEX: p.pageIndex,
    PAGESIZE: p.pageSize,
    SORTBY: orden?.id ?? null,
    SORTDIR: orden ? (orden.desc ? "desc" : "asc") : null,
  }
}

export async function fetchMatriculados(body: ReturnType<typeof matriculadosBody>) {
  const rows = await evalCol.postRows<MatriculadoRow>(`${BASE}/matriculados/query`, body)
  const pagina = toPaginated(rows, { pageSize: body.PAGESIZE, map: toMatriculado })
  const estudiantes = Number(rows[0]?.total_estudiantes)
  return { ...pagina, totalEstudiantes: Number.isFinite(estudiantes) ? estudiantes : pagina.totalCount }
}

export function useMatriculadosQuery(s: InformesSearch, p: Pagina) {
  const body = matriculadosBody(s, p)
  return useQuery({
    queryKey: informesKeys.matriculados(body),
    queryFn: () => fetchMatriculados(body),
    placeholderData: keepPreviousData,
  })
}
