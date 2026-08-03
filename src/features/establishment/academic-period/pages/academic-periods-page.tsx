import { PlusIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { paths } from "@/config/paths"

import { AcademicPeriodsDataTable } from "../components/academic-period/table/academic-periods-table"
import { NoticeProvider } from "../components/common/notice-context"

export function AcademicPeriodsPage() {
  return (
    <NoticeProvider>
      <Card>
      <CardHeader>
        <CardAction>
          <Button
            color="primary"
            size="sm"
            render={
              <Link to={paths.app.periodosAcademicosAgregar.getHref()} />
            }
            nativeButton={false}
          >
            <PlusIcon weight="bold" data-icon="inline-start" />
            Agregar
          </Button>
        </CardAction>
        <CardTitle>Periodos académicos</CardTitle>
      </CardHeader>
      <CardContent>
        <AcademicPeriodsDataTable />
      </CardContent>
      </Card>
    </NoticeProvider>
  )
}
