// Tipos de dominio del chat. El backend aún no existe: la forma la fija el mock.

import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"

// CANAL: en la UI del chat se llama "Foro" (con nombre único y actividades).
// GRUPO: conversación de un grupo de personas (sin nombre único ni actividades).
// FORO: foro con hilos (publicaciones); vive en `/app/comunicaciones/foros`, no en el chat.
export type TipoConversacion = "CANAL" | "DIRECTO" | "FORO" | "GRUPO"

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
  // Menciones pendientes (badge "@" en la lista, como Discord).
  menciones?: number
  // El usuario administra el grupo o foro (comms-service): añade, quita y nombra administradores.
  esAdmin?: boolean
  // Menor marcador de lectura de los miembros (comms-service): un mensaje propio con id menor o
  // igual ya lo leyeron todos (doble check). Llega también en vivo (`conversacion.lectura`).
  leidoHasta?: number | null
  // Grupos: descripción e imagen (`pk_tarchivo`, se ve con token de vista) opcionales.
  descripcion?: string | null
  imagenArchivoId?: number | null
  // Quién escribe en un grupo (decisión de Natalia): ver `lib/modo-grupo.ts`.
  modo?: ModoGrupo
  // Perfiles que escriben en un grupo MODERADO (además de quien lo gestiona).
  rolesEscritura?: PerfilChat[]
}

// ABIERTO: todos escriben; SOLO_LECTURA: solo quien gestiona; MODERADO: quien gestiona y los perfiles elegidos.
export type ModoGrupo = "ABIERTO" | "SOLO_LECTURA" | "MODERADO"

// Membresía: los acudientes entran a un grupo solo si aceptan la invitación.
export type EstadoMiembro = "ACTIVO" | "INVITADO" | "RECHAZADO"

/** Invitación pendiente a un grupo (`GET /comunicaciones/invitaciones`). */
export interface Invitacion {
  conversacionId: number
  nombre: string
  descripcion: string | null
  imagenArchivoId: number | null
  invitadoPor: string | null
  invitadoEn: string | null
  totalMiembros: number
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
  // `pk_tarchivo` en file-service: se ve y descarga con un token de vista. Null en
  // adjuntos del mock o anteriores al file-service (solo nombre).
  archivoId?: number | null
  // Bytes.
  peso?: number | null
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
  // Mensaje que es una votación rápida: se pinta como tarjeta.
  votacion?: VotacionRapida
  reacciones?: Reaccion[]
  // Respuesta citada: el original resumido (las "respuestas citadas" del MVP).
  respuestaA?: CitaMensaje | null
  // Menciones que el servidor reconoció en `texto` (tokens `<@id>`, `@canal`,
  // `@todos`). Un `@todos` sin permiso no aparece acá: queda como texto y no notifica.
  menciones?: Mencion[]
  // El mensaje menciona al usuario actual (directa o masivamente): se resalta.
  meMenciona?: boolean
  // Borrado lógico: se pinta el aviso "Este mensaje fue eliminado". El texto original solo
  // llega a quien modera la conversación (administrador o directivo); a los demás, vacío.
  eliminado?: boolean
  eliminadoEn?: string | null
  // Última edición (marca "Editado HH:MM").
  editadoEn?: string | null
}

export type TipoMencion = "USUARIO" | "CANAL" | "TODOS"

export interface Mencion {
  tipo: TipoMencion
  // Solo en `USUARIO`.
  usuarioId: number | null
  nombre: string
}

export interface CitaMensaje {
  id: number
  autor: string
  texto: string
  // El original se borró: se muestra "Mensaje eliminado".
  eliminado: boolean
}

// Emoji con el que reaccionaron; `mia`: el usuario actual reaccionó con él.
export interface Reaccion {
  emoji: string
  total: number
  mia: boolean
  // Quiénes reaccionaron (tooltip); "Tú" representa al usuario actual.
  personas?: string[]
  // Ids (`users.id_user`) de quienes reaccionaron. Con esto el cliente calcula
  // `mia`: los eventos del socket llegan iguales para todos (`mia: false`).
  usuarios?: number[]
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
  // Backend real: `pk_tarchivo` (para verlo con token), mensaje donde se
  // compartió y peso en bytes.
  archivoId?: number | null
  mensajeId?: number
  peso?: number | null
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
  candidatos: Candidato[]
  votosEnBlanco: number
  // El creador la cerró antes de tiempo desde el menú del canal.
  cerradaManualmente: boolean
  // El usuario actual ya votó (el voto es único).
  yaVoto: boolean
  totalHabilitados: number
  vieronCanal: number
  creadoPor: string
  esCreador: boolean
  // "Permitir comentarios" (paso 1): los participantes escriben en el canal de la elección.
  permiteComentarios?: boolean
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
  // Hora de envío programada (ISO); null si nunca se programó.
  programadoPara?: string | null
}

