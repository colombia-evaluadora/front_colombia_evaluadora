/**
 * Listas de valor del formulario de comunicados (V562 en sso; QA 90 y 92), como las devuelve
 * `GET /eval-col/select/:CATEGORIA`. ROL: VALOR = TROL.CODIGO.
 */
interface FilaListaValor {
  pk_lista_valor: number
  nombre: string
  valor: string
  accion: string | null
  predeterminado: boolean
}

const fila = (pk: number, valor: string, nombre: string, predeterminado = false): FilaListaValor => ({
  pk_lista_valor: pk,
  nombre,
  valor,
  accion: null,
  predeterminado,
})

export const LISTAS_VALOR_COMUNICADO: Record<string, FilaListaValor[]> = {
  ROL: [
    fila(9001, "RECTOR", "Rector"),
    fila(9002, "COORDINADOR", "Coordinador"),
    fila(9003, "DIRECTOR_GRUPO", "Director de grupo"),
    fila(9004, "DOCENTE", "Docente"),
    fila(9005, "PSICO_ORIENTADOR", "Psico-orientador"),
  ],
  POBLACION_ACADEMICA_COMUNICADO: [fila(9011, "MATRICULADOS", "Matriculados", true), fila(9012, "ASPIRANTES", "Aspirantes")],
  SELECCION_FUNCIONARIOS: [
    fila(9021, "TODOS", "Todos los que cumplen el filtro", true),
    fila(9022, "ESPECIFICOS", "Personas específicas"),
  ],
  FORMA_PUBLICACION: [fila(9031, "INMEDIATA", "Inmediata", true), fila(9032, "PROGRAMADA", "Programada")],
}
