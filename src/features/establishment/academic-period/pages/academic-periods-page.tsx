import { ControlPointIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"

import { AcademicPeriodsDataTable } from "@/features/establishment/academic-period/components/table/table-academic-periods"
import { NoticeProvider } from "@/components/notice/notice-context"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

export function AcademicPeriodsPage() {
  const { puedeCrear } = useMenuPermission("PERIODOS_ACADEMICOS")

  return (
    <NoticeProvider>
      <AcademicPeriodsDataTable
        title="Periodos académicos"
        action={
          puedeCrear ? (
            <Button
              color="primary"
              size="sm"
              render={<Link to={paths.app.periodosAcademicosAgregar.getHref()} />}
              nativeButton={false}
            >
              <ControlPointIcon data-icon="inline-start" />
              Agregar
            </Button>
          ) : undefined
        }
      />
    </NoticeProvider>
  )
}