// Borradores de actividades (comms-service, `tborrador_actividad`): el estado del
// diálogo de creación tal cual, para retomarlo desde "Borradores y enviados".
export type TipoBorradorActividad = "COMUNICADO" | "ENCUESTA" | "ELECCION" | "EVALUACION"

export interface BorradorActividad {
  id: number
  tipo: TipoBorradorActividad
  titulo: string
  // Actividad publicada que se está editando; null si es una nueva.
  conversacionId: number | null
  // Solo lo trae el detalle (`GET /borradores-actividad/:id`).
  datos: Record<string, unknown> | null
  fecha: string
  creado: string
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
  // El usuario actual ya la respondió (se responde una sola vez).
  yaRespondi: boolean
}

// Persona del colegio que se puede añadir a un canal.
export interface Persona {
  id: number
  nombre: string
  correo: string
  // Perfil para la política de mensajes directos (`lib/politica-chat.ts`).
  perfil?: PerfilChat
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
  // Del usuario actual (estudiante): cuántas veces la envió y su última nota.
  intentosUsados: number
  // null = aún no se puede ver (se publica al cierre) o no ha enviado.
  miNota: number | null
  // Hay preguntas de redacción que el docente aún no califica.
  miNotaPendiente: boolean
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
  // Confirmación de lectura (solo para quien lo publicó): destinatarios que ya
  // abrieron el canal / total. comms-service la envía; el mock no.
  leidos?: number | null
  totalDestinatarios?: number | null
}

// Miembro de un canal. Bloqueado = sigue en el canal pero no puede escribir.
export interface Miembro {
  id: number
  nombre: string
  rol: string
  perfil?: PerfilChat
  enLinea: boolean
  bloqueado: boolean
  esAdmin?: boolean
  // INVITADO / RECHAZADO: invitaciones que solo ve quien gestiona el grupo (no son miembros).
  estado?: EstadoMiembro
}

// Votación rápida: una pregunta de dos opciones que se cierra sola al vencer el tiempo.
export type TipoVotacionRapida = "SI_NO" | "VERDADERO_FALSO"

export interface OpcionVotacionRapida {
  id: number
  etiqueta: string
  votos: number
}

export interface VotacionRapida {
  pregunta: string
  tipo: TipoVotacionRapida
  minutos: number
  cierraEn: string
  opciones: OpcionVotacionRapida[]
  // Opción que eligió el usuario actual; null si aún no vota.
  miVoto: number | null
}

// Personas habilitadas para votar en una elección, filtradas por grado o tipo de funcionario.
export type GrupoVotantes = "GRADO" | "FUNCIONARIO"

export interface OpcionesVotantes {
  grados: string[]
  funcionarios: string[]
}

export interface Votante {
  id: number
  nombre: string
  documento: string
  numero: number
}

/**
 * Opción del selector grupal de un grupo (comms-service `/comunicaciones/grupos/seleccion/opciones`):
 * grado (`valor` = nombre, "Sexto"), grupo académico (`valor` = pk_tgrupo, `etiqueta` "Sexto 601",
 * `detalle` = sede) o cargo de funcionario (`valor` = nombre, "Docente"). `total`: personas con
 * matrícula o cargo activo en los establecimientos de quien agrega.
 */
export interface OpcionSeleccion {
  valor: string
  etiqueta: string
  detalle?: string | null
  total: number
}

export interface OpcionesSeleccion {
  grados: OpcionSeleccion[]
  grupos: OpcionSeleccion[]
  roles: OpcionSeleccion[]
}

/** Vista previa de un alta masiva: quiénes entrarían (sin duplicados ni quien ya está). */
export interface ResolucionSeleccion {
  personas: Persona[]
  total: number
  yaEnElGrupo: number
  // De `personas`, cuántas son acudientes: reciben una invitación en lugar de entrar directo.
  invitaciones?: number
}

// Bandeja "Enviados": DIRECTO/CANAL son mensajes; el resto, actividades publicadas.
export type TipoEnviado = "DIRECTO" | "CANAL" | "COMUNICADO" | "ENCUESTA" | "ELECCION" | "EVALUACION"

export interface Enviado {
  clave: string
  tipo: TipoEnviado
  conversacionId: number
  conversacionNombre: string
  // null en actividades: se abre el canal.
  mensajeId: number | null
  texto: string
  fecha: string
}
