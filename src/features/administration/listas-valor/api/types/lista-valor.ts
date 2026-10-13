/** Categoría de `TLISTA_VALOR` (V101). No hay tabla propia: existe mientras tenga valores activos. */
export interface Categoria {
  categoria: string
  totalValores: number
  esSistema: boolean
  /** Categorías de las que cuelgan sus valores (autorreferencia por `FK_TLISTA_VALOR_PADRE`). */
  categoriasPadre: string[]
}

export interface ValorPadre {
  pkListaValor: number
  categoria: string
  nombre: string
  valor: string
}

export interface ListaValor {
  pkListaValor: number
  categoria: string
  nombre: string
  valor: string
  accion: string | null
  esSistema: boolean
  active: boolean
  padre: ValorPadre | null
}

/** Valor nuevo dentro del alta de una categoría. */
export interface ValorDraft {
  nombre: string
  valor: string
  accion?: string | null
  padre?: number | null
}

/** Cada SQL del backend es `SELECT fn_...(...) AS resultado`. */
export interface Resultado<T> {
  resultado: T
}
