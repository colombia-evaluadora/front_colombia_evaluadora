import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
            onClick={() => void 0}
          >
            Agregar
          </Button>
        </CardAction>
        <CardTitle>Sedes educativas</CardTitle>
        <CardDescription>
          Lista de sedes con búsqueda, filtro por zona y paginación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CampusesDataTable />
      </CardContent>
    </Card>
  )
}