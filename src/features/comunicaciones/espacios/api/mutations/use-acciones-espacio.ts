import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { espaciosKeys } from "@/features/comunicaciones/espacios/api/query/use-espacios-query"
import type {
  ConfiguracionEspacio,
  HerramientaEspacio,
  Participacion,
} from "@/features/comunicaciones/espacios/api/types"

/**
 * Con archivos, el mismo POST viaja por file-service (igual que el chat): sube el binario y
 * reenvía el JSON a comms-service con `ADJUNTO` = `pk_tarchivo`.
 */
export async function postConAdjuntos<T>(ruta: string, campos: Record<string, unknown>, archivos: File[]): Promise<T> {
  if (archivos.length === 0) return evalCol.postRow<T>(ruta, campos)
  const crudo = await postMultipart<string | { rows: T[] }>(`/eval-col${ruta}`, campos, { ADJUNTO: archivos })
  const body = typeof crudo === "string" ? (JSON.parse(crudo) as { rows: T[] }) : crudo
  const [fila] = body?.rows ?? []
  if (!fila) throw new Error("La respuesta del envío no trajo la participación.")
  return fila
}

/** Toda acción del espacio puede cambiar pestañas, participaciones y estado: se refresca el espacio entero. */
export function useInvalidarEspacio(id: number) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: espaciosKeys.espacio(id) })
}

export function useGuardarHerramientas(actividad: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (herramientas: HerramientaEspacio[]) =>
      evalCol.putRow<ConfiguracionEspacio>(`/comunicaciones/espacios/actividad/${actividad}`, {
        HERRAMIENTAS: herramientas,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: espaciosKeys.todos }),
  })
}

export function useQuitarEspacio(actividad: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => evalCol.patchRow<ConfiguracionEspacio>(`/comunicaciones/espacios/actividad/${actividad}/quitar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: espaciosKeys.todos }),
  })
}

export function useEnviarChatEspacio(id: number, equipo: number | null) {
  const invalidar = useInvalidarEspacio(id)
  return useMutation({
    mutationFn: ({ texto, archivos }: { texto: string; archivos: File[] }) =>
      postConAdjuntos<Participacion>(
        `/comunicaciones/espacios/${id}/chat/mensajes`,
        { TEXTO: texto, CLIENT_MESSAGE_ID: crypto.randomUUID(), ...(equipo && { FK_EQUIPO: equipo }) },
        archivos,
      ),
    onSuccess: invalidar,
  })
}

export function useAccionesParticipacion(id: number) {
  const invalidar = useInvalidarEspacio(id)
  const ruta = (m: number) => `/comunicaciones/espacios/${id}/mensajes/${m}`
  return {
    editar: useMutation({
      mutationFn: ({ mensaje, texto }: { mensaje: number; texto: string }) =>
        evalCol.patchRow<Participacion>(ruta(mensaje), { TEXTO: texto }),
      onSuccess: invalidar,
    }),
    retirar: useMutation({
      mutationFn: (mensaje: number) => evalCol.patchRow<Participacion>(`${ruta(mensaje)}/retirar`),
      onSuccess: invalidar,
    }),
    fijar: useMutation({
      mutationFn: ({ mensaje, fijado }: { mensaje: number; fijado: boolean }) =>
        evalCol.patchRow<Participacion>(`${ruta(mensaje)}/fijar`, { FIJADO: fijado }),
      onSuccess: invalidar,
    }),
    ocultar: useMutation({
      mutationFn: ({ mensaje, motivo }: { mensaje: number; motivo: string }) =>
        evalCol.patchRow<Participacion>(`${ruta(mensaje)}/ocultar`, { MOTIVO: motivo }),
      onSuccess: invalidar,
    }),
  }
}

/** Responden 204 sin filas: van por `api`, no por `evalCol.*Row`. */
export function useSilenciar(id: number) {
  const invalidar = useInvalidarEspacio(id)
  return {
    silenciar: useMutation({
      mutationFn: ({ usuario, motivo }: { usuario: number; motivo: string }) =>
        api.post(`/eval-col/comunicaciones/espacios/${id}/silenciados`, { FK_USUARIO: usuario, MOTIVO: motivo }),
      onSuccess: invalidar,
    }),
    reactivar: useMutation({
      mutationFn: (usuario: number) =>
        api.patch(`/eval-col/comunicaciones/espacios/${id}/silenciados/${usuario}/reactivar`),
      onSuccess: invalidar,
    }),
  }
}
