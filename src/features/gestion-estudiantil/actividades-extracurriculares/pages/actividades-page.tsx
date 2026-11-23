"use no memo"

import { useCallback, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { ExportDialog } from "@/components/export-dialog"
import { NoticeProvider } from "@/components/notice/notice-context"
import { TableScreen, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TablePaginationProvider } from "@/hooks/use-table-pagination"

import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useCapacidadesGe } from "@/features/gestion-estudiantil/commons/api/use-capacidades-ge"
import type { OrdenServidor } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import { useExportarActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/mutations/exportar"
import type {
  ActividadesQueryFilters,
  ServicioSocialQueryFilters,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { ListadoActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/listado-actividades"
import { ListadoServicioSocial } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/listado-servicio-social"
import { useNavegacionActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-navegacion-actividades"
import { actividadesExtracurricularesRoute } from "@/router"

type Pestana = "actividades" | "servicio-social"

function ActividadesContent() {
  const { tab } = actividadesExtracurricularesRoute.useSearch()
  const navigate = useNavigate()
  const { irNueva } = useNavegacionActividades()
  // Menú con crear y capacidad del backend; mientras cargan, deshabilitado (no oculto).
  const { puedeCrear } = useMenuPermission("ACTIVIDADES_EXTRACURRICULARES")
  const { data: cap } = useCapacidadesGe()
  const puedeCrearActividad = puedeCrear && Boolean(cap?.actividades_puede_crear)
  const pestana: Pestana = tab === "servicio-social" ? "servicio-social" : "actividades"
  // Filtros aplicados de la pestaña visible: cada listado los publica al montarse y al cambiarlos.
  const [aplicado, setAplicado] = useState<{ filters: ActividadesQueryFilters | ServicioSocialQueryFilters; orden: OrdenServidor } | null>(null)
  const setFiltros = useCallback((filters: ActividadesQueryFilters | ServicioSocialQueryFilters, orden: OrdenServidor) => setAplicado({ filters, orden }), [])
  const exportar = useExportarActividades()

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex items-center gap-2">
              <ExportDialog
                label="Exportar"
                texto="Exportar"
                description={
                  pestana === "actividades"
                    ? "Elige un formato para descargar las actividades con los filtros aplicados."
                    : "Elige un formato para descargar el servicio social con los filtros aplicados."
                }
                disabled={aplicado == null}
                onExport={(format) => exportar.mutateAsync({ pestana, filters: aplicado!.filters, orden: aplicado!.orden, format })}
              />
              <Button size="sm" type="button" disabled={!puedeCrearActividad} onClick={irNueva}>
                <ControlPointIcon data-icon="inline-start" />
                Nueva actividad
              </Button>
            </div>
          }
        >
          Actividades extracurriculares
        </TableScreenTitle>
        <div className="px-(--screen-spacing)">
          <Tabs
            value={pestana}
            onValueChange={(v) =>
              navigate({
                to: ".",
                search: { tab: v === "servicio-social" ? "servicio-social" : undefined },
                replace: true,
              } as never)
            }
          >
            <TabsList>
              <TabsTrigger value="actividades">Actividades</TabsTrigger>
              <TabsTrigger value="servicio-social">Servicio social</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </TableScreenHeader>

      {/* Una paginación por pestaña: al cambiar de pestaña el estado vuelve a la primera página. */}
      <TablePaginationProvider key={pestana}>
        {pestana === "actividades" ? (
          <ListadoActividades onFiltersChange={setFiltros} />
        ) : (
          <ListadoServicioSocial onFiltersChange={setFiltros} />
        )}
      </TablePaginationProvider>
    </>
  )
}

/** Actividades extracurriculares (Gestión Estudiantil §6): listado de actividades y de servicio social. */
export function ActividadesPage() {
  const { puedeVer, isLoading } = useMenuPermission("ACTIVIDADES_EXTRACURRICULARES")

  if (!isLoading && !puedeVer) {
    return (
      <Alert variant="destructive" className="m-4 w-auto">
        <AlertDescription>No tiene acceso a las actividades extracurriculares.</AlertDescription>
      </Alert>
    )
  }

  return (
    <NoticeProvider>
      <TableScreen>
        <ActividadesContent />
      </TableScreen>
    </NoticeProvider>
  )
}
