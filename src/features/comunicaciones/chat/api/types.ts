// Tipos de dominio del chat. El backend aún no existe: la forma la fija el mock.

import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"

// CANAL: en la UI del chat se llama "Foro" (con nombre único y actividades).
// GRUPO: conversación de un grupo de personas (sin nombre único ni actividades).
export type TipoConversacion = "CANAL" | "DIRECTO" | "GRUPO"

// Qué representa el canal; cambia el ícono de la lista.
export type CategoriaCanal = "GENERAL" | "VOTACION" | "ENCUESTA" | "EXAMEN" | "ANUNCIO"

// NINGUNA quita el silencio ("Activar notificaciones"): comms-service deja silenciado_hasta en NULL.
// 1H y FIN_DIA (medianoche hora Colombia) desde la tarjeta 7; 8H/1S se conservan por compatibilidad.
export type SilencioDuracion = "1H" | "8H" | "FIN_DIA" | "1S" | "SIEMPRE" | "NINGUNA"

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
  // Vista previa de la lista (diseño 4516:68095): último mensaje visible, en texto plano recortado
  // por comms-service. Null si la conversación no tiene mensajes. Llega también en vivo con
  // `conversacion.actualizada`.
  ultimoMensaje?: UltimoMensaje | null
  // Última duración de silencio elegida (solo mientras está silenciada).
  silencioDuracion?: Exclude<SilencioDuracion, "NINGUNA"> | null
  // Medios por los que avisa la conversación (comms-service, V560 alerta_*). Sin campo = defecto
  // (campana y sonido sí, correo no). El sonido requiere la campana.
  alertaCampana?: boolean
  alertaSonido?: boolean
  alertaCorreo?: boolean
  // Comunicado marcado como importante (comms-service): ícono y etiqueta en la lista.
  importante?: boolean
}

export type TipoUltimoMensaje = "NORMAL" | "SISTEMA" | "BOT"

export interface UltimoMensaje {
  texto: string
  autor: string
  esPropio: boolean
  enviadoEn: string
  tipo: TipoUltimoMensaje
}

/**
 * Tarjeta de Colevabot (diseño 4428:64360): encabezado ("NUEVA SOLICITUD DE APROBACIÓN"), título,
 * campos "Etiqueta: valor" y acciones que abren pantallas de la app (`/app/...`). La publica
 * comms-service en la conversación `esBot` del usuario.
 */
export interface TarjetaBot {
  clave: string | null
  encabezado: string | null
  titulo: string
  descripcion: string | null
  campos: { etiqueta: string; valor: string }[]
  acciones: { etiqueta: string; url: string }[]
  /** Solicitud de aprobación que respalda la tarjeta (Regla 70); null en las demás tarjetas. */
  aprobacion?: AprobacionBot | null
}

export type EstadoSolicitudAprobacion = "PENDIENTE" | "APROBADA" | "RECHAZADA"

/**
 * `resolver`: tarjeta del aprobador; el front ofrece Aprobar / Rechazar con los mismos servicios de
 * Gestión académica y consulta el estado vigente en vivo. Sin `resolver` es la del docente y
 * `estado` es el del momento del aviso. En `CORRECCION_RESULTADO` la tarjeta representa la planilla
 * (grupo, asignatura, periodo), no una sola nota.
 */
export interface AprobacionBot {
  solicitudId: number
  tipo: string
  estado: EstadoSolicitudAprobacion
  grupoId: number | null
  asignaturaId: number | null
  periodoId: number | null
  matriculaId: number | null
  resolver: boolean
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
  // Estado tal como lo ve quien lee (comms-service con V560); null en la forma que difunde el socket.
  disponibilidad?: EstadoDisponibilidad | null
}

/** Disponibilidad del chat. DESCONECTADO no se elige: es no tener sesión abierta (o no poder verla). */
export type EstadoDisponibilidad = "EN_LINEA" | "AUSENTE" | "OCUPADO" | "INVISIBLE" | "DESCONECTADO"

