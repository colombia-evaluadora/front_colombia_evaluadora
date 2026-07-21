import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { AcademicPeriodsDataTable } from "../components/academic-period/academic-periods-table"

export function AcademicPeriodsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Periodos académicos</CardTitle>
      </CardHeader>
      <CardContent>
        <AcademicPeriodsDataTable />
      </CardContent>
    </Card>
  )
}
