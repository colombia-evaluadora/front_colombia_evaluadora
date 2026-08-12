export type EspecialidadOrigen = "ESPECIALIDAD" | "ENFASIS"

// Shape crudo del backend: `fn_especialidad_enfasis_listar` devuelve las
// especialidades del catálogo global + los énfasis del establecimiento, con
// `origen` para distinguirlos.
export interface EspecialidadEnfasisRow {
  id: number
  nombre: string
  codigo: string
  origen: EspecialidadOrigen
}

// Opción del select. El front trabaja por nombre (texto libre, permite agregar
// nuevas → el back las resuelve/crea como énfasis vía `fn_enfasis_resolver`).
export interface EspecialidadOption {
  key: string
  label: string
  origen?: EspecialidadOrigen
}
