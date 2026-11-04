import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { observadorKeys } from "@/features/gestion-estudiantil/observador/api/query-keys"
import type { CodigoInput } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"

const BASE = "/gestion-estudiantil/catalogo-anotaciones"

/** Toda escritura invalida también el selector de códigos del Observador. */
function useEscritura<T>(fn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: observadorKeys.all }),
  })
}

export const useCrearCodigo = () =>
  useEscritura((input: CodigoInput & { establecimiento: number }) =>
    evalCol.postRow(BASE, {
      FK_ESTABLECIMIENTO: input.establecimiento,
      CODIGO: input.codigo,
      DESCRIPCION: input.descripcion,
      FK_TLV_TIPO: input.tipo,
      FK_TLV_SITUACION: input.situacion,
      HABILITADO: input.habilitado,
    }),
  )

export const useActualizarCodigo = () =>
  useEscritura((input: CodigoInput & { id: number }) =>
    evalCol.putRow(`${BASE}/${input.id}`, {
      CODIGO: input.codigo,
      DESCRIPCION: input.descripcion,
      FK_TLV_TIPO: input.tipo,
      FK_TLV_SITUACION: input.situacion,
    }),
  )

export const useCambiarEstadoCodigo = () =>
  useEscritura((input: { id: number; habilitado: boolean }) =>
    evalCol.patchRow(`${BASE}/${input.id}/estado`, { HABILITADO: input.habilitado }),
  )

export const useEliminarCodigo = () => useEscritura((id: number) => evalCol.patchRow(`${BASE}/${id}/eliminar`, {}))
