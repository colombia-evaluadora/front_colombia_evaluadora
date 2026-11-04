import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"

import { useCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { COLOR_ESTADO } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { AccionesDetalle } from "@/features/gestion-estudiantil/convivencia/components/detalle/acciones-detalle"
import { AvisosCierre } from "@/features/gestion-estudiantil/convivencia/components/detalle/avisos-cierre"
import { DatosCompletos } from "@/features/gestion-estudiantil/convivencia/components/detalle/datos-completos"
import { VistaRestringida } from "@/features/gestion-estudiantil/convivencia/components/detalle/vista-restringida"
import { useCasoDetalle } from "@/features/gestion-estudiantil/convivencia/hooks/use-caso-detalle"

function CasoDetalleContent({ caso }: { caso: CasoDetalle }) {
  const detalle = useCasoDetalle(caso)

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          description={
            <Button variant="ghost" color="neutral" size="sm" className="-ml-3 h-auto font-normal text-sm" onClick={detalle.volver}>
              <ArrowLeftIcon data-icon="inline-start" />
              Volver a Convivencia
            </Button>
          }
          action={caso.acceso_completo && <AccionesDetalle caso={caso} detalle={detalle} />}
        >
          <span className="flex flex-wrap items-center gap-2">
            Caso {caso.numero}
            {/* En <span>: Badge pasa a minúsculas un texto suelto y «Tipo II» quedaría «Tipo ii». */}
            <Badge variant="soft" color="info">
              <span>{caso.tipo_nombre}</span>
            </Badge>
            <Badge variant="soft" color={COLOR_ESTADO[caso.estado_codigo] ?? "muted"}>
              {caso.estado_nombre}
            </Badge>
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className={caso.acceso_completo ? "flex flex-col gap-5 pb-6" : "flex flex-col gap-6 pb-6"}>
          {caso.acceso_completo ? (
            <DatosCompletos caso={caso} />
          ) : (
            <>
              <AvisosCierre caso={caso} />
              <VistaRestringida caso={caso} />
            </>
          )}
        </div>
      </TableScreenBody>
      {detalle.dialogos}
    </>
  )
}

/** Detalle del caso (3.1 y 3.2). El id llega por props desde router.tsx. */
export function CasoDetallePage({ casoId }: { casoId: number }) {
  const { data, isPending, isError, error } = useCasoQuery(casoId)
  return (
    <NoticeProvider>
      <TableScreen>
        {isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : isError || !data ? (
          <ErrorNoticeBanner error={error ?? true} fallback="No se encontró el caso." className="m-6" />
        ) : (
          <CasoDetalleContent caso={data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
