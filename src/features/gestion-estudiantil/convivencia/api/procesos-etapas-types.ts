/** Opciones, cálculos y cuerpos de los modales de etapa (Proceso disciplinario - DTOs.md §4 y §5). */

export interface OpcionSancion {
  id: number
  nombre: string
  descripcion: string | null
  tiene_duracion: boolean
  efecto: { codigo: string; nombre: string }
}

/** `GET /procesos/:ID/limites-sancion` (§4.2). */
export interface LimitesSancion {
  inicio_minimo: string | null
  fin_maximo: string | null
  dias_recursos: number
}

export interface OpcionTlv {
  fk_tlv: number
  codigo: string
  nombre: string
}

/** `GET /procesos/:ID/opciones/recurso` (§4.4). */
export interface OpcionesRecurso {
  tipos: OpcionTlv[]
  instancia_decision: OpcionTlv | null
  instancias: OpcionTlv[]
  fecha_notificacion: string | null
  limite: string | null
}

/** Una sanción en el cuerpo de la decisión o de la resolución (§4.2). */
export interface SancionBody {
  fk_sancion: number
  fecha_inicio: string | null
  fecha_fin: string | null
  detalle: string | null
}

/** Respuesta común de las mutaciones de etapa: el backend manda `mensaje` (y el resto del resultado). */
export type ResultadoEtapa = { mensaje?: string } & Record<string, unknown>
