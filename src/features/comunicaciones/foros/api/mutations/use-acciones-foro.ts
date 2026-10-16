import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Conversacion, Mensaje } from "@/features/comunicaciones/chat/api/types"
import { upsertMensaje } from "@/features/comunicaciones/chat/api/use-chat-tiempo-real"
import { formatoDeArchivo } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { forosKeys } from "@/features/comunicaciones/foros/api/query-keys"
import type { ColorEtiqueta, EtiquetaForo, Publicacion } from "@/features/comunicaciones/foros/api/types"
import { fusionarPublicacion } from "@/features/comunicaciones/foros/lib/foros"

/**
 * Escrituras de los foros. Cuerpos UPPER_SNAKE y flags `"S"|"N"` como el resto
 * de comunicaciones. Ninguna se encola sin conexión: la pantalla las deshabilita
 * con `useOnlineOnly`. Los mensajes de éxito y error los muestra quien llama.
 */

const pub = (id: number) => `/comunicaciones/foros/publicaciones/${id}`
const flag = (v: boolean) => (v ? "S" : "N")

type PaginasPublicaciones = InfiniteData<Publicacion[], number>

/** Reemplaza la publicación en el detalle y en todos los listados de su foro. */
export function actualizarPublicacionEnCache(queryClient: QueryClient, p: Publicacion, fuente: "rest" | "socket") {
  queryClient.setQueryData<Publicacion>(forosKeys.publicacion(p.id), (prev) =>
    fuente === "rest" ? { ...p, mensaje: p.mensaje ?? prev?.mensaje ?? null } : prev ? fusionarPublicacion(prev, p) : prev,
  )
  queryClient.setQueriesData<PaginasPublicaciones>({ queryKey: forosKeys.publicacionesDe(p.foroId) }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((pagina) =>
            pagina.map((x) =>
              x.id === p.id ? { ...fusionarPublicacion(x, p), siguiendo: fuente === "rest" ? p.siguiendo : x.siguiendo, mensaje: null } : x,
            ),
          ),
        }
      : data,
  )
}

export function quitarPublicacionDeCache(queryClient: QueryClient, id: number, foroId: number) {
  queryClient.setQueriesData<PaginasPublicaciones>({ queryKey: forosKeys.publicacionesDe(foroId) }, (data) =>
    data ? { ...data, pages: data.pages.map((pagina) => pagina.filter((x) => x.id !== id)) } : data,
  )
  queryClient.removeQueries({ queryKey: forosKeys.publicacion(id) })
}

/** Reemplaza un mensaje (cuerpo o respuesta) donde esté en las caches del foro. */
export function actualizarMensajeEnCache(queryClient: QueryClient, m: Mensaje) {
  queryClient.setQueriesData<Mensaje[]>(
    { queryKey: forosKeys.all, predicate: (q) => q.queryKey.at(-1) === "respuestas" },
    (prev) => (prev?.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : prev),
  )
  queryClient.setQueriesData<Publicacion>(
    { queryKey: forosKeys.all, predicate: (q) => q.queryKey.at(-2) === "publicacion" },
    (prev) => (prev?.mensaje?.id === m.id ? { ...prev, mensaje: m } : prev),
  )
}

// ── foros y etiquetas ──────────────────────────────────────────────────────

export interface CrearForoInput {
  nombre: string
  miembros: number[]
}

/** Un foro es un canal `TIPO: "FORO"`: se crea por el mismo endpoint del chat. */
export function useCrearForo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, miembros }: CrearForoInput) =>
      evalCol.postRow<Conversacion>("/comunicaciones/conversaciones", {
        NOMBRE: nombre,
        TIPO: "FORO",
        CATEGORIA: "GENERAL",
        MIEMBROS: miembros,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: forosKeys.lista })
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones })
    },
  })
}

export interface CrearEtiquetaInput {
  foroId: number
  nombre: string
  color: ColorEtiqueta
  soloModeradores: boolean
}

export function useCrearEtiqueta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ foroId, nombre, color, soloModeradores }: CrearEtiquetaInput) =>
      evalCol.postRow<EtiquetaForo>(`/comunicaciones/foros/${foroId}/etiquetas`, {
        NOMBRE: nombre,
        COLOR: color,
        SOLO_MODERADORES: flag(soloModeradores),
      }),
    onSuccess: (_e, { foroId }) => void queryClient.invalidateQueries({ queryKey: forosKeys.cabecera(foroId) }),
  })
}

export function useEliminarEtiqueta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: number; foroId: number }) =>
      evalCol.patchRow<EtiquetaForo>(`/comunicaciones/foros/etiquetas/${id}/eliminar`),
    onSuccess: (_e, { foroId }) => {
      void queryClient.invalidateQueries({ queryKey: forosKeys.cabecera(foroId) })
      void queryClient.invalidateQueries({ queryKey: forosKeys.publicacionesDe(foroId) })
    },
  })
}

// ── publicaciones ──────────────────────────────────────────────────────────

export interface PublicarInput {
  foroId: number
  titulo: string
  texto: string
  etiquetas: number[]
  archivo?: File | null
  // UUID del intento: un reintento no duplica la publicación.
  clientMessageId?: string
}

