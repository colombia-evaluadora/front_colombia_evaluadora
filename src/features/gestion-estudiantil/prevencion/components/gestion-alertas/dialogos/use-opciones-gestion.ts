import { useMemo } from "react"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { useOpcionesGestionAlertasQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-gestion-alertas-query"
import type { OpcionGestionTlv } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"

const aOpciones = (lista: OpcionGestionTlv[] | undefined): Opcion[] =>
  (lista ?? []).map((o) => ({ value: String(o.id), label: o.nombre }))

/** Listas TLV de `GET /gestion-alertas/opciones` (con su etiqueta) para los modales y el detalle. */
export function useOpcionesGestion() {
  const { establecimientoId } = useAmbitoPrevencion("")
  const q = useOpcionesGestionAlertasQuery(establecimientoId)
  const o = q.data
  return useMemo(
    () => ({
      cargando: q.isPending,
      causas: aOpciones(o?.causas),
      estadosCausa: aOpciones(o?.estados_causa),
      medios: aOpciones(o?.medios),
      conQuien: aOpciones(o?.con_quien),
      resultadosContacto: aOpciones(o?.resultados_contacto),
      entidades: aOpciones(o?.entidades),
      actuaciones: aOpciones(o?.actuaciones),
    }),
    [o, q.isPending],
  )
}
