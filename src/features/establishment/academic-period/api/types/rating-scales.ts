export type RatingScaleType = "Fortaleza" | "Debilidad"

export type RatingSymbolCategory = "carita" | "valoracion"

// "emoji" ahora; cuando lleguen las imágenes reales será "imagen" y `valor`
// pasará a ser la URL de la imagen en vez del carácter emoji.
export type RatingSymbolKind = "emoji" | "imagen"

export interface RatingSymbol {
  id: string
  categoria: RatingSymbolCategory
  kind: RatingSymbolKind
  valor: string
  label: string
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
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
}

export interface RatingScaleRecord extends RatingScale {
  academicPeriodId: number
}

export interface RatingScalesQueryResponse {
  rows: RatingScale[]
  pageCount: number
  totalCount: number
}

export type CreateRatingScaleRequest = RatingScale & {
  academicPeriodId?: number
}

// Una escala sin lo que asigna el backend (código y niveles resueltos).
export type RatingScaleDraft = Omit<
  RatingScale,
  "codigo" | "teachingLevelIds" | "teachingLevels"
>

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