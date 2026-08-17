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

// Opción del select. El front sigue trabajando por nombre (`key`/`label`);
// `id` se necesita aparte para editar/borrar un énfasis puntual — las
// especialidades fijas (`origen: "ESPECIALIDAD"`) no se pueden editar/borrar.
export interface EspecialidadOption {
  id: number
  key: string
  label: string
  origen: EspecialidadOrigen
}
