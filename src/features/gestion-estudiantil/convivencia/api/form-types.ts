/** Estado de los formularios del caso (no es contrato del backend). */

export interface DatosSiuce {
  tiposDano: string[]
  agresion: string
  evento: string
  repetitiva: boolean | null
  secuelas: boolean | null
}

export interface EstudianteFila {
  /** Id de la fila en el caso (TCASO_CONVIVENCIA_ESTUDIANTE); ausente si se agregó en esta edición. */
  id?: number
  fk_matricula: number
  nombre: string
  grado: string
  rol: string
  rolOriginal?: string
}

export interface InvolucradoFila {
  key: string
  id?: number
  tipo: string
  nombre: string
  tipoDoc: string
  numDoc: string
  rol: string
  fk_funcionario: number | null
}
