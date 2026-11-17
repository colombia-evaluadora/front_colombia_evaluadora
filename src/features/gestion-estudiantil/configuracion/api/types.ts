/** `GET /configuracion/acceso` (V705): banderas de CONFIGURACION_GE en el establecimiento. */
export interface AccesoConfiguracion {
  puede_ver: boolean
  puede_crear: boolean
  puede_editar: boolean
  puede_eliminar: boolean
  /** Solo el Administrador del establecimiento define los umbrales del nivel de convivencia. */
  puede_editar_umbrales: boolean
}

export const ACCESO_NINGUNO: AccesoConfiguracion = {
  puede_ver: false,
  puede_crear: false,
  puede_editar: false,
  puede_eliminar: false,
  puede_editar_umbrales: false,
}

/** `GET /configuracion/niveles-convivencia` (V705); los umbrales llegan NULL sin configurar. */
export interface NivelesConvivencia {
  fk_testablecimiento: number
  umbral_medio: number | string | null
  umbral_alto: number | string | null
  configurado: boolean
  puede_editar: boolean
}

export interface GuardarNivelesInput {
  ESTABLECIMIENTO: number
  UMBRAL_MEDIO: number | null
  UMBRAL_ALTO: number | null
}

/** `GET /proceso-disciplinario/plazos` (V600): días hábiles; sin configurar llegan los predeterminados. */
export interface PlazosDisciplinario {
  dias_descargos: number
  dias_recursos: number
  configurado: boolean
}

/** Fila de `POST /proceso-disciplinario/clasificaciones/query`. */
export interface ClasificacionRow {
  id: number
  fk_establecimiento: number
  nombre: string
  descripcion: string | null
  habilitado: boolean
  /** Ya se usó en procesos (Regla 4): no se elimina, se inactiva. */
  en_uso: boolean
  total_count: number
}

/** Fila de `POST /proceso-disciplinario/sanciones/query`. */
export interface SancionRow {
  id: number
  fk_establecimiento: number
  nombre: string
  descripcion: string | null
  fk_tlv_instancia: number
  instancia_nombre: string
  tiene_duracion: boolean
  fk_tlv_efecto: number | null
  efecto_codigo: string | null
  efecto_nombre: string | null
  habilitado: boolean
  en_uso: boolean
  total_count: number
}

/** `GET /proceso-disciplinario/sanciones/efectos`: los que admite el sector del establecimiento. */
export interface EfectoSancion {
  fk_tlv: number
  codigo: string
  nombre: string
  exige_duracion: boolean
}

export interface SancionFiltros {
  instancia: string
  estado: string
}

export const SANCION_FILTROS_VACIOS: SancionFiltros = { instancia: "", estado: "" }

export interface ClasificacionInput {
  nombre: string
  descripcion: string | null
  habilitado: boolean
}

export interface SancionInput extends ClasificacionInput {
  instancia: number
  tieneDuracion: boolean
  efecto: number
}

/** Una causa de `GET /prevencion/parametros/causas-reservadas` (V698). */
export interface CausaReservada {
  id: number
  valor: string
  nombre: string
  /** Una de las cuatro fijas (C03, C04, C06, C10): siempre reservada, no se quita. */
  fija: boolean
  reservada: boolean
}

export interface CausasReservadas {
  fijas: string[]
  causas: CausaReservada[]
}

/** `GET /servicio-social/parametros` (V623), columna `datos`. */
export interface ParametrosServicioSocialConfig {
  fk_testablecimiento: number
  horas_requeridas: number
  anticipacion_meses: number
  grados: { pk: number; valor: string; nombre: string }[]
  es_predeterminado: boolean
}
