import type { EspecialidadEnfasisRow } from "@/features/establishment/academic-period/api/types/especialidad"

// Catálogo de especialidades (origen ESPECIALIDAD). Simula lo que entrega
// `fn_especialidad_enfasis_listar`; los énfasis (origen ENFASIS) los agrega el
// handler a partir de los que ya están en uso en el establecimiento.
export const especialidadesDb: EspecialidadEnfasisRow[] = [
  { id: 1, nombre: "General", codigo: "GEN", origen: "ESPECIALIDAD" },
  { id: 2, nombre: "Técnica", codigo: "TEC", origen: "ESPECIALIDAD" },
  { id: 3, nombre: "Académica", codigo: "ACA", origen: "ESPECIALIDAD" },
  { id: 4, nombre: "Artística", codigo: "ART", origen: "ESPECIALIDAD" },
  { id: 5, nombre: "Deportiva", codigo: "DEP", origen: "ESPECIALIDAD" },
]
