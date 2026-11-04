import type { AdjuntoMensaje, Mencion } from "@/features/comunicaciones/chat/api/types"

/** Bloque 4 del Planeador. Documentos, sesiones y pizarra esperan proveedor (fase 2.3): no se ofrecen. */
export type HerramientaEspacio = "CHAT" | "FORO" | "ENCUESTAS" | "EQUIPOS"
export type EstadoEspacio = "POR_ABRIR" | "ABIERTO" | "SOLO_LECTURA"
export type RolEspacio = "PROPIETARIO" | "ESTUDIANTE" | "EX_ESTUDIANTE" | "SUPERVISOR"

export interface EspacioResumen {
  id: number
  actividadId: number
  actividad: string
  asignatura: string
  grupo: string | null
  docente: string
  fechaInicio: string | null
  fechaCierre: string | null
  estado: EstadoEspacio
  rol: RolEspacio
}

export interface Silenciado {
  usuarioId: number
  nombre: string
  motivo: string
  fecha: string
}

export interface EspacioDetalle {
  espacio: EspacioResumen
  herramientas: HerramientaEspacio[]
  /** Con historial: su pestaña sigue visible aunque se haya deshabilitado. */
  conContenido: HerramientaEspacio[]
  puedeEscribir: boolean
  puedeAdministrar: boolean
  silenciado: boolean
  silenciados: Silenciado[]
}

export interface ConfiguracionEspacio {
  espacioId: number | null
  herramientas: HerramientaEspacio[]
  tieneContenido: boolean
  puedeEditar: boolean
}

export interface Participante {
  usuarioId: number
  nombre: string
  rol: "PROPIETARIO" | "ESTUDIANTE"
}

export interface MaterialEspacio {
  id: number
  tipo: string | null
  url: string | null
  archivoId: number | null
  archivoNombre: string | null
  descripcion: string | null
}

export interface Participacion {
  id: number
  autorId: number
  autor: string
  esPropia: boolean
  texto: string | null
  fecha: string
  editada: boolean
  fijada: boolean
  retirada: boolean
  oculta: boolean
  /** Solo le llega al docente propietario. */
  motivoOculta: string | null
  /** Del autor y dentro de los 15 minutos (reloj del servidor). */
  editable: boolean
  adjuntos: AdjuntoMensaje[]
  menciones: Mencion[]
  meMenciona: boolean
}
