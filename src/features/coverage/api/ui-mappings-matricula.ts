import type { MatriculaStatus } from "@/features/coverage/api/types/matricula"

// `MatriculaStatus` ES el label (el `nombre` real de TLISTA_VALOR, ver el
// comentario en `types/matricula.ts`) -- no hace falta un mapa aparte para
// mostrarlo. Solo para el select de solo-lectura "Estado de la matrícula" en
// el formulario de alta (`form-create-matricula.tsx`).
export const MATRICULA_STATUSES: MatriculaStatus[] = [
  "Cursando",
  "Aprobado",
  "Reprobado",
  "Retirado",
  "Graduado",
  "Promovido",
  "Promovido Anticipadamente",
  "Reubicado",
  "Trasladado",
  "Sin definir",
  "Desertor",
  "Esperando Aprobación",
  "Rechazado",
]

export const YES_NO_OPTIONS = ["Sí", "No"]
