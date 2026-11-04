import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import type { IntegranteInput, SesionInput } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { comiteKeys, convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"

const BASE = "/gestion-estudiantil/convivencia/comite"

export interface CrearComiteInput {
  FK_PERIODO: number
  COPIAR_DE_PERIODO?: number | null
  INTEGRANTES: IntegranteInput[]
}

const crearComite = (i: CrearComiteInput) => evalCol.postRow<{ id?: number } & Record<string, unknown>>(BASE, i)

export interface AgregarIntegranteInput {
  comiteId: number
  FK_TLV_CARGO: number
  FK_FUNCIONARIO?: number | null
  FK_MATRICULA?: number | null
  NOMBRE?: string | null
  DESDE?: string | null
}

const agregarIntegrante = ({ comiteId, ...body }: AgregarIntegranteInput) =>
  evalCol.postRow(`${BASE}/${comiteId}/integrantes`, body)

export interface ReemplazarIntegranteInput {
  integranteId: number
  FK_FUNCIONARIO?: number | null
  FK_MATRICULA?: number | null
  NOMBRE?: string | null
  DESDE: string
}

const reemplazarIntegrante = ({ integranteId, ...body }: ReemplazarIntegranteInput) =>
  evalCol.postRow(`${BASE}/integrantes/${integranteId}/reemplazar`, body)

const quitarIntegrante = (i: { integranteId: number }) => evalCol.postRow(`${BASE}/integrantes/${i.integranteId}/quitar`, {})

const crearSesion = ({ comiteId, ...body }: SesionInput & { comiteId: number }) =>
  evalCol.postRow<{ id?: number } & Record<string, unknown>>(`${BASE}/${comiteId}/sesiones`, body)

const actualizarSesion = ({ sesionId, ...body }: SesionInput & { sesionId: number }) =>
  evalCol.putRow(`${BASE}/sesiones/${sesionId}`, body)

/**
 * Las del Comité invalidan solo su clave. Una sesión además cambia lo que muestran los casos
 * (`sesiones_comite`, `seguimiento_vencido`), así que refresca listados y detalles, no pasos ni gestores.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useComiteMutation<F extends (input: any) => Promise<any>>(fn: F, tocaCasos: boolean, mutationConfig?: MutationConfig<F>) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: fn,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: comiteKeys.all })
      if (tocaCasos) {
        queryClient.invalidateQueries({ queryKey: convivenciaKeys.listas })
        queryClient.invalidateQueries({ queryKey: convivenciaKeys.detalles })
      }
      onSuccess?.(...args)
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cfg<F extends (...args: any) => Promise<any>> = { mutationConfig?: MutationConfig<F> }

export const useCrearComiteMutation = ({ mutationConfig }: Cfg<typeof crearComite> = {}) =>
  useComiteMutation(crearComite, false, mutationConfig)
export const useAgregarIntegranteMutation = ({ mutationConfig }: Cfg<typeof agregarIntegrante> = {}) =>
  useComiteMutation(agregarIntegrante, false, mutationConfig)
export const useReemplazarIntegranteMutation = ({ mutationConfig }: Cfg<typeof reemplazarIntegrante> = {}) =>
  useComiteMutation(reemplazarIntegrante, false, mutationConfig)
export const useQuitarIntegranteMutation = ({ mutationConfig }: Cfg<typeof quitarIntegrante> = {}) =>
  useComiteMutation(quitarIntegrante, false, mutationConfig)
export const useCrearSesionMutation = ({ mutationConfig }: Cfg<typeof crearSesion> = {}) =>
  useComiteMutation(crearSesion, true, mutationConfig)
export const useActualizarSesionMutation = ({ mutationConfig }: Cfg<typeof actualizarSesion> = {}) =>
  useComiteMutation(actualizarSesion, true, mutationConfig)
