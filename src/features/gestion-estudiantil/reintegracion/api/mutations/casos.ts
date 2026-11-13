import { evalCol } from "@/lib/eval-col-client"

import { subirSoporteConvivencia } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import type { CasoDatosInput } from "@/features/gestion-estudiantil/convivencia/api/types"
import { desenvolver } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { BASE_REINTEGRACION } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import {
  useReintegracionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/reintegracion/api/mutations/use-reintegracion-mutation"
import type {
  AbrirCasoInput,
  ActaRetiro,
  AsignarCasoInput,
  CambiarEstadoInput,
  CerrarCasoInput,
  CerrarCasoResultado,
  MarcarSimpadeInput,
  ModificarCasoInput,
  ResultadoEscritura,
  ValidarCasoInput,
} from "@/features/gestion-estudiantil/reintegracion/api/types"

const casoUrl = (id: number, accion = "") => `${BASE_REINTEGRACION}/casos/${id}${accion}`

/** `POST /casos`: apertura manual; 409 si el estudiante ya tiene un caso abierto. */
const abrirCaso = ({ MOTIVO, ...resto }: AbrirCasoInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_REINTEGRACION}/casos`, { ...resto, MOTIVO: MOTIVO.trim() })

export const useAbrirCaso = ({ mutationConfig }: MutationCfg<typeof abrirCaso> = {}) =>
  useReintegracionMutation(abrirCaso, mutationConfig)

/** `PUT /casos/:ID`: alta complejidad, razones del abandono y observaciones del profesional. */
const modificarCaso = ({ id, ...body }: ModificarCasoInput) => evalCol.putRow<ResultadoEscritura>(casoUrl(id), body)

export const useModificarCaso = ({ mutationConfig }: MutationCfg<typeof modificarCaso> = {}) =>
  useReintegracionMutation(modificarCaso, mutationConfig)

/** `POST /casos/:ID/asignar`: asigna o reasigna al Profesional de trabajo social. */
const asignarCaso = ({ id, FK_PROFESIONAL }: AsignarCasoInput) =>
  evalCol.postRow<ResultadoEscritura>(casoUrl(id, "/asignar"), { FK_PROFESIONAL })

export const useAsignarCaso = ({ mutationConfig }: MutationCfg<typeof asignarCaso> = {}) =>
  useReintegracionMutation(asignarCaso, mutationConfig)

/** `POST /casos/:ID/estado`: solo entre `estados_siguientes`; Diagnóstico exige razones. */
const cambiarEstado = ({ id, ...body }: CambiarEstadoInput) =>
  evalCol.postRow<ResultadoEscritura>(casoUrl(id, "/estado"), body)

export const useCambiarEstado = ({ mutationConfig }: MutationCfg<typeof cambiarEstado> = {}) =>
  useReintegracionMutation(cambiarEstado, mutationConfig)

/** `POST /casos/:ID/validar`: VALIDAR pasa a Intervención; DEVOLVER exige observación de 10 a 500. */
const validarCaso = ({ id, DECISION, OBSERVACION }: ValidarCasoInput) =>
  evalCol.postRow<ResultadoEscritura>(casoUrl(id, "/validar"), { DECISION, OBSERVACION: OBSERVACION?.trim() || null })

export const useValidarCaso = ({ mutationConfig }: MutationCfg<typeof validarCaso> = {}) =>
  useReintegracionMutation(validarCaso, mutationConfig)

/** `POST /casos/:ID/aprobar-reingreso`: solo autoriza el regreso; no matricula. */
const aprobarReingreso = ({ id }: { id: number }) =>
  evalCol.postRow<ResultadoEscritura>(casoUrl(id, "/aprobar-reingreso"), {})

export const useAprobarReingreso = ({ mutationConfig }: MutationCfg<typeof aprobarReingreso> = {}) =>
  useReintegracionMutation(aprobarReingreso, mutationConfig)

/** `POST /casos/:ID/cerrar` → `datos` `{id, fk_caso_nuevo}`; con Reevaluación abre un caso nuevo vinculado. */
const cerrarCaso = async ({ id, FK_MOTIVO }: CerrarCasoInput) =>
  desenvolver<CerrarCasoResultado>(
    await evalCol.postRow<Record<string, unknown>>(casoUrl(id, "/cerrar"), { FK_MOTIVO: FK_MOTIVO ?? null }),
    "datos",
    "No se pudo cerrar el caso.",
  )

export const useCerrarCaso = ({ mutationConfig }: MutationCfg<typeof cerrarCaso> = {}) =>
  useReintegracionMutation(cerrarCaso, mutationConfig)

export interface AbrirConvivenciaInput {
  casoId: number
  /** Los mismos datos que `POST /convivencia/casos` (sin estudiantes). */
  datos: CasoDatosInput
  tipoId: number
  /** pk de `ROL_SITUACION` del estudiante del caso. */
  rolId: number
  soporte: File | null
}

/**
 * `POST /casos/:ID/caso-convivencia`: mismos campos que `POST /convivencia/casos`; el soporte, si hay, se sube
 * primero a file-service y viaja como `FK_ARCHIVO_SOPORTE`. Responde el id del caso de convivencia.
 */
const abrirConvivencia = async ({ casoId, datos, tipoId, rolId, soporte }: AbrirConvivenciaInput) => {
  const archivo = soporte ? await subirSoporteConvivencia(soporte) : datos.FK_ARCHIVO_SOPORTE
  return evalCol.postRow<ResultadoEscritura>(casoUrl(casoId, "/caso-convivencia"), {
    ...datos,
    FK_ARCHIVO_SOPORTE: archivo,
    FK_TLV_TIPO: tipoId,
    FK_TLV_ROL: rolId,
    INVOLUCRADOS: [],
  })
}

export const useAbrirConvivencia = ({ mutationConfig }: MutationCfg<typeof abrirConvivencia> = {}) =>
  useReintegracionMutation(abrirConvivencia, mutationConfig)

/** `POST /casos/:ID/acta` → `datos`: contenido del acta de retiro (§10.1), sin PDF por ahora. */
const generarActa = async ({ id }: { id: number }) =>
  desenvolver<ActaRetiro>(
    await evalCol.postRow<Record<string, unknown>>(casoUrl(id, "/acta"), {}),
    "datos",
    "No se pudo generar el acta de retiro.",
  )

export const useGenerarActa = ({ mutationConfig }: MutationCfg<typeof generarActa> = {}) =>
  useReintegracionMutation(generarActa, mutationConfig)

/** `POST /casos/:ID/simpade`: fecha de ingreso (no posterior a hoy) y quién digitó (por defecto, quien marca). */
const marcarSimpade = ({ id, FECHA, FK_DIGITADO_POR }: MarcarSimpadeInput) =>
  evalCol.postRow<ResultadoEscritura>(casoUrl(id, "/simpade"), { FECHA, FK_DIGITADO_POR: FK_DIGITADO_POR ?? null })

export const useMarcarSimpade = ({ mutationConfig }: MutationCfg<typeof marcarSimpade> = {}) =>
  useReintegracionMutation(marcarSimpade, mutationConfig)
