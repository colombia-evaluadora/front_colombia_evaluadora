import { useMutation, useQueryClient } from "@tanstack/react-query"
import { invalidateListaValor } from "@/features/establishment/academic-period/api/query/fetch-select-category"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type {
  ListaValor,
  Resultado,
} from "@/features/administration/listas-valor/api/types/lista-valor"

/** Marcas propias de algunas listas (S.1.VAL.LST.3a/6a/6b). Pendientes de backend: solo el mock las conoce. */
export interface MarcasValor {
  delSimpade?: boolean
  disparaPiar?: boolean
  estamento?: string | null
}

interface SaveValorVariables {
  /** Presente = edición. */
  id?: number
  categoria: string
  nombre: string
  valor: string
  etiqueta: string | null
  accion: string | null
  padre: number | null
  /** Solo al crear; después el orden se cambia arrastrando (`/orden`). */
  orden: number | null
  /** Solo se mandan las marcas de la lista: el validador del back real rechaza claves no declaradas. */
  marcas?: MarcasValor
}

function marcasBody(marcas: MarcasValor = {}) {
  const body: Record<string, unknown> = {}
  if (marcas.delSimpade !== undefined) body.DEL_SIMPADE = marcas.delSimpade
  if (marcas.disparaPiar !== undefined) body.DISPARA_PIAR = marcas.disparaPiar
  if (marcas.estamento !== undefined) body.ESTAMENTO = marcas.estamento
  return body
}

// El PUT reemplaza todo: ETIQUETA, ACCION y PADRE siempre van (null = quitar). CATEGORIA y VALOR no se editan.
async function saveValor({
  id,
  categoria,
  nombre,
  valor,
  etiqueta,
  accion,
  padre,
  orden,
  marcas,
}: SaveValorVariables) {
  const row =
    id == null
      ? await evalCol.postRow<Resultado<ListaValor>>("/listas-valor", {
          CATEGORIA: categoria,
          NOMBRE: nombre,
          VALOR: valor,
          ETIQUETA: etiqueta,
          ACCION: accion,
          PADRE: padre,
          ORDEN: orden,
          ...marcasBody(marcas),
        })
      : await evalCol.putRow<Resultado<ListaValor>>(`/listas-valor/${id}`, {
          NOMBRE: nombre,
          ETIQUETA: etiqueta,
          ACCION: accion,
          PADRE: padre,
          ...marcasBody(marcas),
        })
  return row.resultado
}

export function useSaveValor({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveValor> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveValor,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: listaValorKeys.all })
      invalidateListaValor(queryClient)
      onSuccess?.(...args)
    },
  })
}
