import { TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, InfoIcon, PencilIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import type { CaracterizacionDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoCaracterizacion } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/badge-estado-caracterizacion"
import { DialogoConfirmarLimpieza } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/dialogo-confirmar-limpieza"
import { SeccionComponenteFamiliar } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/seccion-componente-familiar"
import { SeccionEstrategias } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/seccion-estrategias"
import { SeccionFactores } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/seccion-factores"
import { SeccionInternetEquipo } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/seccion-internet-equipo"
import { SeccionMatricula } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/seccion-matricula"
import { SeccionNucleoFamiliar } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/seccion-nucleo-familiar"
import { SeccionRegistroEstablecimiento } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/seccion-registro-establecimiento"
import { SeccionSituacionEstudiante } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/seccion-situacion-estudiante"
import { SeccionSocioeconomica } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/seccion-socioeconomica"
import { SeccionTrayectoria } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/seccion-trayectoria"
import { SeccionVivienda } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/seccion-vivienda"
import { useCaracterizacionForm } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"

interface Props {
  detalle: CaracterizacionDetalle
  /** Ver detalle (solo lectura, con «Modificar») o Modificar (formulario con «Guardar»). */
  modo: "ver" | "editar"
}

/**
 * Caracterización familiar y de vivienda (G.8.CAR.3): «Prevención › Caracterización familiar · {estudiante} · {grado/grupo}»
 * con su estado, las secciones del formulario y, aparte, la revisión de factores. Guardar confirma la caracterización
 * para el año; sin fila, lo que se ve es la copia del año anterior (Por confirmar) o la hoja en blanco (Sin diligenciar).
 */
export function PantallaCaracterizacion({ detalle, modo }: Props) {
  const f = useCaracterizacionForm(detalle, modo === "ver")
  const e = detalle
  // Trabajo social (u otro rol sin escritura) ve el formulario completo, pero solo puede revisar factores.
  const sinPermiso = modo === "editar" && !e.puede_modificar

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" type="button" variant="outline" color="neutral" disabled={f.pending} onClick={f.volver}>
                {modo === "ver" ? "Volver" : "Cancelar"}
              </Button>
              {modo === "ver" ? (
                <Button size="sm" type="button" disabled={!e.puede_modificar} onClick={f.modificar}>
                  <PencilIcon data-icon="inline-start" />
                  Modificar
                </Button>
              ) : (
                <Button size="sm" type="button" disabled={f.pending || !e.puede_modificar} onClick={f.guardar}>
                  <IconoCarga cargando={f.pending}>
                    <FloppyDiskIcon data-icon="inline-start" />
                  </IconoCarga>
                  Guardar
                </Button>
              )}
            </div>
          }
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
            {`Prevención › Caracterización familiar · ${e.estudiante.nombre} · ${e.estudiante.grado_grupo}`}
            <BadgeEstadoCaracterizacion estado={e.estado} nombre={e.estado_nombre} />
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <ErrorNoticeBanner error={f.errorBackend} />
          {f.errorListas ? <ErrorNoticeBanner error={f.errorListas} /> : null}
          {sinPermiso && (
            <Alert>
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                No tiene permiso para modificar esta caracterización. Solo puede registrar la revisión de factores.
              </AlertDescription>
            </Alert>
          )}
          {e.copiada_de_anio != null && e.estado === "POR_CONFIRMAR" && (
            <p className="text-sm text-muted-foreground">
              Año {e.anio} · Copiada de la caracterización de {e.copiada_de_anio}. Al guardarla queda <em>Confirmada</em> para {e.anio}.
            </p>
          )}
          {e.estado === "SIN_DILIGENCIAR" && (
            <p className="text-sm text-muted-foreground">
              Año {e.anio} · Sin diligenciar. Al guardarla queda <em>Confirmada</em> para {e.anio}.
            </p>
          )}
          {e.estado === "CONFIRMADA" && e.fecha_confirmacion && (
            <p className="text-sm text-muted-foreground">
              Año {e.anio} · Confirmada{e.confirmada_por ? ` por ${e.confirmada_por}` : ""}.
            </p>
          )}

          {f.cargandoListas ? (
            <Skeleton className="h-96" />
          ) : (
            <>
              <SeccionMatricula detalle={e} />
              <SeccionNucleoFamiliar f={f} />
              <SeccionVivienda f={f} />
              <SeccionInternetEquipo f={f} />
              <SeccionSocioeconomica f={f} />
              <SeccionSituacionEstudiante f={f} />
              <SeccionComponenteFamiliar f={f} />
              <SeccionEstrategias f={f} />
              <SeccionTrayectoria f={f} />
              <SeccionRegistroEstablecimiento f={f} />
              {e.ve_sensible && (
                // Se reinicia con cada revisión registrada para tomar lo que dejó el servidor.
                <SeccionFactores
                  key={`${e.establecimiento.historial_revisiones.length}-${e.establecimiento.fecha_revision ?? ""}`}
                  f={f}
                />
              )}
              <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
            </>
          )}
        </div>
      </TableScreenBody>
      <DialogoConfirmarLimpieza f={f} />
    </>
  )
}
