import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { AcademicPeriodsDataTable } from "../components/academic-period/academic-periods-table"

export function AcademicPeriodsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Periodos académicos</CardTitle>
        <CardDescription>
          Años lectivos por sede con su estado y rango de fechas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcademicPeriodsDataTable />
      </CardContent>
    </Card>
  )
}
