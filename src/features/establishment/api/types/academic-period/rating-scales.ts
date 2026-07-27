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

export type UpdateRatingScaleRequest = RatingScale

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