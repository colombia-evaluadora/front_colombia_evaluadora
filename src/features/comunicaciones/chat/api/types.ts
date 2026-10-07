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
  // Solo canales creados desde "Agregar canales": activan el mensaje de bienvenida.
  creadoPor?: string | null
  esCreador?: boolean
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
  // Aviso del sistema ("X se ha unido a…"): se muestra centrado, sin burbuja.
  sistema?: boolean
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
  // Documento de texto que se puede abrir en el editor.
  editable?: boolean
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

export type TipoPregunta = "MULTIPLE" | "UNICA" | "REDACCION" | "SI_NO"

export interface OpcionEncuesta {
  id: number
  texto: string
  votos: number
}

export interface PreguntaEncuesta {
  id: number
  tipo: TipoPregunta
  texto: string
  // Vacío en preguntas de redacción.
  opciones: OpcionEncuesta[]
  // Personas que respondieron esta pregunta: base de los porcentajes.
  totalRespuestas: number
  // Solo redacción: respuestas abiertas destacadas.
  respuestas: string[]
}

// PUBLICOS: los participantes ven los resultados; ADMIN: solo quien la creó.
export type VisibilidadResultados = "PUBLICOS" | "ADMIN"

export interface Encuesta {
  conversacionId: number
  nombre: string
  descripcion: string
  fechaInicio: string | null
  fechaCierre: string | null
  resultados: VisibilidadResultados
  preguntas: PreguntaEncuesta[]
  totalHabilitados: number
  participantes: number
  creadoPor: string
  esCreador: boolean
}

// Persona del colegio que se puede añadir a un canal.
export interface Persona {
  id: number
  nombre: string
  correo: string
}

// Evaluación en línea. SI_NO se muestra como Verdadero / Falso.
export interface OpcionEvaluacion {
  id: number
  texto: string
  correcta: boolean
}

export interface PreguntaEvaluacion {
  id: number
  tipo: TipoPregunta
  texto: string
  puntos: number
  opciones: OpcionEvaluacion[]
}

// INMEDIATO: el estudiante ve su nota al enviar; AL_CIERRE: cuando termina el plazo.
export type MostrarResultados = "INMEDIATO" | "AL_CIERRE"

export interface Evaluacion {
  conversacionId: number
  nombre: string
  descripcion: string
  fechaInicio: string | null
  fechaCierre: string | null
  // null = sin límite.
  tiempoLimiteMin: number | null
  puntajeTotal: number
  // null = ilimitados.
  intentos: number | null
  mostrarResultados: MostrarResultados
  preguntas: PreguntaEvaluacion[]
  creadoPor: string
  esCreador: boolean
}

export interface RespuestaEntrega {
  preguntaId: number
  opcionIds: number[]
  texto: string | null
  // Puntos que puso el docente; null = aún sin calificar (redacción).
  puntos: number | null
}

export type EstadoEntrega = "PENDIENTE" | "CALIFICADA"

export interface EntregaEvaluacion {
  id: number
  estudiante: string
  estado: EstadoEntrega
  respuestas: RespuestaEntrega[]
}

export type Audiencia = "ESTUDIANTES" | "DOCENTES" | "PADRES" | "DIRECTIVOS" | "ADMINISTRATIVOS"

// Comunicado oficial: canal de solo lectura con un único contenido.
export interface Comunicado {
  conversacionId: number
  titulo: string
  descripcion: string
  audiencia: Audiencia[]
  publicarEn: string
  // HTML del editor; se sanea antes de mostrarlo.
  contenidoHtml: string
  publicadoPor: string
  esCreador: boolean
}
