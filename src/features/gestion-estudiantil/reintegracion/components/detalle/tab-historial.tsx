import { LineaTiempo } from "@/features/gestion-estudiantil/prevencion/components/historial/linea-tiempo"
import { construirFilas } from "@/features/gestion-estudiantil/prevencion/utils/historial"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"

/**
 * Pestaña Historial de prevención: la misma línea de tiempo del historial del estudiante (valoraciones, planes
 * y anotaciones de permanencia), de lo más reciente a lo más antiguo. El backend la arma con el alcance de
 * quien consulta; sin acceso a lo sensible vienen vacías las listas.
 */
export function TabHistorial({ caso }: { caso: CasoDetalle }) {
  const h = caso.historial_prevencion
  const filas = construirFilas({ ...h, eventos: h?.eventos ?? [], anotaciones_permanencia: h?.anotaciones_permanencia ?? [] })
  return (
    <div className="py-4">
      <LineaTiempo filas={filas} />
    </div>
  )
}
