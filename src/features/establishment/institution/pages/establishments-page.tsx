import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"
import { paths } from "@/config/paths"

import { EstablishmentsDataTable } from "@/features/establishment/institution/components/table/table-establishments"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

export function EstablishmentsPage() {
  // Un EE nace con su rector: crearlo pide Eliminar, igual que cambiar directivos.
  const { puedeEliminar } = useMenuPermission("ESTABLECIMIENTO", { onlineOnlyWrites: true })

  return (
    <EstablishmentsDataTable
      title="Establecimiento educativo"
      action={
        puedeEliminar ? (
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
