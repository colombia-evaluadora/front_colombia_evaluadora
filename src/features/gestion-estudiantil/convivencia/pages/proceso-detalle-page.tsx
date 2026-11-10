import { useNavigate } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"

import { useProcesoDetalleQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-detalle-query"
import type { EtapaDecision, EtapaDescargos } from "@/features/gestion-estudiantil/convivencia/api/procesos-detalle-types"
import type { EstadoProcesoCodigo, ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { COLOR_ESTADO_PROCESO } from "@/features/gestion-estudiantil/convivencia/api/procesos-ui"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { BloqueAnulacion } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/bloque-anulacion"
import { DatosProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/datos-proceso"
import { EtapaApertura } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-apertura"
import { EtapaDecisionProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-decision"
import { EtapaDescargosProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-descargos"
import { EtapaFirmeza } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-firmeza"
import { EtapaRecursos } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/etapa-recursos"
import { ItemsDocumentos } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/items-documentos"
import { useDialogosProceso } from "@/features/gestion-estudiantil/convivencia/hooks/use-dialogos-proceso"
import { MenuAccionesProceso, type AccionProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/menu-acciones-proceso"
import { etapaDeAccionPrincipal, textoAccionPrincipal } from "@/features/gestion-estudiantil/convivencia/utils/proceso-detalle"

type Navegar = (opts: { to: string; search: Record<string, unknown> }) => void

function ProcesoDetalleContent({ proceso: p }: { proceso: ProcesoDetalle }) {
  const navigate = useNavigate() as unknown as Navegar
  const volver = () => navigate({ to: paths.app.convivencia.getHref(), search: { tab: "procesos" } })
  const estado = p.estado.codigo as EstadoProcesoCodigo
  const { abrir, dialogos } = useDialogosProceso()
  const principal = p.accion_principal ? etapaDeAccionPrincipal(p.accion_principal) : undefined
  const alAccionar = (accion: AccionProceso) => {
    if (accion !== "ver" && accion !== "anular") abrir(accion, p.id)
  }

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          description={
            <Button variant="ghost" color="neutral" size="sm" className="-ml-3" onClick={volver}>
              <ArrowLeftIcon data-icon="inline-start" />
              Volver a Convivencia
            </Button>
          }
          action={
            <div className="flex items-center gap-2">
              {p.accion_principal && (
                <Button size="sm" disabled={!principal} onClick={() => principal && abrir(principal, p.id)}>
                  {textoAccionPrincipal(p.accion_principal)}
                </Button>
              )}
              <MenuAccionesProceso numero={p.numero} acciones={p.acciones} onAccion={alAccionar} sinVerDetalle>
                <ItemsDocumentos />
              </MenuAccionesProceso>
            </div>
          }
        >
          <span className="flex flex-wrap items-center gap-2">
            Proceso {p.numero}
            <Badge variant="soft" color={COLOR_ESTADO_PROCESO[estado] ?? "muted"}>
              {p.estado.nombre}
            </Badge>
            <span className="text-base font-normal text-muted-foreground">
              {p.estudiante.nombre}
              {p.fecha_en_firme && ` · En firme desde el ${formatFecha(p.fecha_en_firme)}`}
            </span>
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-5 pb-6">
          {p.anulacion && <BloqueAnulacion anulacion={p.anulacion} />}
          <DatosProceso proceso={p} />
          <EtapaApertura proceso={p} />
          <EtapaDescargosProceso etapa={p.etapas.descargos as EtapaDescargos} />
          <EtapaDecisionProceso etapa={p.etapas.decision as EtapaDecision} cargos={p.etapas.apertura.cargos} />
          <EtapaRecursos proceso={p} />
          <EtapaFirmeza proceso={p} />
        </div>
      </TableScreenBody>
      {dialogos}
    </>
  )
}

/** Detalle del proceso disciplinario (G.2.PRD.DET.1). El id llega por props desde router.tsx. */
export function ProcesoDetallePage({ procesoId }: { procesoId: number }) {
  const { data, isPending, isError, error } = useProcesoDetalleQuery(procesoId)
  return (
    <NoticeProvider>
      <TableScreen>
        {isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : isError || !data ? (
          <ErrorNoticeBanner error={error ?? true} fallback="No se encontró el proceso." className="m-6" />
        ) : (
          <ProcesoDetalleContent proceso={data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
