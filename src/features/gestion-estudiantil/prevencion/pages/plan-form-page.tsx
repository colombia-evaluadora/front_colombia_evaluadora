import { TableScreen } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import {
  usePlanQuery,
  useValoracionQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-valoraciones-query"
import { useHistorialQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import { PantallaPlan } from "@/features/gestion-estudiantil/prevencion/components/form/pantalla-plan"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"

const Cargando = () => <Skeleton className="m-6 h-96" />

function PlanNuevoContent({ matricula, valoracion }: { matricula?: number; valoracion?: number }) {
  const { volver } = useNavegacionPrevencion()
  const { establecimientoId } = useAmbitoPrevencion("")
  const tipos = useCatalogo("TIPO_ACCION_PREVENTIVA")
  const historial = useHistorialQuery(matricula)
  const origen = useValoracionQuery(valoracion)

  if (matricula == null) return <ErrorNoticeBanner error fallback="Falta el estudiante del plan." className="m-6" />
  if (historial.isError) return <ErrorNoticeBanner error={historial.error} className="m-6" />
  // Sin acceso a la valoración (p. ej. 403 por la Regla 1/40) el plan se crea igual, sin origen.
  if (!historial.data || tipos.length === 0 || (valoracion != null && origen.isPending)) return <Cargando />

  const o = origen.isError ? undefined : origen.data
  return (
    <PantallaPlan
      modo={{
        modo: "nuevo",
        matricula,
        origen: o ? { id: o.id, fecha: o.fecha, nivelNombre: o.nivel_nombre, nivelValor: o.nivel_valor } : null,
      }}
      titulo={`Prevención › Nuevo plan · ${historial.data.estudiante_nombre}`}
      matricula={matricula}
      establecimiento={establecimientoId}
      origen={o ? { fecha: o.fecha, nivelNombre: o.nivel_nombre, nivelValor: o.nivel_valor } : null}
      onClose={volver}
    />
  )
}

/** Nuevo plan de acompañamiento (G.8.TAB.6), desde una valoración (`?valoracion=`) o sin ella. */
export function PlanNuevoPage(props: { matricula?: number; valoracion?: number }) {
  return (
    <NoticeProvider>
      <TableScreen>
        <PlanNuevoContent {...props} />
      </TableScreen>
    </NoticeProvider>
  )
}

function PlanEditarContent({ planId }: { planId: number }) {
  const { volver } = useNavegacionPrevencion()
  const { establecimientoId } = useAmbitoPrevencion("")
  const tipos = useCatalogo("TIPO_ACCION_PREVENTIVA")
  const plan = usePlanQuery(planId)

  if (plan.isError) return <ErrorNoticeBanner error={plan.error} fallback="No se encontró el plan." className="m-6" />
  if (!plan.data || tipos.length === 0) return <Cargando />

  const p = plan.data
  return (
    <PantallaPlan
      modo={{ modo: "modificar", plan: p }}
      titulo={`Prevención › Modificar plan · ${p.estudiante_nombre}`}
      matricula={p.fk_tmatricula}
      establecimiento={establecimientoId}
      origen={p.valoracion ? { fecha: p.valoracion.fecha, nivelNombre: p.valoracion.nivel_nombre, nivelValor: p.valoracion.nivel_valor } : null}
      onClose={volver}
    />
  )
}

/** Modificar plan (Propuesto o Activo): el mismo formulario con los valores actuales. */
export function PlanEditarPage({ planId }: { planId: number }) {
  return (
    <NoticeProvider>
      <TableScreen>
        <PlanEditarContent planId={planId} />
      </TableScreen>
    </NoticeProvider>
  )
}
