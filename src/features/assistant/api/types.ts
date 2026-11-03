// Contrato del agente (`/api/ai/agente/**`), tal cual lo serializa el backend.

/** Tipo de una respuesta del turno (`TipoRespuesta`). */
export type TipoRespuesta =
  | "RESPUESTA"
  | "PREGUNTA"
  | "CONFIRMACION"
  | "UI"
  | "DATOS"
  | "BLOQUEADO"
  | "SIN_PERMISO"

/** Un dato que falta para seguir; `opciones` se muestran como botones. */
export interface Faltante {
  campo: string
  pregunta: string
  opciones?: string[]
}

/** Escritura propuesta que espera Confirmar / Cancelar (caduca a los 10 min). */
export interface AccionPendiente {
  id: string
  resumen: string
  /** `LocalDateTime` del servidor, sin zona (`2026-10-13T15:10:00`). */
  expira: string
  /** Estado actual; en vivo siempre `PENDIENTE`. */
  estado?: EstadoAccionPendiente
}

export type EstadoAccionPendiente = "PENDIENTE" | "EJECUTADA" | "FALLIDA" | "DESCARTADA" | "EXPIRADA"

/** Acción de UI; el front descarta `op` y formularios desconocidos. */
export type AccionUi =
  | {
      op: "NAVEGAR"
      pantalla: string
      /** Ruta concreta (`/app/.../detalle/12`): en una subruta ya trae sus `$params` sustituidos. */
      url: string
      /** Search params de la ruta destino. */
      params?: Record<string, string>
      /** Código de la subruta del catálogo (`lib/catalogo-rutas.ts`) cuando no es la pantalla del menú. */
      subruta?: string
    }
  | { op: "RELLENAR"; formulario: string; valores: Record<string, unknown> }
  | { op: "LIMPIAR_CAMPO"; formulario: string; campo: string }
  | { op: "RESALTAR"; formulario: string; campo: string }
  | { op: "ABRIR_PESTANA"; pestana: string }
  | { op: "APLICAR_FILTROS"; filtros: Record<string, unknown> }

export interface DatosTabla {
  columnas: string[]
  filas: Record<string, unknown>[]
}

/** Respuesta de un turno. Los campos que no aplican al `tipo` no vienen. */
export interface RespuestaAgente {
  tipo: TipoRespuesta
  texto?: string
  faltantes?: Faltante[]
  accionPendiente?: AccionPendiente
  acciones?: AccionUi[]
  datos?: DatosTabla
}

export type EstadoConversacion = "ACTIVA" | "ARCHIVADA" | "BLOQUEADA"

export interface ConversacionResumen {
  id: string
  titulo: string | null
  estado: EstadoConversacion
  ultimoMensajeAt: string | null
  createdAt: string
}

export type RolMensaje = "USER" | "ASSISTANT" | "TOOL" | "SYSTEM"

/** Mensaje del historial. */
export interface MensajeHistorial {
  id: number
  secuencia: number
  rol: RolMensaje
  texto: string
  tipoRespuesta?: TipoRespuesta
  createdAt: string
  /** Respuesta completa del turno (solo `ASSISTANT`). */
  respuesta?: RespuestaAgente
}

export interface ConversacionDetalle {
  conversacion: ConversacionResumen
  mensajes: MensajeHistorial[]
}

/** Pasos del turno que emite el streaming (`EstadoTurno`). */
export type EstadoTurno =
  | "RECIBIDO"
  | "VALIDADO"
  | "INTENCION"
  | "PERMISO_OK"
  | "RECOLECTANDO"
  | "PREGUNTA"
  | "PENDIENTE_CONFIRMACION"
  | "RESPUESTA"
  | "BLOQUEADO"
  | "SIN_PERMISO"
  | "EJECUTADA"
  | "FALLIDA"
  | "DESCARTADA"
  | "EXPIRADA"

// ─── contextoUi ───────────────────────────────────────────────────────────

export type TipoCampoUi =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "checkbox"
  | "select"
  | "radio"
  | "autocomplete"

export interface CampoUi {
  nombre: string
  etiqueta: string
  tipo: TipoCampoUi
  obligatorio?: boolean
  valor?: unknown
  /** Error de validación que la pantalla muestra en el campo. */
  error?: string
  opciones?: { valor: string; etiqueta: string }[]
}

export interface FormularioUi {
  /** Debe coincidir con `ai.ui_formulario.codigo` del backend. */
  codigo: CodigoFormularioAgente
  /** Id del registro que se edita; vacío en altas. */
  entidad: string
  campos: CampoUi[]
}

/** Formularios que el backend registra para la UI asistida (V557.2). */
export type CodigoFormularioAgente =
  | "funcionario.crear"
  | "funcionario.editar"
  | "planeador.actividad"
  | "planeador.unidad"
  // Registrados en código en el backend (`FormulariosFront`), sin fila en ai.ui_formulario.
  | "periodo_academico"
  | "matricula.estudiante"
  /** Lectura genérica por DOM de un formulario no registrado: el agente lo lee, no lo rellena. */
  | "pantalla.lectura"

export interface ContextoUi {
  /** Path de la pantalla, sin query. */
  ruta: string
  filtros?: string[]
  /** Escalares que identifican la pantalla (ids de la URL, filtros aplicados…), máx. 30. */
  parametros?: Record<string, string | number | boolean>
  formularios?: FormularioUi[]
}

export interface MensajeRequest {
  texto: string
  contextoUi?: ContextoUi
}

// ─── Streaming: progreso de herramientas (SSO #696) ───────────────────────

/** `event: herramienta`: una por inicio y otra por fin de cada herramienta. */
export interface EventoHerramienta {
  id: string
  /** Código interno: no se muestra. */
  herramienta: string
  /** Texto para la persona ("Consultando sedes"). */
  etiqueta: string
  fase: "INICIO" | "FIN"
  ok?: boolean
}

// ─── Sugerencias (`GET /sugerencias?ruta=`) ──────────────────────────────

export type TipoSugerencia = "CONSULTA" | "ACCION" | "NAVEGACION" | "AYUDA"

export interface Sugerencia {
  texto: string
  tipo: TipoSugerencia
}

export interface CapacidadesAgente {
  consultar: boolean
  proponerAcciones: boolean
  estadisticas: boolean
  navegar: boolean
  rellenarFormularios: boolean
  modulos: string[]
}

export interface SugerenciasRespuesta {
  pantalla?: { codigo: string; nombre: string; menu: string; url: string }
  sugerencias: Sugerencia[]
  capacidades?: CapacidadesAgente
}