/** `GET/PATCH /comunicaciones/disponibilidad`: el estado propio y sus preferencias. */
export interface MiDisponibilidad {
  estado: Exclude<EstadoDisponibilidad, "DESCONECTADO">
  // MANUAL: lo eligió el usuario; AUTO: Ausente por inactividad.
  origen: "MANUAL" | "AUTO"
  cambiadoEn: string | null
  respuestaAutomatica: string | null
  // Perfiles que ven el estado; el resto lo ve desconectado.
  visiblePara: PerfilChat[]
  inactividadMinutos: number
}

/** `GET /comunicaciones/disponibilidad/directos`: la otra persona de cada directo. */
export interface DisponibilidadDirecto {
  conversacionId: number
  usuarioId: number
  estado: EstadoDisponibilidad
}

/** Evento `respuesta.automatica` (tópico personal): la otra persona del directo está Ausente. */
export interface RespuestaAutomatica {
  conversacionId: number
  usuarioId: number
  nombre: string
  texto: string
  fecha: string
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
  // `pk_tmensaje_adjunto` (V560): con él se registra la descarga y se quita un archivo
  // puntual. Null en adjuntos anteriores a la tabla (se quitan por el mensaje).
  id?: number | null
  // Alguien distinto del autor ya lo descargó: el autor ya no puede quitarlo.
  descargado?: boolean
}

export interface Mensaje {
  id: number
  conversacionId: number
  autor: AutorMensaje
  esPropio: boolean
  texto: string
  fecha: string
  // Primer archivo vigente (compatibilidad); `adjuntos` trae todos, en orden (hasta 10).
  adjunto: AdjuntoMensaje | null
  adjuntos?: AdjuntoMensaje[]
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
  // Tarjeta de Colevabot: se pinta como tarjeta estructurada; `texto` es su título.
  bot?: TarjetaBot | null
  // Mensaje propio que pidió confirmación de lectura: estado y receptores (comms-service).
  confirmacion?: ConfirmacionLectura | null
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
  // `pk_tmensaje_adjunto` para registrar la descarga; `descargado`: otra persona ya lo
  // bajó, así que quien lo compartió no puede eliminarlo.
  adjuntoId?: number | null
  descargado?: boolean
}

export interface Candidato {
  id: number
  nombre: string
  numero: string
  lema: string
  fotoUrl: string | null
  // null mientras la elección sigue abierta: nadie (ni quien la creó) ve conteos antes del cierre.
  votos: number | null
}

export interface Eleccion {
  conversacionId: number
  nombre: string
  descripcion: string
  fechaInicio: string | null
  // Sin fecha de cierre la votación sigue abierta hasta cerrarla a mano.
  fechaCierre: string | null
  jornadaId: number
  candidatos: Candidato[]
  // null mientras la elección sigue abierta (igual que `Candidato.votos`).
  votosEnBlanco: number | null
  // Participación ("ya votaron"): abierta solo le llega a quien gestiona; cerrada, a todos.
  votaron: number | null
  // El creador la cerró antes de tiempo desde el menú del canal.
  cerradaManualmente: boolean
  // El usuario actual ya votó (el voto es único).
  yaVoto: boolean
  totalHabilitados: number
  vieronCanal: number
  creadoPor: string
  esCreador: boolean
  // Gestiona la actividad (comms-service `BaseActividades#gestiona`): su creador mientras siga en el
  // canal, los ADMIN del canal y los directivos miembros. Opcional: el mock no lo manda.
  gestiona?: boolean
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
  // Gestiona la actividad (comms-service `BaseActividades#gestiona`): su creador mientras siga en el
  // canal, los ADMIN del canal y los directivos miembros. Opcional: el mock no lo manda.
  gestiona?: boolean
  // El usuario actual ya la respondió (se responde una sola vez).
  yaRespondi: boolean
}

