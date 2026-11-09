import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import { EmployeesDataTable } from "@/features/establishment/employees/components/table/table-employees"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

export function EmployeesPage() {
  const { puedeCrear } = useMenuPermission("FUNCIONARIOS")

  return (
    <EmployeesDataTable
      title="Funcionarios"
      action={(establishmentId) =>
        puedeCrear && establishmentId != null ? (
          <Button
            render={
              <Link to={paths.app.establishments.officialAdd.getHref()} search={{ establecimiento: establishmentId }} />
            }
            nativeButton={false}
            variant="fill"
            color="primary"
            size="sm"
          >
            <ControlPointIcon data-icon="inline-start" />
            Nuevo funcionario
          </Button>
        ) : null
      }
    />
  )
}
