import { TableScreen } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"

import { useCaracterizacionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-caracterizacion-query"
import { PantallaCaracterizacion } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/pantalla-caracterizacion"

function CaracterizacionPage({ matricula, modo }: { matricula: number; modo: "ver" | "editar" }) {
  const q = useCaracterizacionQuery(matricula)
  return (
    <NoticeProvider>
      <TableScreen>
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró la caracterización solicitada." className="m-6" />
        ) : (
          <PantallaCaracterizacion detalle={q.data} modo={modo} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}

/** Ver detalle de la caracterización familiar y de vivienda (G.8.CAR.3 en solo lectura, con «Modificar»). */
export function CaracterizacionDetallePage({ matricula }: { matricula: number }) {
  return <CaracterizacionPage matricula={matricula} modo="ver" />
}

/** Modificar la caracterización (G.8.CAR.3): el formulario; guardar la deja Confirmada. */
export function CaracterizacionEditarPage({ matricula }: { matricula: number }) {
  return <CaracterizacionPage matricula={matricula} modo="editar" />
}
