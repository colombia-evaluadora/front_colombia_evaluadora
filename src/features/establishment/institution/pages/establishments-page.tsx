import { Link } from "@tanstack/react-router"

import { TableScreenTabs, TableScreenTitle } from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { paths } from "@/config/paths"
import { establishmentsRoute } from "@/router"

import type { PestanaEstablecimientos } from "@/features/establishment/institution/api/schema"
import { usePuedeGestionarEstablecimientosQuery } from "@/features/establishment/institution/api/query/use-puede-gestionar-establecimientos"
import { useOrientacionesPendientesQuery } from "@/features/establishment/institution/api/query/use-orientaciones-recibidas"
import { OrientacionesTab } from "@/features/establishment/institution/components/orientaciones/orientaciones-tab"
import { EstablishmentsDataTable } from "@/features/establishment/institution/components/table/table-establishments"
import { useAccesoOrientaciones } from "@/features/establishment/institution/hooks/use-acceso-orientaciones"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

/** Pestañas que todavía no tienen pantalla: se ven, deshabilitadas, como en el prototipo. */
const PESTANAS_PENDIENTES = ["Vínculos de participación", "Herramientas externas"]

/**
 * Vista Establecimientos con sus pestañas (informe, 2 y 2.3). Orientaciones solo para el Administrador y
 * el Gestor administrativo del establecimiento y el Superadministrador.
 */
export function EstablishmentsPage() {
  const search = establishmentsRoute.useSearch()
  const navigate = establishmentsRoute.useNavigate()
  const acceso = useAccesoOrientaciones()
  // Un EE nace con su rector: crearlo es del Superadministrador o del nivel territorial con Eliminar.
  const { puedeEliminar } = useMenuPermission("ESTABLECIMIENTO", { onlineOnlyWrites: true })
  const { data: puedeGestionarDirectivos } = usePuedeGestionarEstablecimientosQuery()

  const tab: PestanaEstablecimientos | undefined =
    search.tab === "orientaciones" && acceso.visible ? "orientaciones" : undefined
  // El Superadministrador ve el número del establecimiento que eligió.
  const eligio = !acceso.esSuperAdmin || search.oEstablecimiento != null
  const { data: pendientes = 0 } = useOrientacionesPendientesQuery(
    acceso.esSuperAdmin ? search.oEstablecimiento : undefined,
    acceso.visible && eligio,
  )

  const cambiarPestana = (value: string) =>
    navigate({
      // La paginación y el orden son de cada tabla: al cambiar de pestaña vuelven al inicio.
      search: (prev) => ({
        ...prev,
        tab: value === "orientaciones" ? "orientaciones" : undefined,
        page: 0,
        sortBy: undefined,
        sortDir: undefined,
        orientacion: undefined,
      }),
    })

  const encabezado = (
    <>
      <TableScreenTitle>Establecimientos</TableScreenTitle>
      <TableScreenTabs>
        <Tabs
          value={tab ?? "establecimientos"}
          onValueChange={(value) => cambiarPestana(String(value))}
        >
          <TabsList className="border-b-0">
            <TabsTrigger value="establecimientos">Establecimientos</TabsTrigger>
            {acceso.visible ? (
              <TabsTrigger value="orientaciones">
                {pendientes > 0 ? `Orientaciones (${pendientes})` : "Orientaciones"}
              </TabsTrigger>
            ) : null}
            {PESTANAS_PENDIENTES.map((label) => (
              <Tooltip key={label}>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <TabsTrigger value={label} disabled>
                    {label}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Disponible próximamente</TooltipContent>
              </Tooltip>
            ))}
          </TabsList>
        </Tabs>
      </TableScreenTabs>
    </>
  )

  if (tab === "orientaciones") return <OrientacionesTab encabezado={encabezado} acceso={acceso} />

  return (
    <EstablishmentsDataTable
      encabezado={encabezado}
      action={
        puedeEliminar && puedeGestionarDirectivos ? (
          <Button
            render={<Link to={paths.app.establishments.add.getHref()} />}
            variant="fill"
            color="primary"
            size="sm"
            nativeButton={false}
          >
            <ControlPointIcon data-icon="inline-start" />
            Nuevo establecimiento
          </Button>
        ) : undefined
      }
    />
  )
}
