import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router"

import {
  AgenteError,
  cancelarAccion,
  cancelarTurno,
  confirmarAccion,
  crearConversacion,
  enviarMensajeStream,
  mensajeErrorAgente,
  obtenerConversacion,
} from "@/features/assistant/api/agente-client"
import { conversacionesQueryKey } from "@/features/assistant/api/queries"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type {
  ContextoUi,
  ConversacionDetalle,
  EstadoTurno,
  EventoHerramienta,
  RespuestaAgente,
} from "@/features/assistant/api/types"
import {
  aplicarAcciones,
  filtrosDisponibles,
  type ResultadoAccion,
} from "@/features/assistant/lib/acciones-ui"
import { definicionFormularios, filtrosRegistrados } from "@/features/assistant/lib/registro-ui"
import { construirParametros } from "@/features/assistant/lib/parametros-ui"
import { recortarContexto } from "@/features/assistant/lib/recortar-contexto"
import { leerFormularioDom } from "@/features/assistant/lib/lectura-dom"
import { validarNavegacionSubruta, type RutaRouter } from "@/features/assistant/lib/navegacion-ui"
import { navigationKeys } from "@/features/navigation/api/query-keys"
import type { MenuPermission } from "@/features/navigation/api/types/menu-permission"

export type EstadoAccionChat = "PENDIENTE" | "CONFIRMANDO" | "CANCELANDO" | "RESUELTA"

export interface MensajeChat {
  id: string
  rol: "user" | "assistant"
  texto: string
  /** Respuesta estructurada (en vivo o restaurada del historial). */
  respuesta?: RespuestaAgente
  resultadosUi?: ResultadoAccion[]
  estadoAccion?: EstadoAccionChat
  error?: { mensaje: string; textoOriginal: string | null }
  /** Turno detenido por la persona. */
  detenido?: boolean
}

const CLAVE_SESION = "asistente:conversacion"
const MAX_RUTA = 1000

/** Texto con el que el backend cierra un turno cortado (`/cancelar`). */
export const TEXTO_CANCELADO = "Cancelaste la petición."

/** Paso de una herramienta en el turno en curso (`event: herramienta`). */
export interface PasoHerramienta {
  id: string
  etiqueta: string
  estado: "EN_CURSO" | "OK" | "FALLO"
}

/** Etiquetas genéricas del backend que conviene reemplazar (guía §5.3). */
const ETIQUETAS_HERRAMIENTA: Record<string, string> = {
  buscar_herramientas: "Buscando cómo hacerlo",
  cancelar_accion_pendiente: "Cancelando la acción",
}

/** Espera por defecto tras un 429 sin `Retry-After` (en streaming no llega la cabecera). */
const ESPERA_429_S = 60

/** Ops que modifican un formulario: requieren permiso de crear/editar en `ASISTENTE`. */
const OPS_ESCRITURA_UI = new Set(["RELLENAR", "LIMPIAR_CAMPO"])

function leerConversacionGuardada(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_SESION)
  } catch {
    return null
  }
}

function guardarConversacion(id: string | null) {
  try {
    if (id) sessionStorage.setItem(CLAVE_SESION, id)
    else sessionStorage.removeItem(CLAVE_SESION)
  } catch {
    // Almacenamiento bloqueado: solo se pierde recordar la conversación.
  }
}

let secuencia = 0
const nuevoId = () => `local-${Date.now()}-${++secuencia}`

/** Historial del backend → mensajes del chat (solo los de la persona y el asistente). */
export function aMensajesChat(detalle: ConversacionDetalle): MensajeChat[] {
  return detalle.mensajes
    .filter((m) => m.rol === "USER" || m.rol === "ASSISTANT")
    .sort((a, b) => a.secuencia - b.secuencia)
    .map((m) => {
      // Mensajes viejos sin `respuesta`: texto + tipo.
      const respuesta =
        m.rol === "ASSISTANT"
          ? (m.respuesta ?? (m.tipoRespuesta ? { tipo: m.tipoRespuesta, texto: m.texto } : undefined))
          : undefined
      const accion = respuesta?.accionPendiente
      // Solo una acción PENDIENTE vuelve a mostrar botones; la UI del historial no se reaplica.
      const estadoAccion: EstadoAccionChat | undefined = accion
        ? accion.estado === "PENDIENTE"
          ? "PENDIENTE"
          : "RESUELTA"
        : m.tipoRespuesta === "CONFIRMACION"
          ? "RESUELTA"
          : undefined
      return {
        id: `h-${m.id}`,
        rol: m.rol === "USER" ? ("user" as const) : ("assistant" as const),
        texto: m.texto,
        respuesta,
        estadoAccion,
      }
    })
}

