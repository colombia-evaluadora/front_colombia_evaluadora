import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { procesosKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import type {
  LimitesSancion,
  OpcionesRecurso,
  OpcionSancion,
} from "@/features/gestion-estudiantil/convivencia/api/procesos-etapas-types"

const BASE = "/gestion-estudiantil/convivencia/procesos"
const K = procesosKeys.etapa

/** §4.2 `opciones/sanciones`: las activas de la instancia que decide (o que resuelve el recurso). */
export function useSancionesOpcionesQuery(matricula: number | null, instancia: string) {
  return useQuery({
    queryKey: K("sanciones", matricula, instancia),
    queryFn: () =>
      evalCol.getRows<OpcionSancion>(`${BASE}/opciones/sanciones?MATRICULA=${matricula}&INSTANCIA=${instancia}`),
    enabled: matricula != null && Boolean(instancia),
    staleTime: 60_000,
  })
}

/** §4.2 `limites-sancion` (la fila trae `{ limites }`): acota los DatePicker de las sanciones. */
export function useLimitesSancionQuery(procesoId: number, fecha: string) {
  return useQuery({
    queryKey: K("limites", procesoId, fecha),
    queryFn: () =>
      evalCol
        .getRow<{ limites: LimitesSancion }>(`${BASE}/${procesoId}/limites-sancion?FECHA=${fecha}`)
        .then((r) => r.limites),
    enabled: Boolean(fecha),
    staleTime: 60_000,
  })
}

/** §4.3 `plazo-recurrir` (la fila trae `{ plazo }`): hasta cuándo se puede recurrir si se notifica en `fecha`. */
export function usePlazoRecurrirQuery(procesoId: number, fecha: string) {
  return useQuery({
    queryKey: K("plazo-recurrir", procesoId, fecha),
    queryFn: () =>
      evalCol
        .getRow<{ plazo: { limite: string | null } }>(`${BASE}/${procesoId}/plazo-recurrir?FECHA=${fecha}`)
        .then((r) => r.plazo),
    enabled: Boolean(fecha),
  })
}

/** §4.4 `opciones/recurso` (la fila trae `{ opciones }`). */
export function useOpcionesRecursoQuery(procesoId: number) {
  return useQuery({
    queryKey: K("recurso", procesoId),
    queryFn: () =>
      evalCol
        .getRow<{ opciones: OpcionesRecurso }>(`${BASE}/${procesoId}/opciones/recurso`)
        .then((r) => r.opciones),
  })
}
