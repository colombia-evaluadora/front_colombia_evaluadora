import { ControlPointIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"

import { AcademicPeriodsDataTable } from "../components/academic-period/table/table-academic-periods"
import { NoticeProvider } from "@/components/notice/notice-context"

export function AcademicPeriodsPage() {
  return (
    <NoticeProvider>
      <AcademicPeriodsDataTable
        title="Periodos académicos"
        action={
          <Button
            color="primary"
            size="sm"
            render={<Link to={paths.app.periodosAcademicosAgregar.getHref()} />}
            nativeButton={false}
          >
            <ControlPointIcon data-icon="inline-start" />
            Agregar
          </Button>
        }
      />
    </NoticeProvider>
  )
}
