// VALOR de TLISTA_VALOR (categoría TIPO_VALORACION) — confirmado contra la
// base real: es "1"/"2", NO el texto "Fortaleza"/"Debilidad" (eso es el
// NOMBRE, ver `tipoName` en `RatingScale` más abajo). Opaco a propósito: no
// hardcodear los VALOR reales, pueden variar por ambiente.
export type RatingScaleType = string

// Opción de tipo de valoración tal como la entrega el backend: `key` es el
// valor que se guarda/manda, `label` el texto visible en el select.
export interface RatingScaleTypeOption {
  key: RatingScaleType
  label: string
}

export type RatingSymbolCategory = "carita" | "valoracion"

// "emoji" o "imagen": si es imagen, `valor` es la URL en vez del carácter.
export type RatingSymbolKind = "emoji" | "imagen"

export interface RatingSymbol {
  id: string
  categoria: RatingSymbolCategory
  kind: RatingSymbolKind
  valor: string
  label: string
  // Color del símbolo (p. ej. las caritas vienen en varios colores). Se usa
  // para agrupar el picker por color. Opcional: los símbolos sin color se
  // muestran en un único grupo.
  color?: string
}

export interface TeachingLevel {
  id: number
  nombre: string
  grados?: string[]
}

export interface RatingScale {
  codigo: number
  teachingLevelIds: number[]
  teachingLevels: TeachingLevel[]
  nombre: string
  abreviacion: string
  tipo: RatingScaleType
  // Nombre del tipo resuelto por el backend (TLISTA_VALOR.NOMBRE); adicional al
  // valor `tipo`.
  tipoName?: string
  iconografia: string
  notaMaxima: number
  notaMinima: number
  notaEquivalente: number
}

export interface RatingScalesQueryFilters {
  nombre?: string
  abreviacion?: string
  tipo?: RatingScaleType[]
}

export interface RatingScalesQueryRequest {
  filters: RatingScalesQueryFilters
  sorting: { id: string; desc: boolean }[]
  // Sin paginación: `fn_escala_listar` devuelve todas las bandas del periodo
  // (la tabla arma niveles/subtablas en cliente). Filtro opcional por nivel.
  teachingLevelId?: number
  academicPeriodId?: number
}

export interface RatingScaleRecord extends RatingScale {
  academicPeriodId: number
}

export interface RatingScalesQueryResponse {
  rows: RatingScale[]
}

export type CreateRatingScaleRequest = RatingScale & {
  academicPeriodId?: number
}

// Una escala sin lo que asigna el backend (código y niveles resueltos).
export type RatingScaleDraft = Omit<RatingScale, "codigo" | "teachingLevelIds" | "teachingLevels">

// Alta en lote: el backend expande por nivel (una escala independiente por
// cada nivel × escala) y asigna los códigos.
export interface BulkCreateRatingScalesRequest {
  teachingLevelIds: number[]
  scales: RatingScaleDraft[]
  academicPeriodId?: number
}

export type UpdateRatingScaleRequest = RatingScale

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

export interface RatingScalesExportRequest {
  ids?: number[]
  filters?: RatingScalesQueryFilters
  format: ExportFormat
}