// Persona del colegio que se puede añadir a un canal.
export interface Persona {
  id: number
  nombre: string
  // Solo para el filtro local del buscador: los listados del chat NO lo muestran (QA 57).
  correo: string
  // Perfil para la política de mensajes directos (`lib/politica-chat.ts`).
  perfil?: PerfilChat
  // Rol legible (Rector, Coordinador, Docente, Acudiente…) que calcula comms-service
  // (`PoliticaChat.cargo`); se muestra con `rolVisible`.
  cargo?: string
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
  // null en la vista del estudiante: no se le muestran puntos por pregunta.
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
  // null en la vista del estudiante: comms-service lo ignora para él (solo ve la nota calificada).
  mostrarResultados: MostrarResultados
  preguntas: PreguntaEvaluacion[]
  creadoPor: string
  esCreador: boolean
  // Gestiona la actividad (comms-service `BaseActividades#gestiona`): su creador mientras siga en el
  // canal, los ADMIN del canal y los directivos miembros. Opcional: el mock no lo manda.
  gestiona?: boolean
  // Del usuario actual (estudiante): cuántas veces la envió y su última nota.
  intentosUsados: number
  // Nota del último intento; null = pendiente de calificación o no ha enviado.
  miNota: number | null
  // El último intento aún no está calificado.
  miNotaPendiente: boolean
  // Del estudiante, por intento: solo la nota calificada (nunca respuestas, correctas ni puntos
  // por pregunta). Opcional: la vista de gestión no lo usa.
  misIntentos?: IntentoEvaluacion[]
}

