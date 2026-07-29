import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { EmployeesDataTable } from "../components/table/employees-table"

export function EmployeesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funcionarios</CardTitle>
        <CardDescription>
          Lista de funcionarios con búsqueda, filtros por rol, jornada y estado, y paginación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmployeesDataTable />
      </CardContent>
    </Card>
  )
}