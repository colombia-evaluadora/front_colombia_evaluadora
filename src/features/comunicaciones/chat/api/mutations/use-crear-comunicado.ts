import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { getErrorMessage } from "@/lib/api-client"
import { postMultipart } from "@/lib/files"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { conBorrador } from "@/features/comunicaciones/chat/lib/borrador-actividad"
import type {
  Audiencia,
  Comunicado,
  Conversacion,
  DestinosComunicado,
  PrevisualizacionComunicado,
} from "@/features/comunicaciones/chat/api/types"

export interface CrearComunicadoInput {
  titulo: string
  descripcion: string
  audiencia: Audiencia[]
  // Grados, grupos, cargos, personas y grupos del chat (combinables con la audiencia por rol).
  destinos: DestinosComunicado
  publicarEn: string
  contenidoHtml: string
  importante: boolean
  permitirRespuestas: boolean
  // yyyy-MM-dd o null: sin vencimiento.
  visibleHasta: string | null
  // Modalidad y ciclo van juntos: acotan los grados y grupos al período.
  modalidad: string | null
  ciclo: number | null
  // Archivos nuevos a subir (los ya guardados no se reenvían).
  archivos: File[]
  // Al editar: adjuntos guardados que se quitan.
  quitarAdjuntos?: number[]
  // Borrador del que sale (se elimina al publicar).
  borradorId?: number | null
}

// Las etiquetas viajan para mostrar "Dirigido a" sin volver a resolver cada id.
const opciones = (l: { valor: string; etiqueta: string }[]) => l.map((o) => ({ VALOR: o.valor, ETIQUETA: o.etiqueta }))

const cuerpoDestinos = (d: DestinosComunicado) => ({
  GRADOS: opciones(d.grados),
  GRUPOS: opciones(d.grupos),
  ROLES: opciones(d.roles),
  USUARIOS: opciones(d.usuarios),
  GRUPOS_CHAT: opciones(d.gruposChat),
  PARA: d.para,
  // Acotan dentro del alcance de quien publica (comms-service los valida: uno ajeno es 403).
  ESTABLECIMIENTO: d.establecimiento ? opciones([d.establecimiento])[0] : null,
  SEDES: opciones(d.sedes ?? []),
  JORNADAS: opciones(d.jornadas ?? []),
  POBLACION: d.poblacion ?? "MATRICULADOS",
})

const cuerpoComunicado = (v: CrearComunicadoInput) => ({
  TITULO: v.titulo,
  DESCRIPCION: v.descripcion,
  AUDIENCIA: v.audiencia,
  DESTINOS: cuerpoDestinos(v.destinos),
  PUBLICAR_EN: v.publicarEn,
  CONTENIDO_HTML: v.contenidoHtml,
  IMPORTANTE: v.importante ? "S" : "N",
  PERMITIR_RESPUESTAS: v.permitirRespuestas ? "S" : "N",
  VISIBLE_HASTA: v.visibleHasta,
  MODALIDAD: v.modalidad,
  CICLO: v.ciclo,
})

const base = (conversacionId: number) => `/comunicaciones/conversaciones/${conversacionId}/comunicado`

/**
 * Sube los archivos uno por uno (multipart a file-service, que reenvía `ADJUNTO = pk_tarchivo` a
 * comms-service). Devuelve los nombres de los que fallaron para avisar sin perder el comunicado.
 */
export async function subirAdjuntos(conversacionId: number, archivos: File[]) {
  const fallidos: { nombre: string; error: string }[] = []
  for (const archivo of archivos) {
    try {
      await postMultipart(`/eval-col${base(conversacionId)}/adjuntos`, {}, { ADJUNTO: archivo })
    } catch (error) {
      fallidos.push({ nombre: archivo.name, error: getErrorMessage(error) })
    }
  }
  return fallidos
}

/**
 * Previsualización de destinatarios: comms-service resuelve los mismos destinatarios que al publicar
 * (mismas reglas de alcance) y los cuenta por tipo. No crea nada, por eso no invalida ninguna query.
 */
export function usePrevisualizarComunicado() {
  return useMutation({
    mutationFn: (v: Pick<CrearComunicadoInput, "audiencia" | "destinos" | "modalidad" | "ciclo">) =>
      evalCol.postRow<PrevisualizacionComunicado>("/comunicaciones/comunicados/destinos/previsualizar", {
        AUDIENCIA: v.audiencia,
        DESTINOS: cuerpoDestinos(v.destinos),
        MODALIDAD: v.modalidad,
        CICLO: v.ciclo,
      }),
  })
}