export interface IntentoEvaluacion {
  numero: number
  estado: "PENDIENTE" | "CALIFICADA"
  nota: number | null
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

// Comunicado oficial: canal con un único contenido (y respuestas solo si quien lo publica las permite).
export interface Comunicado {
  conversacionId: number
  titulo: string
  descripcion: string
  // Audiencia por rol; puede ir vacía si se eligieron destinos.
  audiencia: Audiencia[]
  publicarEn: string
  // HTML del editor; se sanea antes de mostrarlo.
  contenidoHtml: string
  publicadoPor: string
  esCreador: boolean
  // Gestiona la actividad (comms-service `BaseActividades#gestiona`): su creador mientras siga en el
  // canal, los ADMIN del canal y los directivos miembros. Opcional: el mock no lo manda.
  gestiona?: boolean
  // Confirmación de lectura (solo para quien lo publicó): destinatarios que ya
  // lo vieron / total. comms-service la envía; el mock también.
  leidos?: number | null
  totalDestinatarios?: number | null
  // Grados, grupos, cargos, personas y grupos del chat elegidos (con su etiqueta).
  destinos?: DestinosComunicado | null
  // Destacado para quien lo recibe (ícono y etiqueta en la lista y en el panel).
  importante?: boolean
  // Lo decide quien lo publica; apagado, nadie escribe en el canal.
  permiteRespuestas?: boolean
  adjuntos?: AdjuntoComunicado[]
  // Mensaje de apertura fijado (no se repite en la conversación de respuestas).
  mensajeId?: number | null
}

export interface OpcionDestino {
  valor: string
  etiqueta: string
}

export interface DestinosComunicado {
  grados: OpcionDestino[]
  grupos: OpcionDestino[]
  roles: OpcionDestino[]
  usuarios: OpcionDestino[]
  gruposChat: OpcionDestino[]
  para: "ESTUDIANTES" | "ACUDIENTES" | "AMBOS"
  // Filtros que acotan (no suman) la audiencia, los grados, grupos y cargos dentro del alcance de
  // quien publica. Opcionales: los comunicados anteriores no los traen.
  establecimiento?: OpcionDestino | null
  sedes?: OpcionDestino[]
  jornadas?: OpcionDestino[]
}

export interface AdjuntoComunicado {
  id: number
  archivoId: number
  nombre: string
  formato: FormatoArchivo
  peso: number
}

// Registro de recepción por destinatario (solo lo ve quien publicó el comunicado).
export interface RecepcionComunicado {
  usuarioId: number
  nombre: string
  estado: "LEIDO" | "NO_LEIDO"
  // Cuándo salió el aviso; null mientras siga programado.
  entregadoEn: string | null
  // Cuándo lo abrió; null si no lo ha visto o si lo leyó antes de existir el registro.
  vistoEn: string | null
}

// Miembro de un canal. Bloqueado = sigue en el canal pero no puede escribir.
export interface Miembro {
  id: number
  nombre: string
  // Rol en el canal ("Administrador" / "Miembro" o el estado de la invitación).
  rol: string
  perfil?: PerfilChat
  // Rol legible del usuario (como `Persona.cargo`).
  cargo?: string
  enLinea: boolean
  bloqueado: boolean
  esAdmin?: boolean
  // INVITADO / RECHAZADO: invitaciones que solo ve quien gestiona el grupo (no son miembros).
  estado?: EstadoMiembro
  // Disponibilidad tal como la ve quien pide la lista (comms-service con V560).
  disponibilidad?: EstadoDisponibilidad
}

// Votación rápida: una pregunta de dos opciones que se cierra sola al vencer el tiempo.
export type TipoVotacionRapida = "SI_NO" | "VERDADERO_FALSO"

export interface OpcionVotacionRapida {
  id: number
  etiqueta: string
  // null mientras la votación sigue abierta: el resultado se conoce al cierre.
  votos: number | null
}

export interface VotacionRapida {
  pregunta: string
  tipo: TipoVotacionRapida
  minutos: number
  cierraEn: string
  opciones: OpcionVotacionRapida[]
  // Opción que eligió el usuario actual; null si aún no vota.
  miVoto: number | null
  // Cerrada por tiempo o a mano ("Cerrar votación"). Opcional: un mensaje viejo en caché no lo trae.
  cerrada?: boolean
  // Total de votos: abierta solo le llega a quien la creó; cerrada, a todos.
  totalVotos?: number | null
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

/**
 * Selector de destinatarios de un comunicado (comms-service `/comunicaciones/comunicados/destinos/opciones`):
 * todo dentro del alcance de quien publica (super administrador: cualquier establecimiento; rector: su
 * establecimiento; coordinador: sus sedes y jornadas; docente: sus grupos) y acotado en cascada por
 * establecimiento → sede → jornada. `audiencias`: las de rol que puede usar (el docente, solo
 * estudiantes y acudientes). `todos`: super administrador, que elige el establecimiento.
 */
export interface OpcionesComunicado extends OpcionesSeleccion {
  establecimientos: OpcionSeleccion[]
  sedes: OpcionSeleccion[]
  jornadas: OpcionSeleccion[]
  audiencias: Audiencia[]
  todos: boolean
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

// Confirmación de lectura de un mensaje propio (HU 7): ENVIADO (nadie lo recibió), ENTREGADO
// (todos lo recibieron o alguno lo leyó) y LEIDO (todos lo leyeron). Quien no permite la
// confirmación nunca pasa de entregado.
export type EstadoConfirmacion = "ENVIADO" | "ENTREGADO" | "LEIDO"

export interface LectorMensaje {
  id: number
  nombre: string
  entregadoEn: string | null
  leidoEn: string | null
}

export interface ConfirmacionLectura {
  estado: EstadoConfirmacion
  total: number
  entregados: number
  leidos: number
  lectores: LectorMensaje[]
}

// Ajustes del chat del usuario (`GET/PUT /comunicaciones/ajustes`).
export interface AjustesChat {
  confirmacionLecturaPermitir: boolean
  confirmacionLecturaSolicitar: boolean
  sonido: boolean
}

export interface AlertasConversacion {
  campana: boolean
  sonido: boolean
  correo: boolean
}
