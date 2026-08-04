import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"
import { paths } from "@/config/paths"
import { CampusesDataTable } from "../components/table/campuses-table"

export function CampusesPage() {
  return (
    // `overflow-visible`: el `overflow-hidden` del Card anularía el sticky
    // del encabezado.
    <Card className="overflow-visible">
      <CampusesDataTable
        title="Sedes educativas"
        description="Lista de sedes con búsqueda, filtro por zona y nombre."
        action={
          <Button
            variant="fill"
            color="primary"
            size="sm"
            render={<Link to={paths.app.establishments.campuses.add.getHref()} />}
            nativeButton={false}
          >
            <ControlPointIcon data-icon="inline-start" />
            Agregar
          </Button>
        }
      />
    </Card>
  )
}
