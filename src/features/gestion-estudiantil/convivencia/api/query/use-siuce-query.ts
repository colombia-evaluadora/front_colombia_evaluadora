import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { SiuceFiltros, SiuceVistaPrevia } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import { desenvolver } from "@/features/gestion-estudiantil/commons/api/jsonb"

const FECHA = /^\d{4}-\d{2}-\d{2}$/

/** `POST /siuce/vista-previa`: cuántas filas, casos y pendientes traerá el reporte con esos filtros. */
export function useSiuceVistaPreviaQuery(filtros: SiuceFiltros, enabled = true) {
  const valido = FECHA.test(filtros.DESDE) && FECHA.test(filtros.HASTA) && filtros.DESDE <= filtros.HASTA
  return useQuery({
    queryKey: convivenciaKeys.siuce(filtros),
    queryFn: () =>
      evalCol
        .postRows<Record<string, unknown>>("/gestion-estudiantil/convivencia/siuce/vista-previa", filtros)
        .then((r) => desenvolver<SiuceVistaPrevia>(r[0], "vista_previa", "No se pudo calcular la vista previa.")),
    enabled: enabled && valido,
    placeholderData: keepPreviousData,
  })
}
