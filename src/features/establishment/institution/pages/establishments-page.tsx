import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"
import { paths } from "@/config/paths"

import { EstablishmentsDataTable } from "@/features/establishment/institution/components/table/table-establishments"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { usePuedeGestionarEstablecimientosQuery } from "@/features/establishment/institution/api/query/use-puede-gestionar-establecimientos"

export function EstablishmentsPage() {
  // Un EE nace con su rector: crearlo es del Superadministrador o del nivel territorial con Eliminar.
  const { puedeEliminar } = useMenuPermission("ESTABLECIMIENTO", { onlineOnlyWrites: true })
  const { data: puedeGestionarDirectivos } = usePuedeGestionarEstablecimientosQuery()

  return (
    <EstablishmentsDataTable
      title="Establecimiento educativo"
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
            Agregar
          </Button>
        ) : undefined
      }
    />
  )
}
