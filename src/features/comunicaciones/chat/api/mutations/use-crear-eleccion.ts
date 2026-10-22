import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Conversacion, Eleccion } from "@/features/comunicaciones/chat/api/types"
import { fotoComoDataUrl } from "@/features/comunicaciones/chat/lib/foto-candidato"

export interface CandidatoNuevo {
  nombre: string
  numero: string
  lema: string
  foto: File | null
  // Foto que ya tenía el candidato (al editar): se conserva si no se elige otra.
  fotoUrl?: string | null
}

export interface CrearEleccionInput {
  nombre: string
  descripcion: string
  fechaInicio: string | null
  fechaCierre: string | null
  jornadaId: number
  verResultadosEnVivo: boolean
  // Ids de las personas habilitadas para votar.
  votantes: number[]
  candidatos: CandidatoNuevo[]
}

// Las fotos viajan como data URL reducida (`lib/foto-candidato.ts`): una URL
// `blob:` solo existe en esta pestaña y comms-service la rechaza.
async function cuerpoEleccion(v: Omit<CrearEleccionInput, "votantes">) {
  const fotos = await Promise.all(
    v.candidatos.map((c) => (c.foto ? fotoComoDataUrl(c.foto) : (c.fotoUrl ?? null))),
  )
  return {
    NOMBRE: v.nombre,
    DESCRIPCION: v.descripcion,
    FECHA_INICIO: v.fechaInicio,
    FECHA_CIERRE: v.fechaCierre,
    FK_JORNADA: v.jornadaId,
    VER_RESULTADOS: v.verResultadosEnVivo ? "S" : "N",
    CANDIDATOS: v.candidatos.map((c, i) => ({
      NOMBRE: c.nombre,
      NUMERO: c.numero,
      LEMA: c.lema,
      FOTO_URL: fotos[i],
    })),
  }
}

async function crearEleccion(v: CrearEleccionInput) {
  return evalCol.postRow<Conversacion>("/comunicaciones/elecciones", {
    ...(await cuerpoEleccion(v)),
    VOTANTES: v.votantes,
  })
}

/**
 * "Editar Elección": comms-service lo permite a quien la creó y antes del primer voto (409 si no).
 * El censo de votantes no cambia.
 */
export function useEditarEleccion(conversacionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (v: Omit<CrearEleccionInput, "votantes">) =>
      evalCol.patchRow<Eleccion>(`/comunicaciones/conversaciones/${conversacionId}/eleccion`, await cuerpoEleccion(v)),
    onSuccess: (eleccion) => {
      queryClient.setQueryData(chatKeys.eleccion(conversacionId), eleccion)
      return queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones })
    },
  })
}

export function useCrearEleccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: crearEleccion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
  })
}

// Cierre manual: nadie más puede votar y se publican los resultados.
export function useCerrarEleccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversacionId: number) =>
      evalCol.patchRow<Conversacion>(`/comunicaciones/conversaciones/${conversacionId}/eleccion/cerrar`),
    onSuccess: (_, conversacionId) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.eleccion(conversacionId) }),
        queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
      ]),
  })
}

// Voto del estudiante; `candidatoId` null = voto en blanco.
export function useVotarEleccion(conversacionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (candidatoId: number | null) =>
      evalCol.postRow<Eleccion>(`/comunicaciones/conversaciones/${conversacionId}/eleccion/votar`, {
        FK_CANDIDATO: candidatoId,
      }),
    onSuccess: (eleccion) => {
      queryClient.setQueryData(chatKeys.eleccion(conversacionId), eleccion)
      // El aviso "entra a votar" vive en la bandeja general (`CHAT_ELECCION`).
      return queryClient.invalidateQueries({ queryKey: ["notificaciones"] })
    },
  })
}
