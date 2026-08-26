import { Button } from "@/components/ui/button"
import { ControlPointIcon, GearIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"
import { paths } from "@/config/paths"

import { MatriculaDataTable } from "@/features/coverage/components/table/table-matricula"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

export function MatriculaPage() {
  const { puedeCrear } = useMenuPermission("MATRICULA")

  return (
    <MatriculaDataTable
      title="Matrícula"
      titleAction={
        <Button
          render={<Link to={paths.app.coberturaMatriculaConfiguracion.getHref()} />}
          variant="outline"
          color="neutral"
          size="icon-sm"
          aria-label="Configuración de parámetros requeridos"
          nativeButton={false}
        >
          <GearIcon />
        </Button>
      }
      action={
        puedeCrear ? (
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
        ) : undefined
      }
    />
  )
}
