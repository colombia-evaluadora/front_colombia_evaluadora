import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
// BookOpenIcon -- solo el ícono del botón de Asignaturas, comentado abajo.
import { PencilIcon } from "@/components/ui/icons"

import { paths } from "@/config/paths"
import { FilesMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-files-matricula"
import { RetirarMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-retirar-matricula"
import { AccionesDocumentos } from "@/features/coverage/matricula/components/dialogs/acciones/documentos"
import { ReingresarMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-reingresar-matricula"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface MatriculaToolbarProps {
  matricula: Matricula
  showModificar?: boolean
  filesEditable?: boolean
  /** Abre Retirar al entrar (enlace del aviso por inasistencia continua). */
  abrirRetiro?: boolean
}

// Editar solo con la matrícula Cursando (tabla de acciones de la lista).

export function MatriculaToolbar({ matricula, showModificar = true, filesEditable = false, abrirRetiro = false }: MatriculaToolbarProps) {
  const { puedeEditar } = useMenuPermission("MATRICULA")

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {puedeEditar && showModificar && matricula.status === "Cursando" && (
        <Button
          render={<Link to={paths.app.coberturaMatriculaEditar.getHref(matricula.id)} search={(prev) => prev} />}
          // «Modificar» en modo ver siempre es secundario (CLAUDE.md §13): no hay acción principal hasta editar.
          variant="outline"
          color="neutral"
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
      {puedeEditar ? <RetirarMatriculaDialog matricula={matricula} trigger="button" porInasistencia={abrirRetiro} /> : null}
      {puedeEditar ? <ReingresarMatriculaDialog matricula={matricula} trigger="button" /> : null}
      {/* Los cuatro documentos en un desplegable: así caben en la línea del buscador del detalle. */}
      <AccionesDocumentos matricula={matricula} modo="menu" />
      <FilesMatriculaDialog matricula={matricula} trigger="button" editable={filesEditable && puedeEditar} />
    </div>
  )
}
