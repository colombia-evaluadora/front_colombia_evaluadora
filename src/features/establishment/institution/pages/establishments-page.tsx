import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"
import { paths } from "@/config/paths"

import { EstablishmentsDataTable } from "@/features/establishment/institution/components/table/table-establishments"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { usePuedeGestionarDirectivosQuery } from "@/features/establishment/institution/api/query/use-puede-gestionar-directivos"

export function EstablishmentsPage() {
  const { puedeCrear } = useMenuPermission("ESTABLECIMIENTO", { onlineOnlyWrites: true })
  // Un EE nace con su rector: crearlo es del Superadministrador o del nivel
  // territorial aunque la matriz de un rol de nivel establecimiento diga crear (V598).
  const { data: puedeGestionarDirectivos } = usePuedeGestionarDirectivosQuery()

  return (
    <EstablishmentsDataTable
      title="Establecimiento educativo"
      action={
        puedeCrear && puedeGestionarDirectivos ? (
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