// TODO: igual que el chat, el archivo irá por `postMultipart` cuando file-service
// reciba adjuntos de comunicaciones; hoy viajan nombre y formato.
export function usePublicar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ foroId, titulo, texto, etiquetas, archivo, clientMessageId }: PublicarInput) =>
      evalCol.postRow<Publicacion>(`/comunicaciones/foros/${foroId}/publicaciones`, {
        TITULO: titulo,
        TEXTO: texto,
        ETIQUETAS: etiquetas,
        CLIENT_MESSAGE_ID: clientMessageId ?? crypto.randomUUID(),
        ...(archivo && { ADJUNTO_NOMBRE: archivo.name, ADJUNTO_FORMATO: formatoDeArchivo(archivo) }),
      }),
    onSuccess: (p) => {
      queryClient.setQueryData(forosKeys.publicacion(p.id), p)
      void queryClient.invalidateQueries({ queryKey: forosKeys.publicacionesDe(p.foroId) })
    },
  })
}

export function useEditarPublicacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, titulo, texto }: { id: number; titulo: string; texto: string }) =>
      evalCol.patchRow<Publicacion>(pub(id), { TITULO: titulo, TEXTO: texto }),
    onSuccess: (p) => actualizarPublicacionEnCache(queryClient, p, "rest"),
  })
}

/** Acciones de una publicación que devuelven la publicación actualizada. */
type AccionPublicacion =
  | { tipo: "etiquetas"; etiquetas: number[] }
  | { tipo: "fijar"; valor: boolean }
  | { tipo: "cerrar"; valor: boolean }
  | { tipo: "resolver"; valor: boolean; solucionId?: number | null }
  | { tipo: "seguir"; valor: boolean }

function accionPublicacion({ id, accion }: { id: number; accion: AccionPublicacion }) {
  switch (accion.tipo) {
    case "etiquetas":
      return evalCol.patchRow<Publicacion>(`${pub(id)}/etiquetas`, { ETIQUETAS: accion.etiquetas })
    case "fijar":
      return evalCol.patchRow<Publicacion>(`${pub(id)}/fijar`, { FIJADA: flag(accion.valor) })
    case "cerrar":
      return evalCol.patchRow<Publicacion>(`${pub(id)}/cerrar`, { CERRADA: flag(accion.valor) })
    case "resolver":
      return evalCol.patchRow<Publicacion>(`${pub(id)}/resolver`, {
        RESUELTA: flag(accion.valor),
        ...(accion.valor && accion.solucionId ? { FK_MENSAJE_SOLUCION: accion.solucionId } : {}),
      })
    case "seguir":
      return evalCol.patchRow<Publicacion>(`${pub(id)}/seguir`, { SEGUIR: flag(accion.valor) })
  }
}

export function useAccionPublicacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: accionPublicacion,
    onSuccess: (p, { accion }) => {
      actualizarPublicacionEnCache(queryClient, p, "rest")
      // Fijar cambia el orden; una etiqueta nueva puede sacarla del filtro activo.
      if (accion.tipo === "fijar" || accion.tipo === "etiquetas") {
        void queryClient.invalidateQueries({ queryKey: forosKeys.publicacionesDe(p.foroId) })
      }
    },
  })
}

export function useEliminarPublicacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Publicacion>(`${pub(id)}/eliminar`),
    onSuccess: (p) => quitarPublicacionDeCache(queryClient, p.id, p.foroId),
  })
}

// ── respuestas ─────────────────────────────────────────────────────────────

export interface ResponderInput {
  publicacionId: number
  texto: string
  archivo?: File | null
  respuestaA?: number | null
  clientMessageId?: string
}

export function useResponder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ publicacionId, texto, archivo, respuestaA, clientMessageId }: ResponderInput) =>
      evalCol.postRow<Mensaje>(`${pub(publicacionId)}/respuestas`, {
        TEXTO: texto,
        CLIENT_MESSAGE_ID: clientMessageId ?? crypto.randomUUID(),
        ...(respuestaA && { FK_MENSAJE_RESPUESTA: respuestaA }),
        ...(archivo && { ADJUNTO_NOMBRE: archivo.name, ADJUNTO_FORMATO: formatoDeArchivo(archivo) }),
      }),
    onSuccess: (m, { publicacionId }) => {
      // `upsert`: el evento `respuesta.creada` pudo llegar antes que la respuesta.
      queryClient.setQueryData<Mensaje[]>(forosKeys.respuestas(publicacionId), (prev) =>
        prev ? upsertMensaje(prev, m) : [m],
      )
      // Responder te suscribe a la publicación y cambia contadores.
      void queryClient.invalidateQueries({ queryKey: forosKeys.publicacion(publicacionId) })
    },
  })
}

/** Editar el texto de una respuesta propia: endpoint del chat. */
export function useEditarRespuesta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, texto }: { id: number; texto: string }) =>
      evalCol.patchRow<Mensaje>(`/comunicaciones/mensajes/${id}`, { TEXTO: texto }),
    onSuccess: (m) => actualizarMensajeEnCache(queryClient, m),
  })
}

export function useEliminarRespuesta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: number; publicacionId: number }) =>
      evalCol.patchRow<Mensaje>(`/comunicaciones/foros/respuestas/${id}/eliminar`),
    onSuccess: (m, { publicacionId }) => {
      queryClient.setQueryData<Mensaje[]>(forosKeys.respuestas(publicacionId), (prev) =>
        prev?.filter((x) => x.id !== m.id),
      )
      void queryClient.invalidateQueries({ queryKey: forosKeys.publicacion(publicacionId) })
    },
  })
}

/** Reacción sobre el cuerpo o una respuesta: endpoint del chat, cache del foro. */
export function useReaccionarForo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, emoji }: { id: number; emoji: string }) =>
      evalCol.postRow<Mensaje>(`/comunicaciones/mensajes/${id}/reacciones`, { EMOJI: emoji }),
    onSuccess: (m) => actualizarMensajeEnCache(queryClient, m),
  })
}
