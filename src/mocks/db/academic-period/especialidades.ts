import type { EspecialidadOption } from "@/features/establishment/academic-period/api/types/especialidad"

// Catálogo de especialidades. Simula lo que en producción entrega el backend
// (`key` + `label`), de modo que el front no hardcodee las opciones del select
// ni sus etiquetas.
export const especialidadesDb: EspecialidadOption[] = [
  { key: "General", label: "General" },
  { key: "Técnica", label: "Técnica" },
  { key: "Académica", label: "Académica" },
  { key: "Artística", label: "Artística" },
  { key: "Deportiva", label: "Deportiva" },
]
