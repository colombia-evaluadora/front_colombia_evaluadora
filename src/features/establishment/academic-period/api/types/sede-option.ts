// Fila devuelta por `GET /eval-col/establecimientos/sedes/opciones`.
// `pk_sede` es el BIGINT de TSEDE; el form lo guarda como string (igual que
// ya hacía con el legacy Campus.id) y la mutación de create lo convierte a
// número para `FK_SEDE` (`Number(values.sedeId)`).
export interface SedeOption {
  pk_sede: number
  codigo: string
  nombre: string
  fk_tlv_zona: number
  zona_nombre: string
  barrio: string
  comuna: string
  direccion: string
  telefono: string
  fk_establecimiento: number
}

export interface SedesOptionsResponse {
  rows: SedeOption[]
}
