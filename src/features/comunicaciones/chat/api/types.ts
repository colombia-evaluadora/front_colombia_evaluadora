// Tipos de dominio del chat. El backend aún no existe: la forma la fija el mock.

export type TipoConversacion = "CANAL" | "DIRECTO"

// Qué representa el canal; cambia el ícono de la lista.
export type CategoriaCanal = "GENERAL" | "VOTACION" | "ENCUESTA" | "EXAMEN" | "ANUNCIO"

export type SilencioDuracion = "8H" | "1S" | "SIEMPRE"

export interface Conversacion {
  id: number
  nombre: string
  tipo: TipoConversacion
  categoria: CategoriaCanal
  noLeidos: number
  // Punto verde: el canal tiene una actividad abierta (votación, encuesta…).
  actividadAbierta: boolean
  esBot: boolean
  totalMiembros: number
  miembrosDestacados: string[]
  silenciadoHasta: string | null
  archivada: boolean
}

export interface AutorMensaje {
  id: number
  nombre: string
  enLinea: boolean
}

export interface AdjuntoMensaje {
  nombre: string
  formato: "WORD" | "PDF" | "IMAGEN" | "VIDEO" | "OTRO"
  // El autor quitó el archivo; el mensaje conserva el aviso.
  eliminadoEn: string | null
}

export interface Mensaje {
  id: number
  conversacionId: number
  autor: AutorMensaje
  esPropio: boolean
  texto: string
  fecha: string
  adjunto: AdjuntoMensaje | null
  editado: boolean
  fijado: boolean
}

export interface ChatInstitucion {
  id: number
  nombre: string
}

export type FormatoArchivo = AdjuntoMensaje["formato"]

export interface ArchivoCompartido {
  id: number
  nombre: string
  formato: FormatoArchivo
  compartidoPor: string
  esPropio: boolean
  fecha: string
  conversacionId: number
  conversacionNombre: string
  // El usuario pertenece al canal (filtro "Solo mis canales").
  enMiCanal: boolean
}

export interface Candidato {
  id: number
  nombre: string
  numero: string
  lema: string
  fotoUrl: string | null
  votos: number
}

export interface Eleccion {
  conversacionId: number
  nombre: string
  descripcion: string
  fechaInicio: string | null
  // Sin fecha de cierre la votación sigue abierta hasta cerrarla a mano.
  fechaCierre: string | null
  jornadaId: number
  verResultadosEnVivo: boolean
  permitirComentarios: boolean
  candidatos: Candidato[]
  votosEnBlanco: number
  totalHabilitados: number
  vieronCanal: number
  creadoPor: string
  esCreador: boolean
}

export type EstadoBorrador = "BORRADOR" | "PROGRAMADO" | "ENVIADO"

export interface Borrador {
  id: number
  conversacionId: number
  conversacionNombre: string
  texto: string
  estado: EstadoBorrador
  // Última edición, hora programada o envío, según el estado.
  fecha: string
}