export interface ResultadoComunicado<T> {
  dato: T
  // Archivos que no se pudieron adjuntar (el comunicado sí se guardó).
  fallidos: { nombre: string; error: string }[]
}

// El HTML ya va saneado desde el front, pero el backend también debe sanearlo.
export function useCrearComunicado() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (v: CrearComunicadoInput): Promise<ResultadoComunicado<Conversacion>> => {
      const conAdjuntos = v.archivos.length > 0
      const canal = await evalCol.postRow<Conversacion>(
        "/comunicaciones/comunicados",
        // Con archivos, el aviso CHAT_COMUNICADO espera a que se suban (`/avisar`).
        { ...cuerpoComunicado(v), ESPERA_ADJUNTOS: conAdjuntos ? "S" : "N" },
        conBorrador(v.borradorId),
      )
      if (!conAdjuntos) return { dato: canal, fallidos: [] }
      const fallidos = await subirAdjuntos(canal.id, v.archivos)
      // Si esto falla, comms-service avisa igual en su siguiente revisión (≤ 30 s).
      await evalCol.postRow<Comunicado>(`${base(canal.id)}/avisar`, {}).catch(() => undefined)
      return { dato: canal, fallidos }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
        queryClient.invalidateQueries({ queryKey: chatKeys.borradoresActividad }),
      ]),
  })
}

/**
 * "Editar Comunicado" (diseño 4062:67938): título, descripción, contenido, importante, respuestas y
 * archivos siempre; destinatarios y fecha solo mientras siga programado (comms-service responde 409
 * si ya se publicó).
 */
export function useEditarComunicado(conversacionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (v: CrearComunicadoInput): Promise<ResultadoComunicado<Comunicado>> => {
      let c = await evalCol.patchRow<Comunicado>(base(conversacionId), cuerpoComunicado(v), conBorrador(v.borradorId))
      for (const id of v.quitarAdjuntos ?? []) {
        c = await evalCol.patchRow<Comunicado>(`${base(conversacionId)}/adjuntos/${id}/eliminar`, {})
      }
      const fallidos = await subirAdjuntos(conversacionId, v.archivos)
      if (v.archivos.length > fallidos.length) {
        const [fresco] = await evalCol.getRows<Comunicado>(base(conversacionId))
        if (fresco) c = fresco
      }
      return { dato: c, fallidos }
    },
    onSuccess: ({ dato }) => {
      queryClient.setQueryData(chatKeys.comunicado(conversacionId), dato)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
        queryClient.invalidateQueries({ queryKey: chatKeys.recepcion(conversacionId) }),
        // Guardar desde el borrador de la edición lo elimina (comms-service, ?borrador).
        queryClient.invalidateQueries({ queryKey: chatKeys.borradoresActividad }),
      ])
    },
  })
}

function useCambiarEstadoComunicado<V>(conversacionId: number, accion: (v: V) => Promise<Comunicado>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: accion,
    onSuccess: (dato) => {
      queryClient.setQueryData(chatKeys.comunicado(conversacionId), dato)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
        queryClient.invalidateQueries({ queryKey: chatKeys.enviadosTodos }),
      ])
    },
  })
}

/** Publicado o Vencido → Anulado, con motivo obligatorio. */
export function useAnularComunicado(conversacionId: number) {
  return useCambiarEstadoComunicado(conversacionId, (motivo: string) =>
    evalCol.patchRow<Comunicado>(`${base(conversacionId)}/anular`, { MOTIVO: motivo }),
  )
}

/** Programado → Cancelado (sin motivo: aún no se ha publicado). */
export function useCancelarComunicado(conversacionId: number) {
  return useCambiarEstadoComunicado(conversacionId, (_: void) =>
    evalCol.patchRow<Comunicado>(`${base(conversacionId)}/cancelar`, {}),
  )
}

/** "N archivos no se pudieron adjuntar: a.pdf (motivo)". */
export function textoFallidos(fallidos: { nombre: string; error: string }[]) {
  if (fallidos.length === 0) return null
  const detalle = fallidos.map((f) => `${f.nombre} (${f.error})`).join("; ")
  return fallidos.length === 1
    ? `No se pudo adjuntar ${detalle}.`
    : `No se pudieron adjuntar ${fallidos.length} archivos: ${detalle}.`
}
