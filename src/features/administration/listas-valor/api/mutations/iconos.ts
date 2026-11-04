import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type { Icono } from "@/features/administration/listas-valor/api/types/icono"
import type { Resultado } from "@/features/administration/listas-valor/api/types/lista-valor"

interface SaveIconoInput {
  /** Presente = modificar. */
  id?: number
  nombre: string
  /** Archivo SVG o PNG; null al modificar = conserva la imagen. */
  imagen: File | null
  habilitado: boolean
}

// Va por file-service (multipart): guarda el archivo en TARCHIVO y reenvía al
// endpoint con IMAGEN ya convertida en su pk_tarchivo (el back guarda su clave S3
// en VALOR). Modificar es POST porque
// los roles solo tienen POST /files/** (V305).
async function saveIcono({ id, nombre, imagen, habilitado }: SaveIconoInput) {
  const ruta = id == null ? "/eval-col/listas-valor/iconos" : `/eval-col/listas-valor/iconos/${id}`
  const body = await postMultipart<{ rows?: Resultado<Icono>[] }>(
    ruta,
    { NOMBRE: nombre, HABILITADO: habilitado },
    { IMAGEN: imagen },
  )
  const row = body?.rows?.[0]
  if (!row) throw new Error("La respuesta del guardado no trajo datos.")
  return row.resultado
}

async function setEstadoIcono({ id, habilitado }: { id: number; habilitado: boolean }) {
  const row = await evalCol.putRow<Resultado<Icono>>(`/listas-valor/iconos/${id}/estado`, {
    HABILITADO: habilitado,
  })
  return row.resultado
}

// Baja lógica; 409 si alguna valoración lo usa.
function deleteIcono({ id }: { id: number }) {
  return evalCol.put(`/listas-valor/iconos/${id}/eliminar`)
}

// ORDEN lleva TODOS los pk en el orden nuevo, como string JSON (mismo contrato que /categorias/:C/orden).
async function ordenarIconos({ orden }: { orden: number[] }) {
  const row = await evalCol.putRow<Resultado<Icono[]>>("/listas-valor/iconos/orden", {
    ORDEN: JSON.stringify(orden),
  })
  return row.resultado
}

function useIconoMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listaValorKeys.iconos }),
  })
}

export const useSaveIcono = () => useIconoMutation(saveIcono)
export const useEstadoIcono = () => useIconoMutation(setEstadoIcono)
export const useDeleteIcono = () => useIconoMutation(deleteIcono)

export function useOrdenarIconos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ordenarIconos,
    // Se pinta el orden nuevo sin esperar; si falla, la invalidación lo devuelve.
    onMutate: ({ orden }) => {
      queryClient.setQueryData<Icono[]>(listaValorKeys.iconos, (prev) =>
        prev ? orden.map((pk) => prev.find((i) => i.pkIcono === pk)).filter((i) => i != null) : prev,
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listaValorKeys.iconos }),
  })
}
