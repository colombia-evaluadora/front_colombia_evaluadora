import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { dia } from "@/features/gestion-estudiantil/convivencia/utils/comite"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"

import type { SesionDetalle } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { usePeriodosComiteQuery, useSesionQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-comite-query"
import { BadgeQuorum } from "@/features/gestion-estudiantil/convivencia/components/comite/badge-quorum"
import {
  ActaSesion,
  AsistentesSesion,
  CasosSesion,
  DatosSesion,
  OtrosTemasSesion,
} from "@/features/gestion-estudiantil/convivencia/components/comite/detalle/secciones-sesion"
import { useSesionDetalle } from "@/features/gestion-estudiantil/convivencia/hooks/use-sesion-detalle"

function Contenido({ sesion, periodo, etiqueta }: { sesion: SesionDetalle; periodo: number | undefined; etiqueta: string }) {
  const d = useSesionDetalle(sesion, periodo)

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" color="neutral" onClick={d.descargar} disabled={d.descargando}>
                <IconoCarga cargando={d.descargando}><FileDownloadOutlinedIcon data-icon="inline-start" /></IconoCarga>
                Descargar acta
              </Button>
              <Button size="sm" variant="outline" color="neutral" onClick={d.volver}>
                <ArrowLeftIcon data-icon="inline-start" />
                Volver
              </Button>
            </div>
          }
        >
          <span className="flex flex-wrap items-center gap-2">
            Convivencia › Comité › Sesión del {formatFecha(dia(sesion.fecha))}
            <BadgeQuorum conQuorum={sesion.con_quorum} />
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-6 pb-6">
          <DatosSesion sesion={sesion} periodo={etiqueta} />
          <AsistentesSesion sesion={sesion} />
          <CasosSesion sesion={sesion} />
          <OtrosTemasSesion sesion={sesion} />
          <ActaSesion sesion={sesion} descargando={d.descargando} onDescargar={d.descargar} />
        </div>
      </TableScreenBody>
    </>
  )
}

/** Detalle de una sesión del Comité (G.2.COM.SES.4). El id llega por props desde router.tsx. */
export function SesionDetallePage({ sesionId }: { sesionId: number }) {
  const { data, isPending, isError, error } = useSesionQuery(sesionId)
  const periodos = usePeriodosComiteQuery()
  const fila = periodos.data?.find((p) => p.fk_comite != null && p.fk_comite === data?.fk_comite)
  return (
    <NoticeProvider>
      <TableScreen>
        {isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : isError || !data ? (
          <ErrorNoticeBanner error={error ?? true} fallback="No se encontró la sesión." className="m-6" />
        ) : (
          <Contenido sesion={data} periodo={fila?.fk_periodo} etiqueta={fila?.etiqueta ?? data.periodo_nombre} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
