import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"

// Estudiantes fuera de matrícula (C.4.FUE; Sección 3.9).

export const SITUACIONES_FUERA = [
  { value: "RETIRADO", label: "Retirado" },
  { value: "SIN_CONTINUIDAD", label: "Sin continuidad" },
  { value: "SIN_CUPO_PLATAFORMA", label: "Sin cupo en la plataforma" },
]

export interface FueraMatricula {
  clave: string
  situacion: string
  liberadaPorRetiro: boolean
  estudiante: string
  grado: string | null
  municipio: string | null
  establecimientoId: number | null
  origen: string | null
  fecha: string | null
  motivo: string | null
  matriculaId: number | null
  reservaId: number | null
  inscripcionId: number | null
}

/** Filtros del informe; los reusa el export. */
export const filtrosFuera = (s: InformesSearch) => ({
  ANIO: s.anio ?? null,
  GRADO: s.grado ?? null,
  MUNICIPIO: s.municipio ?? null,
  ESTABLECIMIENTO: s.establecimiento ?? null,
  SITUACION: s.situacionFuera ?? null,
})
