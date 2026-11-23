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
  // --- Pendientes de backend (S.1.VAL.LST.1, S.1.LIS.LST.1/3): hoy solo los trae el mock.
  // Sin ellos la vista no muestra «Usada en», no bloquea el menú de la lista y no agrega
  // la columna de la marca; el back sigue validando inactivar/eliminar con su 409.
  /** Módulos y secciones que consumen la lista, para el «Usada en: …». */
  usadaEn?: string[]
  /** Campos del sistema que la usan: con alguno, la lista no se inactiva ni se elimina. */
  camposQueUsan?: string[]
  /** Marca propia de algunas listas: agrega una columna y un campo al valor. */
  marca?: MarcaLista | null
}

/** Marcas adicionales por lista (regla 7 del md). */
export type MarcaLista = "SIMPADE" | "PIAR" | "ESTAMENTO"

/** `ayuda` es el tooltip del ⓘ junto al campo (el de PIAR es el texto del prototipo). */
export const MARCAS_LISTA: Record<MarcaLista, { columna: string; campo: string; ayuda: string }> = {
  SIMPADE: {
    columna: "Del SIMPADE",
    campo: "Del SIMPADE",
    ayuda: "Si está en Sí, la estrategia es una de las que reporta el SIMPADE. Las propias del establecimiento van en No.",
  },
  PIAR: {
    columna: "Dispara el aviso del PIAR",
    campo: "Dispara el aviso del PIAR",
    ayuda:
      "Si está en Sí, registrar este valor en la matrícula de un estudiante dispara el aviso del PIAR al cumplirse el primer trimestre del período académico. Por defecto, Sí.",
  },
  ESTAMENTO: {
    columna: "Estamento",
    campo: "Estamento",
    ayuda: "Grupo de la comunidad educativa al que pertenece el cargo dentro del comité de convivencia.",
  },
}

export const ESTAMENTOS = ["Directivos", "Docentes", "Estudiantes", "Padres de familia"] as const

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
  // --- Pendientes de backend (solo mock): ver Categoria.
  /** Algún registro usa el valor: no se ofrece Eliminar (S.1.VAL.LST.2). Sin el dato, se ofrece y valida el back. */
  enUso?: boolean
  /** Marca SIMPADE de la lista (S.1.VAL.LST.3a). */
  delSimpade?: boolean
  /** Marca PIAR de la lista (S.1.VAL.LST.6a). */
  disparaPiar?: boolean
  /** Marca ESTAMENTO de la lista (S.1.VAL.LST.6b). */
  estamento?: string | null
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

/**
 * Código de lista que se propone a partir del nombre (S.1.LIS.LST.2 no pide código): empieza con
 * letra y, si ya existe, se le agrega `_2`, `_3`…
 */
export function codigoDeLista(nombre: string, existentes: string[]) {
  const base = toCodigo(nombre, 30).replace(/^[^A-Z]+/, "").replace(/_+$/, "") || "LISTA"
  let codigo = base
  for (let n = 2; existentes.includes(codigo); n++) codigo = `${base.slice(0, 27)}_${n}`
  return codigo
}

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
