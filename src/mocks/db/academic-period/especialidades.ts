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

// Los énfasis (origen ENFASIS) los crea el usuario a nivel de
// establecimiento; se agregan al mismo array. El backend real todavía no
// tiene el endpoint (se está armando en paralelo) — este mock simula el
// contrato acordado.
export function nextEnfasisId(): number {
  return especialidadesDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
}
