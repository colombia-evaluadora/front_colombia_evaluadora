import type { MatriculaStatus } from "@/features/coverage/api/types/matricula"

export const MATRICULA_STATUS_LABELS: Record<MatriculaStatus, string> = {
  cursando: "Cursando",
  aprobado: "Aprobado",
  reprobado: "Reprobado",
  promovido: "Promovido",
  reubicado: "Reubicado",
  retirado: "Retirado",
}

// ── Catálogos del formulario de alta ("Agregar estudiante") ───────────────
// Listas fijas: no hay todavía un catálogo real detrás de estos campos, así
// que se usan opciones fijas —igual que `DOCUMENT_TYPE_OPTIONS`/`GENDER_
// OPTIONS`/`RESIDENCE_OPTIONS`/`RELATIONSHIP_OPTIONS` en `ui-mappings.ts`—.

export const YES_NO_OPTIONS = ["Sí", "No"]

export const SPECIALTY_OPTIONS = [
  "Académico",
  "Técnico",
  "Comercial",
  "Industrial",
  "Agropecuario",
  "Pedagógico",
  "Artístico",
]

export const ETHNICITY_OPTIONS = [
  "Ninguna",
  "Indígena",
  "Afrocolombiano",
  "Raizal",
  "Palenquero",
  "Rrom (gitano)",
]

export const PREVIOUS_YEAR_SITUATION_OPTIONS = [
  "Aprobado",
  "Reprobado",
  "Trasladado",
  "Nuevo ingreso",
]

export const PREVIOUS_YEAR_CONDITION_OPTIONS = [
  "Promovido",
  "No promovido",
  "Promoción anticipada",
]

export const CONFLICT_VICTIM_POPULATION_OPTIONS = [
  "Ninguna",
  "Desplazado",
  "Víctima de minas antipersonal",
  "Víctima de reclutamiento forzado",
  "Otro",
]

export const SOCIOECONOMIC_STRATUM_OPTIONS = ["1", "2", "3", "4", "5", "6"]

export const SPECIAL_CONDITIONS_OPTIONS = [
  "Ninguna",
  "Discapacidad física",
  "Discapacidad cognitiva",
  "Discapacidad visual",
  "Discapacidad auditiva",
  "Trastorno del espectro autista",
  "Otra",
]

export const TALENT_OPTIONS = [
  "Ninguno",
  "Talento artístico",
  "Talento deportivo",
  "Talento académico/intelectual",
  "Otro",
]

export const FUNDING_SOURCE_OPTIONS = ["Ninguna", "Nación", "Departamento", "Municipio", "Gratuidad"]