/** Estado del chat con el agente. */
export function useAsistente({ puedeAccionar = true }: { puedeAccionar?: boolean } = {}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const router = useRouter()
  const location = useRouterState({ select: (s) => s.location })

  const [conversacionId, setConversacionId] = useState<string | null>(leerConversacionGuardada)
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [enviando, setEnviando] = useState(false)
  const [estado, setEstado] = useState<EstadoTurno | null>(null)
  const [herramientas, setHerramientas] = useState<PasoHerramienta[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null)
  const [historialCargado, setHistorialCargado] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Tras un 429 no se envía hasta esta hora (ms).
  const esperarHastaRef = useRef(0)
  // El turno ejecutó una herramienta del chat (p. ej. enviar un mensaje en nombre del usuario).
  const tocoChatRef = useRef(false)

  const cambiarConversacion = (id: string | null) => {
    setConversacionId(id)
    guardarConversacion(id)
  }

  const actualizar = (id: string, cambios: Partial<MensajeChat>) =>
    setMensajes((prev) => prev.map((m) => (m.id === id ? { ...m, ...cambios } : m)))

  const search = (location.search ?? {}) as Record<string, unknown>

  function construirContexto(): ContextoUi {
    // Solo el path: los ids van en `parametros`.
    const ruta = location.pathname.slice(0, MAX_RUTA)
    // Sin formularios registrados, se lee lo visible del DOM (solo lectura).
    const registrados = definicionFormularios()
    const delDom = registrados.length === 0 ? leerFormularioDom() : null
    const formularios = delDom ? [delDom] : registrados
    const filtros = filtrosDisponibles(search)
    // URL primero, después los filtros del listado.
    const parametros = construirParametros(search, filtrosRegistrados()?.valores?.())
    return recortarContexto({
      ruta,
      ...(filtros.length > 0 ? { filtros } : {}),
      ...(Object.keys(parametros).length > 0 ? { parametros } : {}),
      ...(formularios.length > 0 ? { formularios } : {}),
    })
  }

  /** Relee el historial del servidor (estado real de las acciones); `extra` se agrega al final. */
  async function refrescarDetalle(id: string, extra: MensajeChat[] = []) {
    try {
      const detalle = await queryClient.fetchQuery({
        queryKey: ["asistente", "conversacion", id],
        queryFn: () => obtenerConversacion(id),
        staleTime: 0,
      })
      setMensajes([...aMensajesChat(detalle), ...extra])
    } catch {
      if (extra.length > 0) setMensajes((prev) => [...prev, ...extra])
    }
  }

  function aplicarRespuesta(respuesta: RespuestaAgente): ResultadoAccion[] | undefined {
    if (respuesta.tipo !== "UI" || !respuesta.acciones?.length) return undefined
    // Sin permiso de crear/editar en `ASISTENTE`, el agente no toca formularios.
    const acciones = puedeAccionar ? respuesta.acciones : respuesta.acciones.filter((a) => !OPS_ESCRITURA_UI.has(a.op))
    return aplicarAcciones(acciones, {
      navegar: (url, params) => {
        const [to, query] = url.split("?")
        const desdeUrl = Object.fromEntries(new URLSearchParams(query ?? ""))
        navigate({ to: to as never, search: { ...desdeUrl, ...params } as never })
      },
      navegarSubruta: (accion) => {
        const resultado = validarNavegacionSubruta(accion, {
          rutaDelRouter: (patron) =>
            (router.routesByPath as Record<string, RutaRouter | undefined>)[patron],
          permisos: queryClient.getQueryData<MenuPermission[]>(navigationKeys.permisosMenu),
        })
        if (!resultado.ok) return resultado.motivo
        const { to, params, search } = resultado.destino
        navigate({ to: to as never, params: params as never, search: search as never })
        return null
      },
      aplicarFiltrosUrl: (filtros) =>
        navigate({
          to: location.pathname as never,
          search: ((prev: Record<string, unknown>) => ({ ...prev, ...filtros, page: 0 })) as never,
          replace: true,
        }),
      filtrosDeLaPantalla: filtrosDisponibles(search),
    })
  }

  async function cargarConversacion(id: string) {
    abortRef.current?.abort()
    setCargandoHistorial(true)
    setErrorHistorial(null)
    try {
      const detalle = await queryClient.fetchQuery({
        queryKey: ["asistente", "conversacion", id],
        queryFn: () => obtenerConversacion(id),
      })
      setMensajes(aMensajesChat(detalle))
      cambiarConversacion(id)
      setHistorialCargado(id)
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        // Archivada, vencida o de otra sesión: se arranca de cero.
        cambiarConversacion(null)
      }
      setErrorHistorial(mensajeErrorAgente(error))
      setMensajes([])
    } finally {
      setCargandoHistorial(false)
    }
  }

  /** Recupera la última conversación de la pestaña al abrir el sheet por primera vez. */
  function restaurar() {
    if (conversacionId && historialCargado !== conversacionId && !cargandoHistorial) {
      void cargarConversacion(conversacionId)
    }
  }

  function nuevaConversacion() {
    abortRef.current?.abort()
    cambiarConversacion(null)
    setHistorialCargado(null)
    setMensajes([])
    setErrorHistorial(null)
  }

  async function enviar(texto: string, { reintentoDe }: { reintentoDe?: string } = {}) {
    const limpio = texto.trim()
    if (!limpio || enviando) return
    const restante = Math.ceil((esperarHastaRef.current - Date.now()) / 1000)
    if (restante > 0) {
      setMensajes((prev) => [
        ...prev,
        { id: nuevoId(), rol: "assistant", texto: "", error: { mensaje: `Has enviado demasiados mensajes. Espera ${restante} s.`, textoOriginal: null } },
      ])
      return
    }

    const idRespuesta = nuevoId()
    setMensajes((prev) => {
      const base = reintentoDe ? prev.filter((m) => m.id !== reintentoDe) : prev
      const conUsuario = reintentoDe ? base : [...base, { id: nuevoId(), rol: "user" as const, texto: limpio }]
      return [...conUsuario, { id: idRespuesta, rol: "assistant" as const, texto: "" }]
    })
    setEnviando(true)
    setEstado(null)
    setHerramientas([])
    tocoChatRef.current = false
    const controller = new AbortController()
    abortRef.current = controller

    let id = conversacionId
    try {
      if (!id) {
        id = await crearConversacion()
        cambiarConversacion(id)
        setHistorialCargado(id)
      }
      const respuesta = await enviarMensajeStream(
        id,
        { texto: limpio, contextoUi: construirContexto() },
        { signal: controller.signal, onEstado: setEstado, onHerramienta: registrarHerramienta },
      )
      setMensajes((prev) =>
        prev.map((m) => {
          if (m.id === idRespuesta) {
            return {
              ...m,
              texto: respuesta.texto ?? "",
              respuesta,
              estadoAccion: respuesta.accionPendiente ? ("PENDIENTE" as const) : undefined,
            }
          }
          // Una propuesta nueva deja sin efecto la anterior: botones solo en la última.
          return respuesta.accionPendiente && m.estadoAccion === "PENDIENTE" ? { ...m, estadoAccion: "RESUELTA" as const } : m
        }),
      )
      actualizar(idRespuesta, { resultadosUi: aplicarRespuesta(respuesta) })
      queryClient.invalidateQueries({ queryKey: conversacionesQueryKey })
      // Una escritura directa del asistente en el chat (enviar un mensaje como el usuario) no pasa
      // por las mutaciones del chat: sin esto el hilo propio no mostraba el mensaje enviado.
      if (tocoChatRef.current) queryClient.invalidateQueries({ queryKey: chatKeys.all })
    } catch (error) {
      if (controller.signal.aborted) {
        actualizar(idRespuesta, {
          detenido: true,
          // Mismo texto que guarda el backend.
          texto: TEXTO_CANCELADO,
          respuesta: { tipo: "RESPUESTA", texto: TEXTO_CANCELADO },
        })
      } else if (error instanceof AgenteError && error.cortado && id) {
        // El turno pudo terminar en el servidor: se relee en vez de reintentar.
        await refrescarDetalle(id)
      } else {
        if (error instanceof AgenteError && error.status === 429) {
          esperarHastaRef.current = Date.now() + (error.reintentarEn ?? ESPERA_429_S) * 1000
        }
        // 404 o 409 por archivada: la próxima pregunta abre conversación nueva.
        const status = error instanceof AgenteError ? error.status : null
        if (status === 404 || (status === 409 && /archivada/i.test((error as Error).message))) {
          cambiarConversacion(null)
        }
        const reintentable = !(error instanceof AgenteError) || [409, 429, 500, 502, 503, 504].includes(error.status)
        actualizar(idRespuesta, {
          error: { mensaje: mensajeErrorAgente(error), textoOriginal: reintentable ? limpio : null },
        })
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setEnviando(false)
      setEstado(null)
      setHerramientas([])
    }
  }

  function registrarHerramienta(evento: EventoHerramienta) {
    if (!evento?.id || !evento.etiqueta) return
    if (/comunicaciones/i.test(evento.herramienta ?? "")) tocoChatRef.current = true
    // El id se repite con herramientas descubiertas a mitad de turno.
    const clave = `${evento.id}|${evento.herramienta}`
    const etiqueta = ETIQUETAS_HERRAMIENTA[evento.herramienta] ?? evento.etiqueta
    const estadoPaso: PasoHerramienta["estado"] =
      evento.fase === "FIN" ? (evento.ok === false ? "FALLO" : "OK") : "EN_CURSO"
    setHerramientas((prev) => {
      const existente = prev.some((p) => p.id === clave)
      return existente
        ? prev.map((p) => (p.id === clave ? { ...p, estado: estadoPaso } : p))
        : [...prev, { id: clave, etiqueta, estado: estadoPaso }]
    })
  }

  /** Corta la conexión y pide al backend cancelar el turno. */
  function detener() {
    const enCurso = abortRef.current
    if (!enCurso) return
    enCurso.abort()
    if (conversacionId) {
      void cancelarTurno(conversacionId)
        .catch(() => false)
        .finally(() => queryClient.invalidateQueries({ queryKey: conversacionesQueryKey }))
    }
  }

  function reintentar(mensaje: MensajeChat) {
    if (mensaje.error?.textoOriginal) void enviar(mensaje.error.textoOriginal, { reintentoDe: mensaje.id })
  }

  async function resolverAccion(mensaje: MensajeChat, decision: "confirmar" | "cancelar") {
    const accion = mensaje.respuesta?.accionPendiente
    if (!accion || mensaje.estadoAccion !== "PENDIENTE" || !puedeAccionar) return
    actualizar(mensaje.id, { estadoAccion: decision === "confirmar" ? "CONFIRMANDO" : "CANCELANDO" })
    try {
      const respuesta = decision === "confirmar" ? await confirmarAccion(accion.id) : await cancelarAccion(accion.id)
      actualizar(mensaje.id, { estadoAccion: "RESUELTA" })
      setMensajes((prev) => [
        ...prev,
        {
          id: nuevoId(),
          rol: "assistant",
          texto: respuesta.texto ?? "",
          respuesta,
          resultadosUi: aplicarRespuesta(respuesta),
        },
      ])
      // Un 200 puede ser un rechazo (FALLIDA): el historial trae el estado real.
      if (conversacionId) await refrescarDetalle(conversacionId)
      // No se sabe qué datos cambió: se invalida todo.
      if (decision === "confirmar") queryClient.invalidateQueries()
      else queryClient.invalidateQueries({ queryKey: conversacionesQueryKey })
    } catch (error) {
      // 409 ya resuelta / alterada, 410 caducada: la acción no se puede reintentar.
      const status = (error as { response?: { status?: number } }).response?.status
      const definitivo = status === 409 || status === 410 || status === 404
      actualizar(mensaje.id, { estadoAccion: definitivo ? "RESUELTA" : "PENDIENTE" })
      const aviso: MensajeChat = { id: nuevoId(), rol: "assistant", texto: "", error: { mensaje: mensajeErrorAgente(error), textoOriginal: null } }
      // Sin respuesta (timeout/red) la escritura pudo ejecutarse: también se relee.
      if (conversacionId && (definitivo || status == null)) await refrescarDetalle(conversacionId, [aviso])
      else setMensajes((prev) => [...prev, aviso])
    }
  }

  return {
    conversacionId,
    mensajes,
    enviando,
    estado,
    herramientas,
    puedeAccionar,
    cargandoHistorial,
    errorHistorial,
    enviar,
    detener,
    reintentar,
    confirmar: (m: MensajeChat) => resolverAccion(m, "confirmar"),
    cancelar: (m: MensajeChat) => resolverAccion(m, "cancelar"),
    cargarConversacion,
    nuevaConversacion,
    restaurar,
  }
}
