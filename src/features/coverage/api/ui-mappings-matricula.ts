import type { MatriculaStatus } from "@/features/coverage/api/types/matricula"

export const MATRICULA_STATUS_LABELS: Record<MatriculaStatus, string> = {
  cursando: "Cursando",
  aprobado: "Aprobado",
  reprobado: "Reprobado",
  retirado: "Retirado",
  graduado: "Graduado",
  promovido_anticipadamente: "Promovido Anticipadamente",
  trasladado: "Trasladado",
  sin_definir: "Sin definir",
  desertor: "Desertor",
  esperando_aprobacion: "Esperando Aprobación",
  rechazado: "Rechazado",
}


export const YES_NO_OPTIONS = ["Sí", "No"]
