import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"
import { paths } from "@/config/paths"

import { EstablishmentsDataTable } from "../components/table/establishments-table"

export function EstablishmentsPage() {
  return (
    <EstablishmentsDataTable
      title="Establecimiento educativo"
      description="Lista de establecimientos con búsqueda, filtro por estado y paginación."
      action={
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
      }
    />
  )
}
