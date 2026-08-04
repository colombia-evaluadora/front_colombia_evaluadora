import { ControlPointIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { paths } from "@/config/paths"

import { AcademicPeriodsDataTable } from "../components/academic-period/table/academic-periods-table"
import { NoticeProvider } from "@/components/notice/notice-context"

export function AcademicPeriodsPage() {
  return (
    <NoticeProvider>
      {/* `overflow-visible`: el `overflow-hidden` del Card anularía el sticky
          del encabezado. */}
      <Card className="overflow-visible">
        <AcademicPeriodsDataTable
          title="Periodos académicos"
          action={
            <Button
              color="primary"
              size="sm"
              render={
                <Link to={paths.app.periodosAcademicosAgregar.getHref()} />
              }
              nativeButton={false}
            >
              <ControlPointIcon data-icon="inline-start" />
              Agregar
            </Button>
          }
        />
      </Card>
    </NoticeProvider>
  )
}
