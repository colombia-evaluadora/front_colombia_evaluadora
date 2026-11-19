import { evalCol } from "@/lib/eval-col-client"

import { BASE_GESTION_ALERTAS } from "@/features/gestion-estudiantil/prevencion/api/query/use-gestion-alertas-query"
import {
  usePrevencionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/use-prevencion-mutation"
import type {
  ContactoGestionInput,
  GuardarGestionInput,
  ResolverGestionInput,
  ResultadoEscritura,
  RutaProteccionInput,
} from "@/features/gestion-estudiantil/prevencion/api/types"

/** `PUT /gestion-alertas/:ID`: causas (con su estado en paralelo), medidas y fecha prevista; NULL no toca. */
const guardarGestion = ({ id, ...input }: GuardarGestionInput) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_GESTION_ALERTAS}/${id}`, input)

export const useGuardarGestion = ({ mutationConfig }: MutationCfg<typeof guardarGestion> = {}) =>
  usePrevencionMutation(guardarGestion, mutationConfig)

/** `POST /:ID/contactos`. */
const registrarContacto = ({ id, ...input }: ContactoGestionInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_GESTION_ALERTAS}/${id}/contactos`, input)

export const useRegistrarContactoGestion = ({ mutationConfig }: MutationCfg<typeof registrarContacto> = {}) =>
  usePrevencionMutation(registrarContacto, mutationConfig)

/** `POST /:ID/tomar`: el Supervisor de sede asume una gestión Sin responsable (Regla 44). */
const tomarGestion = ({ id }: { id: number }) => evalCol.postRow<ResultadoEscritura>(`${BASE_GESTION_ALERTAS}/${id}/tomar`, {})

export const useTomarGestion = ({ mutationConfig }: MutationCfg<typeof tomarGestion> = {}) =>
  usePrevencionMutation(tomarGestion, mutationConfig)

/** `POST /:ID/apoyo-orientacion`. */
const apoyoOrientacion = ({ id }: { id: number }) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_GESTION_ALERTAS}/${id}/apoyo-orientacion`, {})

export const useApoyoOrientacionGestion = ({ mutationConfig }: MutationCfg<typeof apoyoOrientacion> = {}) =>
  usePrevencionMutation(apoyoOrientacion, mutationConfig)

/** `POST /:ID/escalar`: a la entidad territorial. */
const escalarGestion = ({ id }: { id: number }) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_GESTION_ALERTAS}/${id}/escalar`, {})

export const useEscalarGestion = ({ mutationConfig }: MutationCfg<typeof escalarGestion> = {}) =>
  usePrevencionMutation(escalarGestion, mutationConfig)

/** `POST /:ID/resolver`: FECHA_VERIFICACION no posterior a hoy. */
const resolverGestion = ({ id, ...input }: ResolverGestionInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_GESTION_ALERTAS}/${id}/resolver`, input)

export const useResolverGestion = ({ mutationConfig }: MutationCfg<typeof resolverGestion> = {}) =>
  usePrevencionMutation(resolverGestion, mutationConfig)

/** `POST /:ID/ruta-proteccion`: activa la ruta (remisión externa con fecha esperada y recordatorios). */
const activarRuta = ({ id, ...input }: RutaProteccionInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_GESTION_ALERTAS}/${id}/ruta-proteccion`, input)

export const useActivarRutaProteccion = ({ mutationConfig }: MutationCfg<typeof activarRuta> = {}) =>
  usePrevencionMutation(activarRuta, mutationConfig)
