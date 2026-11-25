import { formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { AvisosCierre } from "@/features/gestion-estudiantil/convivencia/components/detalle/avisos-cierre"
import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"

/** «Anulación» o «Cierre del caso» (G.2.CAS.PRT.4); solo existe en un caso final, y abre por defecto. */
export function SeccionCierre({ caso }: { caso: CasoDetalle }) {
  const { cierre, anulacion } = caso
  if (!anulacion && !cierre) return null
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo={anulacion ? "Anulación" : "Cierre del caso"}
      contentClassName="flex flex-col gap-3 px-4 py-4"
    >
      {anulacion ? (
        <AvisosCierre caso={caso} />
      ) : (
        cierre && (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Dato label="Resumen del resultado de cierre">
              <span className="whitespace-pre-wrap">{cierre.resumen}</span>
            </Dato>
            <Dato label="Cerrado por">{[cierre.cerrado_por, cierre.cerrado_por_rol].filter(Boolean).join(" · ")}</Dato>
            <Dato label="Fecha y hora de cierre">{formatFechaHora(cierre.cerrado_en)}</Dato>
          </dl>
        )
      )}
    </SeccionPlegable>
  )
}
