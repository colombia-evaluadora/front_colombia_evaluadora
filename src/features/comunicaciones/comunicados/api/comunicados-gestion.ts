import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Comunicado, EstadoComunicado } from "@/features/comunicaciones/chat/api/types"
import { subirAdjuntos } from "@/features/comunicaciones/chat/api/mutations/use-crear-comunicado"

const RUTA = "/comunicaciones/comunicados/gestion"

/**
 * Pestañas de "Comunicados institucionales" (Guía M.1.LIS.1 y M.1.REC.1): Publicados es la gestión de
 * quien publica (los cinco estados); Recibidos, los publicados que le llegaron; Anteriores, los
 * recibidos que ya vencieron.
 */
export type PestanaComunicados = "PUBLICADOS" | "RECIBIDOS" | "ANTERIORES"

/** Tipo de destinatario: audiencia por rol (chat) o tipo del conjunto del formulario por documento. */
export type TipoDestinatario =
  | "ESTUDIANTES"
  | "PADRES"
  | "ACUDIENTES"
  | "DOCENTES"
  | "DIRECTIVOS"
  | "ADMINISTRATIVOS"
  | "FUNCIONARIOS"

export interface ComunicadoGestion {
  id: number
  titulo: string
  publicarEn: string
  publicadoPor: string
  // Solo el autor ve "Modificar" (M.1.LIS.2).
  esAutor: boolean
  tipos: TipoDestinatario[]
  // Solo en Publicados: a quien recibe nunca se le muestran los destinatarios.
  destinatarios: number | null
  estado: EstadoComunicado
  importante: boolean
  // Solo en Recibidos y Anteriores: el punto de no leído.
  leido: boolean | null
  actualizadoEn: string | null
}

export interface PaginaComunicados {
  items: ComunicadoGestion[]
  totalCount: number
  pageCount: number
}

/** Tipo de destinatario del filtro avanzado (M.1.LIS.1): los cargos cuentan como funcionarios. */
export type TipoFiltroComunicado = "ESTUDIANTES" | "ACUDIENTES" | "FUNCIONARIOS"

/** Columnas ordenables del listado; comms-service ordena en el servidor (la tabla pagina allá). */
export type OrdenComunicados = "fecha" | "titulo" | "publicadoPor" | "destinatarios" | "estado"

export interface FiltrosComunicados {
  pestana: PestanaComunicados
  q?: string
  estado?: EstadoComunicado
  desde?: string
  emisor?: string
  tipo?: TipoFiltroComunicado
  sortBy?: OrdenComunicados
  sortDir?: "asc" | "desc"
  page: number
  pageSize: number
}

/** Prefijo de todas las páginas del listado: lo invalidan anular, cancelar y modificar. */
export const comunicadosGestionKey = ["comunicados-gestion"] as const

export function useComunicadosGestionQuery(filtros: FiltrosComunicados) {
  return useQuery({
    queryKey: [...comunicadosGestionKey, filtros],
    queryFn: async () => {
      const params = new URLSearchParams({
        pestana: filtros.pestana,
        page: String(filtros.page),
        pageSize: String(filtros.pageSize),
      })
      if (filtros.q?.trim()) params.set("q", filtros.q.trim())
      if (filtros.estado) params.set("estado", filtros.estado)
      if (filtros.desde) params.set("desde", filtros.desde)
      // Solo con valor: el backend anterior no los conoce y los ignora si faltan.
      if (filtros.emisor?.trim()) params.set("emisor", filtros.emisor.trim())
      if (filtros.tipo) params.set("tipo", filtros.tipo)
      if (filtros.sortBy) {
        params.set("sortBy", filtros.sortBy)
        params.set("sortDir", filtros.sortDir ?? "asc")
      }
      const [pagina] = await evalCol.getRows<PaginaComunicados>(`${RUTA}?${params.toString()}`)
      return pagina ?? { items: [], totalCount: 0, pageCount: 0 }
    },
    placeholderData: keepPreviousData,
  })
}

/** Persona sin canal o cuyo correo falló (M.1.DET.1). Nunca se expone quién leyó. */
export interface PersonaSinCanal {
  nombre: string
  tipo: string
  motivo: string
  grupo: string | null
}

/** Seguimiento por canal del comunicado (M.1.DET.1): solo para quien lo gestiona. */
export interface SeguimientoComunicado {
  destinatarios: number
  conAviso: number
  correosEnviados: number
  correosFallidos: number
  sinCanal: number
  leidos: number
  personas: PersonaSinCanal[]
}

export const seguimientoComunicadoKey = (conversacionId: number) =>
  [...comunicadosGestionKey, "seguimiento", conversacionId] as const

/**
 * GET /comunicaciones/conversaciones/{id}/comunicado/seguimiento. Mientras el backend no lo tenga
 * desplegado responde 404: el detalle cae a los contadores del propio comunicado (sin romperse).
 */
export function useSeguimientoComunicadoQuery(conversacionId: number, enabled: boolean) {
  return useQuery({
    queryKey: seguimientoComunicadoKey(conversacionId),
    queryFn: async () => {
      const [fila] = await evalCol.getRows<SeguimientoComunicado>(
        `/comunicaciones/conversaciones/${conversacionId}/comunicado/seguimiento`,
      )
      return fila ? { ...fila, personas: fila.personas ?? [] } : null
    },
    enabled: enabled && Number.isFinite(conversacionId),
  })
}

export interface CorregirComunicadoInput {
  titulo: string
  // Texto plano (formulario M.1): comms-service lo guarda en párrafos, como al publicarlo.
  mensaje: string
  // Archivos nuevos y adjuntos guardados a quitar (se conservan para auditoría en comms-service).
  archivos: File[]
  quitarAdjuntos: number[]
}

/**
 * "Modificar comunicado" (M.1.EDI.1): el autor corrige título y mensaje; los destinatarios no
 * cambian. comms-service avisa la corrección a los destinatarios originales si ya se publicó.
 * Devuelve el comunicado y los archivos que no se pudieron adjuntar.
 */
export function useCorregirComunicado(conversacionId: number) {
  const queryClient = useQueryClient()
  const base = `/comunicaciones/conversaciones/${conversacionId}/comunicado`
  return useMutation({
    mutationFn: async (v: CorregirComunicadoInput) => {
      let c = await evalCol.patchRow<Comunicado>(`${base}/corregir`, {
        TITULO: v.titulo.trim(),
        MENSAJE: v.mensaje.trim(),
      })
      for (const id of v.quitarAdjuntos) {
        c = await evalCol.patchRow<Comunicado>(`${base}/adjuntos/${id}/eliminar`, {})
      }
      const fallidos = await subirAdjuntos(conversacionId, v.archivos)
      if (v.archivos.length > fallidos.length) {
        const [fresco] = await evalCol.getRows<Comunicado>(base)
        if (fresco) c = fresco
      }
      return { dato: c, fallidos }
    },
    onSuccess: ({ dato }) => {
      queryClient.setQueryData(chatKeys.comunicado(conversacionId), dato)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: comunicadosGestionKey }),
        queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
      ])
    },
  })
}
