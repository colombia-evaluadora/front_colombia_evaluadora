import { evalCol } from "@/lib/eval-col-client"

import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import {
  usePrevencionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/use-prevencion-mutation"
import type {
  AgregarBeneficiariosInput,
  BeneficiarioAgregado,
  CopiarEstrategiaInput,
  CrearEstrategiaInput,
  FinalizarEstrategiaInput,
  ModificarEstrategiaInput,
  ResultadoEscritura,
  RetirarBeneficiarioInput,
} from "@/features/gestion-estudiantil/prevencion/api/types"

const BASE = `${BASE_PREVENCION}/estrategias`

/** `POST /estrategias`: devuelve el id; 409 «Ya existe la estrategia [Nombre] en esas fechas.» si cruza otra. */
const crearEstrategia = (input: CrearEstrategiaInput) =>
  evalCol.postRow<ResultadoEscritura>(BASE, { ...input, NOMBRE: input.NOMBRE.trim() })

export const useCrearEstrategia = ({ mutationConfig }: MutationCfg<typeof crearEstrategia> = {}) =>
  usePrevencionMutation(crearEstrategia, mutationConfig)

/** `PUT /estrategias/:ID`: el Período Académico no cambia; 400 si está Finalizada. */
const modificarEstrategia = ({ id, ...cuerpo }: ModificarEstrategiaInput) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE}/${id}`, { ...cuerpo, NOMBRE: cuerpo.NOMBRE.trim() })

export const useModificarEstrategia = ({ mutationConfig }: MutationCfg<typeof modificarEstrategia> = {}) =>
  usePrevencionMutation(modificarEstrategia, mutationConfig)

/** `POST /estrategias/:ID/copiar`: devuelve el id de la nueva. */
const copiarEstrategia = ({ id, ...cuerpo }: CopiarEstrategiaInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE}/${id}/copiar`, cuerpo)

export const useCopiarEstrategia = ({ mutationConfig }: MutationCfg<typeof copiarEstrategia> = {}) =>
  usePrevencionMutation(copiarEstrategia, mutationConfig)

/** `POST /estrategias/:ID/beneficiarios`: una fila por beneficiario, con la advertencia de la Regla 43 si aplica. */
const agregarBeneficiarios = ({ id, ...cuerpo }: AgregarBeneficiariosInput) =>
  evalCol.postRows<BeneficiarioAgregado>(`${BASE}/${id}/beneficiarios`, cuerpo)

export const useAgregarBeneficiarios = ({ mutationConfig }: MutationCfg<typeof agregarBeneficiarios> = {}) =>
  usePrevencionMutation(agregarBeneficiarios, mutationConfig)

/** `POST /estrategias/beneficiarios/:ID/retirar`: el id es el del beneficiario. */
const retirarBeneficiario = ({ id, ...cuerpo }: RetirarBeneficiarioInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE}/beneficiarios/${id}/retirar`, cuerpo)

export const useRetirarBeneficiario = ({ mutationConfig }: MutationCfg<typeof retirarBeneficiario> = {}) =>
  usePrevencionMutation(retirarBeneficiario, mutationConfig)

/** `POST /estrategias/:ID/finalizar`: final; cierra a los beneficiarios abiertos. */
const finalizarEstrategia = ({ id, RESULTADO }: FinalizarEstrategiaInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE}/${id}/finalizar`, { RESULTADO: RESULTADO.trim() })

export const useFinalizarEstrategia = ({ mutationConfig }: MutationCfg<typeof finalizarEstrategia> = {}) =>
  usePrevencionMutation(finalizarEstrategia, mutationConfig)
