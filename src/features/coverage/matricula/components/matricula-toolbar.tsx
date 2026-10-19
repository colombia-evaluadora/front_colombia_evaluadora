import { Link, useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
// BookOpenIcon -- solo el ícono del botón de Asignaturas, comentado abajo.
import { PencilIcon } from "@/components/ui/icons"

import { paths } from "@/config/paths"
import { DeleteMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-delete-matricula"
import { FilesMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-files-matricula"
import { RetirarMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-retirar-matricula"
import { ReingresarMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-reingresar-matricula"
import type { Matricula, MatriculaStatus } from "@/features/coverage/matricula/api/types/matricula"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface MatriculaToolbarProps {
  matricula: Matricula
  showModificar?: boolean
  filesEditable?: boolean
}

const NOT_EDITABLE_STATUSES: MatriculaStatus[] = ["Reubicado", "Promovido"]

export function MatriculaToolbar({ matricula, showModificar = true, filesEditable = false }: MatriculaToolbarProps) {
  const navigate = useNavigate()
  const { puedeEditar, puedeEliminar } = useMenuPermission("MATRICULA")

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {puedeEditar && showModificar && !NOT_EDITABLE_STATUSES.includes(matricula.status) && (
        <Button
          render={<Link to={paths.app.coberturaMatriculaEditar.getHref(matricula.id)} search={(prev) => prev} />}
          variant="fill"
          color="primary"
          size="sm"
          nativeButton={false}
        >
          <PencilIcon data-icon="inline-start" />
          Modificar
        </Button>
      )}
      {/* Todavía no hay pantalla de asignaturas para matrícula -- no se va
          a mostrar de momento.
      <Button type="button" variant="outline" color="neutral" size="sm" disabled>
        <BookOpenIcon data-icon="inline-start" />
        Asignaturas
      </Button>
      */}
      {puedeEditar ? <RetirarMatriculaDialog matricula={matricula} trigger="button" /> : null}
      {puedeEditar ? <ReingresarMatriculaDialog matricula={matricula} trigger="button" /> : null}
      <FilesMatriculaDialog matricula={matricula} trigger="button" editable={filesEditable && puedeEditar} />
      {puedeEliminar ? (
        <DeleteMatriculaDialog
          matricula={matricula}
          trigger="button"
          onDeleted={() => navigate({ to: paths.app.coberturaMatricula.getHref() })}
        />
      ) : null}
    </div>
  )
}
