export type EspecialidadOrigen = "ESPECIALIDAD" | "ENFASIS"

// Shape crudo del backend: `fn_especialidad_enfasis_listar` devuelve las
// especialidades Activas del catálogo de la sede del período (sso V40.3,
// Regla 86). `id` es el énfasis (TENFASIS) que respalda cada ítem: es lo que
// guardan la asignatura (`FK_ENFASIS`) y la matrícula
// (`CARACTER_ESPECIALIDAD_ENFASIS`). `origen` viene siempre "ESPECIALIDAD".
export interface EspecialidadEnfasisRow {
  id: number
  nombre: string
  codigo: string
  origen: EspecialidadOrigen
}

// Opción del select. El front de asignaturas trabaja por nombre (`key`/`label`)
// y resuelve el `id` al guardar.
export interface EspecialidadOption {
  id: number
  key: string
  label: string
  origen: EspecialidadOrigen
}
