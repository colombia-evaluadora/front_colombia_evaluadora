import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import { subirSoporteConvivencia } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"

const BASE = "/gestion-estudiantil/convivencia"

export interface AgregarSoporteInput {
  accionId: number
  /** Sin archivo, solo vincula al caso un soporte ya existente. */
  archivo?: File
  /** También lo deja como soporte del caso. */
  vincularCaso?: boolean
}

async function agregarSoporte({ accionId, archivo, vincularCaso }: AgregarSoporteInput) {
  const fkArchivo = archivo ? await subirSoporteConvivencia(archivo) : null
  return evalCol.postRow(`${BASE}/acciones/${accionId}/soportes`, { FK_ARCHIVO: fkArchivo, VINCULAR_CASO: vincularCaso ?? false })
}

export interface SustituirSoporteInput {
  soporteId: number
  archivo: File
  motivo: string
}

async function sustituirSoporte({ soporteId, archivo, motivo }: SustituirSoporteInput) {
  const fkArchivo = await subirSoporteConvivencia(archivo)
  return evalCol.postRow(`${BASE}/soportes/${soporteId}/sustituir`, { FK_ARCHIVO: fkArchivo, MOTIVO: motivo.trim() })
}

const retirarSoporte = (i: { soporteId: number; motivo: string }) =>
  evalCol.postRow(`${BASE}/soportes/${i.soporteId}/retirar`, { MOTIVO: i.motivo.trim() })

/** Un soporte cambia el historial de la acción y el detalle del caso (soportes de cada acción), no el listado. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useSoporteMutation<F extends (input: any) => Promise<any>>(fn: F, mutationConfig?: MutationConfig<F>) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: fn,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [...convivenciaKeys.all, "soportes"] })
      queryClient.invalidateQueries({ queryKey: convivenciaKeys.detalles })
      onSuccess?.(...args)
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cfg<F extends (...args: any) => Promise<any>> = { mutationConfig?: MutationConfig<F> }

export const useAgregarSoporteMutation = ({ mutationConfig }: Cfg<typeof agregarSoporte> = {}) =>
  useSoporteMutation(agregarSoporte, mutationConfig)
export const useSustituirSoporteMutation = ({ mutationConfig }: Cfg<typeof sustituirSoporte> = {}) =>
  useSoporteMutation(sustituirSoporte, mutationConfig)
export const useRetirarSoporteMutation = ({ mutationConfig }: Cfg<typeof retirarSoporte> = {}) =>
  useSoporteMutation(retirarSoporte, mutationConfig)
