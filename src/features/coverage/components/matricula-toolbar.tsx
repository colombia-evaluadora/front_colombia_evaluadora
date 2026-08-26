import { Link, useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { BookOpenIcon, PencilIcon } from "@/components/ui/icons"

import { paths } from "@/config/paths"
import { DeleteMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-delete-matricula"
import { FilesMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-files-matricula"
import { RetirarMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-retirar-matricula"
import type { Matricula } from "@/features/coverage/api/types/matricula"

interface MatriculaToolbarProps {
  matricula: Matricula
  /** En "Editar" no tiene sentido —ya estás editando—, así que ese modo lo
   * oculta. */
  showModificar?: boolean
}

/**
 * Fila de 5 acciones de "Detalle"/"Editar", alineada a la derecha — sin
 * card propia, va directo en el flujo de secciones. Reemplaza a la sección
 * "Archivo de soporte" inline que sí tiene el alta (acá "Archivos" vive en
 * el sheet de este botón, no en el cuerpo del formulario).
 */
export function MatriculaToolbar({ matricula, showModificar = true }: MatriculaToolbarProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {showModificar && (
        <Button
          render={<Link to={paths.app.coberturaMatriculaEditar.getHref(matricula.id)} />}
          variant="fill"
          color="primary"
          size="sm"
          nativeButton={false}
        >
          <PencilIcon data-icon="inline-start" />
          Modificar
        </Button>
      )}
      {/* Todavía no hay pantalla de asignaturas para matrícula. */}
      <Button type="button" variant="outline" color="neutral" size="sm" disabled>
        <BookOpenIcon data-icon="inline-start" />
        Asignaturas
      </Button>
      <RetirarMatriculaDialog matricula={matricula} trigger="button" />
      <FilesMatriculaDialog matricula={matricula} trigger="button" />
      <DeleteMatriculaDialog
        matricula={matricula}
        trigger="button"
        onDeleted={() => navigate({ to: paths.app.coberturaMatricula.getHref() })}
      />
    </div>
  )
}
