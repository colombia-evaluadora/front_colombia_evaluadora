import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"
import { paths } from "@/config/paths"
import { CampusesDataTable } from "../components/table/campuses-table"

export function CampusesPage() {
  return (
    <Card>
      <CardHeader>
        <CardAction>
          <Button
            variant="fill"
            color="primary"
            size="sm"
            render={<Link to={paths.app.establishments.campuses.add.getHref()} />}
            nativeButton={false}
          >
            <PlusIcon data-icon="inline-start" />
            Agregar
          </Button>
        </CardAction>
        <CardTitle>Sedes educativas</CardTitle>
        <CardDescription>
          Lista de sedes con búsqueda, filtro por zona y nombre.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CampusesDataTable />
      </CardContent>
    </Card>
  )
}