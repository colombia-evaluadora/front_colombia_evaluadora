import { Button } from "@/components/ui/button"
import { ControlPointIcon, GearIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Link } from "@tanstack/react-router"
import { paths } from "@/config/paths"
import { OnlineOnlyAction } from "@/components/offline/online-only-action"

import { MatriculaDataTable } from "@/features/coverage/matricula/components/table/table-matricula"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useMatriculaCapacidades } from "@/features/coverage/matricula/api/query/use-matricula-capacidades"

export function MatriculaPage() {
  const { puedeCrear, puedeEditar } = useMenuPermission("MATRICULA")
  // El alta es de quien opera la matrícula: el super-admin y los territoriales solo ven (V186).
  const { operar } = useMatriculaCapacidades()

  return (
    <MatriculaDataTable
      title="Matrícula"
      titleAction={
        puedeEditar ? (
        <OnlineOnlyAction>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                render={<Link to={paths.app.coberturaMatriculaConfiguracion.getHref()} />}
                variant="outline"
                color="neutral"
                size="icon-sm"
                aria-label="Configuración de parámetros requeridos"
                nativeButton={false}
              />
            }
          >
            <GearIcon />
          </TooltipTrigger>
          <TooltipContent>Configuración de parámetros requeridos</TooltipContent>
        </Tooltip>
        </OnlineOnlyAction>
        ) : null
      }
      action={
        puedeCrear && operar ? (
          <OnlineOnlyAction>
          <Button
            render={<Link to={paths.app.coberturaMatriculaAgregar.getHref()} />}
            variant="fill"
            color="primary"
            size="sm"
            nativeButton={false}
          >
            <ControlPointIcon data-icon="inline-start" />
            Agregar estudiante
          </Button>
          </OnlineOnlyAction>
        ) : undefined
      }
    />
  )
}
