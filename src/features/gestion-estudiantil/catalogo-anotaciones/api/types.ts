/** Fila de `POST /gestion-estudiantil/catalogo-anotaciones/query` (fn_observador_codigo_listar). */
export interface CodigoRow {
  id: number
  fk_establecimiento: number
  codigo: string
  descripcion: string
  fk_tlv_tipo: number
  tipo_nombre: string
  fk_tlv_situacion: number | null
  situacion_codigo: string | null
  situacion_nombre: string | null
  habilitado: boolean
  /** Ya tiene anotaciones (Regla 4): no se elimina ni cambia de tipo o situación. */
  en_uso: boolean
  total_count: number
}

export interface CatalogoFiltros {
  tipo: string
  situacion: string
  estado: string
}

export const ESTADOS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
]

export const FILTROS_VACIOS: CatalogoFiltros = { tipo: "", situacion: "", estado: "" }

export interface CodigoInput {
  codigo: string
  descripcion: string
  tipo: number
  situacion: number | null
  habilitado: boolean
}
