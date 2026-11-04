import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import type { MutationConfig } from "@/lib/react-query"

import { convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import type {
  AccionInput,
  CasoDatosInput,
  EstudianteInput,
  InvolucradoInput,
} from "@/features/gestion-estudiantil/convivencia/api/types"

const BASE = "/gestion-estudiantil/convivencia"
const caso = (id: number) => `${BASE}/casos/${id}`

/** `POST /soporte` (file-service): devuelve el `pk_tarchivo` que se manda como FK del soporte. */
export async function subirSoporteConvivencia(file: File): Promise<number> {
  const raw = await postMultipart<{ rows?: Record<string, unknown>[] } | Record<string, unknown>>(
    `/eval-col${BASE}/soporte`,
    {},
    { SOPORTE: file },
  )
  const fila = (raw && "rows" in raw && Array.isArray(raw.rows) ? raw.rows[0] : raw) as Record<string, unknown>
  const pk = fila?.pk_tarchivo ?? Object.values(fila ?? {}).find((v) => typeof v === "number")
  if (typeof pk !== "number") throw new Error("No se pudo cargar el soporte.")
  return pk
}

const subirTodos = (files: File[]) => Promise.all(files.map(subirSoporteConvivencia))

export interface CrearCasoInput {
  datos: CasoDatosInput
  tipoId: number
  soporte: File | null
  estudiantes: EstudianteInput[]
  involucrados: InvolucradoInput[]
}

async function crearCaso(input: CrearCasoInput) {
  const soporte = input.soporte ? await subirSoporteConvivencia(input.soporte) : input.datos.FK_ARCHIVO_SOPORTE
  return evalCol.postRow<{ id?: number } & Record<string, unknown>>(`${BASE}/casos`, {
    ...input.datos,
    FK_ARCHIVO_SOPORTE: soporte,
    FK_TLV_TIPO: input.tipoId,
    ESTUDIANTES: input.estudiantes,
    INVOLUCRADOS: input.involucrados,
  })
}

export interface ActualizarCasoInput {
  casoId: number
  datos: CasoDatosInput
  soporte: File | null
  motivoCorreccion: string | null
  /** Cambios del constructor frente a lo guardado: van por sus endpoints propios. */
  estudiantesNuevos: EstudianteInput[]
  estudiantesQuitados: number[]
  rolesCambiados: { id: number; fk_tlv_rol: number }[]
  involucradosNuevos: InvolucradoInput[]
  involucradosQuitados: number[]
}

async function actualizarCaso(input: ActualizarCasoInput) {
  const soporte = input.soporte ? await subirSoporteConvivencia(input.soporte) : input.datos.FK_ARCHIVO_SOPORTE
  await evalCol.putRow(caso(input.casoId), {
    ...input.datos,
    FK_ARCHIVO_SOPORTE: soporte,
    MOTIVO_CORRECCION: input.motivoCorreccion,
  })
  // Primero se agrega y luego se quita: el mínimo de involucrados (Regla 12) se valida en cada paso.
  for (const e of input.estudiantesNuevos)
    await evalCol.postRow(`${caso(input.casoId)}/estudiantes`, { FK_MATRICULA: e.fk_matricula, FK_TLV_ROL: e.fk_tlv_rol })
  for (const r of input.rolesCambiados)
    await evalCol.patchRow(`${caso(input.casoId)}/estudiantes/${r.id}`, { FK_TLV_ROL: r.fk_tlv_rol })
  for (const i of input.involucradosNuevos)
    await evalCol.postRow(`${caso(input.casoId)}/involucrados`, {
      FK_TLV_TIPO_INVOLUCRADO: i.fk_tlv_tipo_involucrado,
      FK_FUNCIONARIO: i.fk_funcionario,
      NOMBRE: i.nombre,
      FK_TLV_TIPO_DOCUMENTO: i.fk_tlv_tipo_documento,
      NUMERO_DOCUMENTO: i.numero_documento,
      FK_TLV_ROL: i.fk_tlv_rol,
    })
  for (const id of input.estudiantesQuitados) await evalCol.postRow(`${caso(input.casoId)}/estudiantes/${id}/quitar`, {})
  for (const id of input.involucradosQuitados) await evalCol.postRow(`${caso(input.casoId)}/involucrados/${id}/quitar`, {})
  return input.casoId
}

async function registrarAccion({ casoId, soportes, ...body }: AccionInput & { soportes: File[] }) {
  const archivos = soportes.length ? await subirTodos(soportes) : null
  return evalCol.postRow(`${caso(casoId)}/acciones`, { ...body, FK_ARCHIVOS: archivos })
}

const asignarGestor = (i: { casoId: number; funcionarioId: number }) =>
  evalCol.postRow(`${caso(i.casoId)}/gestor`, { FK_FUNCIONARIO: i.funcionarioId })

export interface CambiarTipoInput {
  casoId: number
  FK_TLV_TIPO: number
  MOTIVO: string
  TIPOS_DANO: number[] | null
  FK_TLV_TIPO_AGRESION: number | null
  SITUACION_REPETITIVA: boolean | null
  SECUELAS_FISICAS: boolean | null
}

const cambiarTipo = ({ casoId, ...body }: CambiarTipoInput) => evalCol.postRow(`${caso(casoId)}/tipo`, body)

const cerrarCaso = (i: { casoId: number; resumen: string }) =>
  evalCol.postRow(`${caso(i.casoId)}/cerrar`, { RESUMEN: i.resumen.trim() })

const anularCaso = (i: { casoId: number; motivo: string }) =>
  evalCol.postRow(`${caso(i.casoId)}/anular`, { MOTIVO: i.motivo.trim() })

/** Toda escritura invalida el feature entero: listado, detalle, pasos y gestores cuelgan de `convivenciaKeys.all`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useConvivenciaMutation<F extends (input: any) => Promise<any>>(fn: F, mutationConfig?: MutationConfig<F>) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: fn,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: convivenciaKeys.all })
      onSuccess?.(...args)
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cfg<F extends (...args: any) => Promise<any>> = { mutationConfig?: MutationConfig<F> }

export const useCrearCaso = ({ mutationConfig }: Cfg<typeof crearCaso> = {}) =>
  useConvivenciaMutation(crearCaso, mutationConfig)
export const useActualizarCaso = ({ mutationConfig }: Cfg<typeof actualizarCaso> = {}) =>
  useConvivenciaMutation(actualizarCaso, mutationConfig)
export const useRegistrarAccion = ({ mutationConfig }: Cfg<typeof registrarAccion> = {}) =>
  useConvivenciaMutation(registrarAccion, mutationConfig)
export const useAsignarGestor = ({ mutationConfig }: Cfg<typeof asignarGestor> = {}) =>
  useConvivenciaMutation(asignarGestor, mutationConfig)
export const useCambiarTipo = ({ mutationConfig }: Cfg<typeof cambiarTipo> = {}) =>
  useConvivenciaMutation(cambiarTipo, mutationConfig)
export const useCerrarCaso = ({ mutationConfig }: Cfg<typeof cerrarCaso> = {}) =>
  useConvivenciaMutation(cerrarCaso, mutationConfig)
export const useAnularCaso = ({ mutationConfig }: Cfg<typeof anularCaso> = {}) =>
  useConvivenciaMutation(anularCaso, mutationConfig)
