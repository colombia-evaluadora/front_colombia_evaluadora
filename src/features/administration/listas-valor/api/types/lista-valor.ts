/** Lista de `TLISTA_CATEGORIA` (V101). El código es inmutable; el nombre se edita. */
export interface Categoria {
  categoria: string
  /** Nombre visible, único entre listas. Sin él el back lo deriva del código. */
  nombre: string
  descripcion: string | null
  /** Código de la lista de la que cuelgan sus valores (autorreferencia), o null. */
  categoriaPadre: string | null
  esOrdinal: boolean
  habilitada: boolean
  totalValores: number
  esSistema: boolean
  /** pk del valor predeterminado, o null. */
  predeterminado: number | null
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
  etiqueta: string | null
  accion: string | null
  orden: number
  predeterminado: boolean
  habilitado: boolean
  esSistema: boolean
  active: boolean
  padre: ValorPadre | null
}

/** Valor nuevo dentro del alta de una lista. */
export interface ValorDraft {
  nombre: string
  valor: string
  etiqueta?: string | null
  padre?: number | null
  predeterminado?: boolean
}

/** Cada SQL del backend es `SELECT fn_...(...) AS resultado`. */
export interface Resultado<T> {
  resultado: T
}

/** Código de un valor nuevo (V101): de 2 a 20 mayúsculas sin tildes, números o `_`. */
export const CODIGO_VALOR = /^[A-Z0-9_]{2,20}$/

/** Normaliza lo que se escribe a un código: mayúsculas, sin tildes, espacios a `_`. */
export function toCodigo(text: string, max: number) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, max)
}
