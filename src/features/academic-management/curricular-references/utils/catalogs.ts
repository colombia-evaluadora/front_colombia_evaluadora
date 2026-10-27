import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

// Sin endpoint de backend: se comparten con el seed mock para usar los mismos ids.
export const EDUCATION_LEVELS: CatalogItem[] = [
  { id: 101, code: "PREESCOLAR", name: "Preescolar" },
  { id: 102, code: "PRIMARIA", name: "Básica primaria" },
  { id: 103, code: "SECUNDARIA", name: "Básica secundaria" },
  { id: 104, code: "MEDIA", name: "Media" },
]

// Describe cómo se mide, no cuándo se aplica (eso es `PEDAGOGICAL_APPROACHES`).
export const EVALUATION_TYPES: CatalogItem[] = [
  { id: 111, code: "CUALITATIVA", name: "Cualitativa" },
  { id: 112, code: "CUANTITATIVA", name: "Cuantitativa" },
  { id: 113, code: "CUANTITATIVA_CUALITATIVA", name: "Cuantitativa y cualitativa" },
]

// En el Planeador, una unidad ligada a un referente FORMATIVO no admite actividades sumativas.
export const PEDAGOGICAL_APPROACHES: CatalogItem[] = [
  { id: 121, code: "EVALUATIVO", name: "Evaluativo" },
  { id: 122, code: "FORMATIVO", name: "Formativo" },
]

// En el backend real el id es un `pk_lista_valor` y el detalle no trae `code`: se cae al nombre.
type ItemConCodigo = { code?: string | null; name?: string | null } | null | undefined

function esValor(item: ItemConCodigo, code: string) {
  if (!item) return false
  return item.code ? item.code === code : item.name?.trim().toUpperCase() === code
}

export const esEnfoqueFormativo = (item: ItemConCodigo) => esValor(item, "FORMATIVO")
export const esEvaluacionCualitativa = (item: ItemConCodigo) => esValor(item, "CUALITATIVA")
export const esEvaluacionCuantitativa = (item: ItemConCodigo) => esValor(item, "CUANTITATIVA")

// Caracteres que admiten los campos de texto del referente: letras (con tildes,
// diéresis y ñ), espacio, guion y apóstrofo (' y ’). Sin números ni otros signos.
export const REFERENTE_TEXT_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ '’-]*$/

export const toReferenteTextInput = (value: string) => value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÜüÑñ '’-]/g, "")

// Descripción, información adicional y normatividad admiten además números (p. ej. "Ley 115 de 1994").
export const REFERENTE_LONG_TEXT_PATTERN = /^[A-Za-z0-9ÁÉÍÓÚáéíóúÜüÑñ '’-]*$/

export const toReferenteLongTextInput = (value: string) => value.replace(/[^A-Za-z0-9ÁÉÍÓÚáéíóúÜüÑñ '’-]/g, "")
