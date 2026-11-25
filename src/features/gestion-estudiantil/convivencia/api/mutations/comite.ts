import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import type { IntegranteInput, SesionInput } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { subirSoporteConvivencia } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import { comiteKeys, convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"

const BASE = "/gestion-estudiantil/convivencia/comite"

export interface CrearComiteInput {
  FK_PERIODO: number
  FK_TLV_CRITERIO_QUORUM?: number | null
  COPIAR_DE_PERIODO?: number | null
  INTEGRANTES: IntegranteInput[]
}

const crearComite = (i: CrearComiteInput) => evalCol.postRow<{ id?: number } & Record<string, unknown>>(BASE, i)

/** `PUT /comite/:ID`: cambia el criterio de quórum (recalcula el de todas sus sesiones). */
const actualizarComite = ({ comiteId, ...body }: { comiteId: number; FK_TLV_CRITERIO_QUORUM: number }) =>
  evalCol.putRow(`${BASE}/${comiteId}`, body)

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

/** Los adjuntos nuevos se suben primero (file-service) y viajan como pk en `ADJUNTOS`, tras los ya guardados. */
type SesionConArchivos = SesionInput & { NUEVOS: File[] }

async function conAdjuntos({ NUEVOS, ...body }: SesionConArchivos): Promise<SesionInput> {
  const subidos = await Promise.all(NUEVOS.map(subirSoporteConvivencia))
  return { ...body, ADJUNTOS: [...(body.ADJUNTOS ?? []), ...subidos] }
}

const crearSesion = async ({ comiteId, ...input }: SesionConArchivos & { comiteId: number }) =>
  evalCol.postRow<{ id?: number } & Record<string, unknown>>(`${BASE}/${comiteId}/sesiones`, await conAdjuntos(input))

const actualizarSesion = async ({ sesionId, ...input }: SesionConArchivos & { sesionId: number }) =>
  evalCol.putRow(`${BASE}/sesiones/${sesionId}`, await conAdjuntos(input))

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
export const useActualizarComiteMutation = ({ mutationConfig }: Cfg<typeof actualizarComite> = {}) =>
  useComiteMutation(actualizarComite, false, mutationConfig)
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
