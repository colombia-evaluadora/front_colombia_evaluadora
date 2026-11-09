import type {
  ArchivoDTO,
  NotificacionDTO,
  SancionDTO,
} from "@/features/gestion-estudiantil/convivencia/api/procesos-types"

/** Pares {codigo, nombre} de los catálogos del detalle (§3). */
export interface CatalogoItem {
  codigo: string
  nombre: string
}

export interface PruebaDTO {
  id: number
  descripcion: string
  archivo: ArchivoDTO | null
}

/** `etapas.descargos` (§3): solo trae datos cuando `alcanzada`. */
export interface EtapaDescargos {
  alcanzada: boolean
  fecha?: string | null
  presento?: boolean | null
  fecha_diligencia?: string | null
  acudiente_presente?: boolean | null
  version?: string | null
  otros_asistentes?: string | null
  constancia?: string | null
  pruebas?: PruebaDTO[]
  acta?: ArchivoDTO | null
  registrado_por?: string | null
}

/** `etapas.decision` (§3). */
export interface EtapaDecision {
  alcanzada: boolean
  fecha?: string | null
  instancia?: CatalogoItem | null
  resultado?: CatalogoItem | null
  cargos_probados?: number[]
  motivacion?: string | null
  acto?: ArchivoDTO | null
  notificacion?: NotificacionDTO | null
  plazo_recurrir?: string | null
  sanciones?: SancionDTO[]
}
