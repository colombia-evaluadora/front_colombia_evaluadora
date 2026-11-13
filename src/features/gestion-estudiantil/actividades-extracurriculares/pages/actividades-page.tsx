"use no memo"

import { useNavigate } from "@tanstack/react-router"

import { NoticeProvider } from "@/components/notice/notice-context"
import { TableScreen, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ControlPointIcon, FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TablePaginationProvider } from "@/hooks/use-table-pagination"

import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { ListadoActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/listado-actividades"
import { ListadoServicioSocial } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/listado-servicio-social"
import { useNavegacionActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-navegacion-actividades"
import { actividadesExtracurricularesRoute } from "@/router"

type Pestana = "actividades" | "servicio-social"

function ActividadesContent() {
  const { tab } = actividadesExtracurricularesRoute.useSearch()
  const navigate = useNavigate()
  const { irNueva } = useNavegacionActividades()
  const pestana: Pestana = tab === "servicio-social" ? "servicio-social" : "actividades"

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex items-center gap-2">
              {/* Brecha B1: no hay endpoint de exportación. */}
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} />}>
                  <Button size="sm" type="button" variant="outline" disabled>
                    <FileDownloadOutlinedIcon data-icon="inline-start" />
                    Exportar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sin exportación disponible todavía</TooltipContent>
              </Tooltip>
              <Button size="sm" type="button" onClick={irNueva}>
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
        {pestana === "actividades" ? <ListadoActividades /> : <ListadoServicioSocial />}
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
