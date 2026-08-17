// Catálogo `GET /eval-col/areas/general` (confirmado por ThunderClient). Este
// mismo catálogo alimenta `FK_AREA_ASIGNATURA` tanto para crear área como
// para crear asignatura.
export interface GeneralArea {
  id: number
  nombre: string
  especialidadId: number
}
