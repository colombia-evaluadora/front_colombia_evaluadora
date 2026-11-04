import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import { CampusesDataTable } from "@/features/establishment/campuses/components/table/table-campuses"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

export function CampusesPage() {
  const { puedeCrear } = useMenuPermission("SEDES_EDUCATIVAS", { onlineOnlyWrites: true })

  return (
    <CampusesDataTable
      title="Sedes educativas"
      action={
        puedeCrear ? (
          <Button
            render={<Link to={paths.app.establishments.campusAdd.getHref()} />}
            nativeButton={false}
            variant="fill"
            color="primary"
            size="sm"
          >
            <ControlPointIcon data-icon="inline-start" />
            Nueva sede
          </Button>
        ) : undefined
      }
    />
  )
}
