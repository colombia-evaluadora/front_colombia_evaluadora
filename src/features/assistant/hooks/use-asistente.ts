import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"

import {
  AgenteError,
  cancelarAccion,
  confirmarAccion,
  crearConversacion,
  enviarMensajeStream,
  mensajeErrorAgente,
  obtenerConversacion,
} from "@/features/assistant/api/agente-client"
import { conversacionesQueryKey } from "@/features/assistant/api/queries"
import type {
  ContextoUi,
  ConversacionDetalle,
  EstadoTurno,
  RespuestaAgente,
} from "@/features/assistant/api/types"
import {
  aplicarAcciones,
  filtrosDisponibles,
  type ResultadoAccion,
} from "@/features/assistant/lib/acciones-ui"
import { definicionFormularios } from "@/features/assistant/lib/registro-ui"

export type EstadoAccionChat = "PENDIENTE" | "CONFIRMANDO" | "CANCELANDO" | "RESUELTA"

export interface MensajeChat {
  id: string
  rol: "user" | "assistant"
  texto: string
  /** Respuesta estructurada (solo en turnos de esta sesión; el historial trae texto). */
  respuesta?: RespuestaAgente
  resultadosUi?: ResultadoAccion[]
  estadoAccion?: EstadoAccionChat
  error?: { mensaje: string; textoOriginal: string | null }
  /** Turno detenido por la persona. */
  detenido?: boolean
}

const CLAVE_SESION = "asistente:conversacion"
const MAX_RUTA = 200

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
    .map((m) => ({
      id: `h-${m.id}`,
      rol: m.rol === "USER" ? "user" : "assistant",
      texto: m.texto,
      respuesta: m.rol === "ASSISTANT" && m.tipoRespuesta ? { tipo: m.tipoRespuesta, texto: m.texto } : undefined,
      // Una confirmación del historial no trae el id de la acción: no se puede
      // confirmar desde acá (brecha del backend).
      estadoAccion: m.tipoRespuesta === "CONFIRMACION" ? "RESUELTA" : undefined,
    }))
}

/**
 * Estado del chat con el agente: conversación actual, envío por SSE con
 * estados, detener, reintentar, confirmar/cancelar escrituras y aplicar las
 * acciones de UI sobre la pantalla abierta.
 */
export function useAsistente() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })

  const [conversacionId, setConversacionId] = useState<string | null>(leerConversacionGuardada)
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [enviando, setEnviando] = useState(false)
  const [estado, setEstado] = useState<EstadoTurno | null>(null)
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null)
  const [historialCargado, setHistorialCargado] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const cambiarConversacion = (id: string | null) => {
    setConversacionId(id)
    guardarConversacion(id)
  }

  const actualizar = (id: string, cambios: Partial<MensajeChat>) =>
    setMensajes((prev) => prev.map((m) => (m.id === id ? { ...m, ...cambios } : m)))

  const search = (location.search ?? {}) as Record<string, unknown>

  function construirContexto(): ContextoUi {
    // `ruta` lleva también la query (sede, grupo, periodo…): el backend la
    // trata como texto y es la única forma de pasarle esos ids hoy.
    const ruta = `${location.pathname}${location.searchStr ?? ""}`.slice(0, MAX_RUTA)
    const formularios = definicionFormularios()
    const filtros = filtrosDisponibles(search)
    return {
      ruta,
      ...(filtros.length > 0 ? { filtros } : {}),
      ...(formularios.length > 0 ? { formularios } : {}),
    }
  }

  function aplicarRespuesta(respuesta: RespuestaAgente): ResultadoAccion[] | undefined {
    if (respuesta.tipo !== "UI" || !respuesta.acciones?.length) return undefined
    return aplicarAcciones(respuesta.acciones, {
      navegar: (url, params) => {
        const [to, query] = url.split("?")
        const desdeUrl = Object.fromEntries(new URLSearchParams(query ?? ""))
        navigate({ to: to as never, search: { ...desdeUrl, ...params } as never })
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

    const idRespuesta = nuevoId()
    setMensajes((prev) => {
      const base = reintentoDe ? prev.filter((m) => m.id !== reintentoDe) : prev
      const conUsuario = reintentoDe ? base : [...base, { id: nuevoId(), rol: "user" as const, texto: limpio }]
      return [...conUsuario, { id: idRespuesta, rol: "assistant" as const, texto: "" }]
    })
    setEnviando(true)
    setEstado(null)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      let id = conversacionId
      if (!id) {
        id = await crearConversacion()
        cambiarConversacion(id)
        setHistorialCargado(id)
      }
      const respuesta = await enviarMensajeStream(
        id,
        { texto: limpio, contextoUi: construirContexto() },
        { signal: controller.signal, onEstado: setEstado },
      )
      actualizar(idRespuesta, {
        texto: respuesta.texto ?? "",
        respuesta,
        estadoAccion: respuesta.accionPendiente ? "PENDIENTE" : undefined,
        resultadosUi: aplicarRespuesta(respuesta),
      })
      queryClient.invalidateQueries({ queryKey: conversacionesQueryKey })
    } catch (error) {
      if (controller.signal.aborted) {
        actualizar(idRespuesta, {
          detenido: true,
          texto: "Detuviste la respuesta. Si el asistente alcanzó a terminarla, la verás al reabrir la conversación.",
        })
      } else {
        // 404 (conversación inexistente o ajena) o 409 por archivada: la
        // siguiente pregunta abre una conversación nueva. El 409 de "turno en
        // curso" no la descarta.
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
    }
  }

  function detener() {
    abortRef.current?.abort()
  }

  function reintentar(mensaje: MensajeChat) {
    if (mensaje.error?.textoOriginal) void enviar(mensaje.error.textoOriginal, { reintentoDe: mensaje.id })
  }

  async function resolverAccion(mensaje: MensajeChat, decision: "confirmar" | "cancelar") {
    const accion = mensaje.respuesta?.accionPendiente
    if (!accion || mensaje.estadoAccion !== "PENDIENTE") return
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
      // Una escritura confirmada cambia datos de la app (planeador, funcionarios…):
      // no se sabe cuáles, así que se marcan todas las queries como viejas.
      if (decision === "confirmar") queryClient.invalidateQueries()
      else queryClient.invalidateQueries({ queryKey: conversacionesQueryKey })
    } catch (error) {
      // 409 ya resuelta / alterada, 410 caducada: la acción no se puede reintentar.
      const status = (error as { response?: { status?: number } }).response?.status
      const definitivo = status === 409 || status === 410 || status === 404
      actualizar(mensaje.id, { estadoAccion: definitivo ? "RESUELTA" : "PENDIENTE" })
      setMensajes((prev) => [
        ...prev,
        { id: nuevoId(), rol: "assistant", texto: "", error: { mensaje: mensajeErrorAgente(error), textoOriginal: null } },
      ])
    }
  }

  return {
    conversacionId,
    mensajes,
    enviando,
    estado,
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
