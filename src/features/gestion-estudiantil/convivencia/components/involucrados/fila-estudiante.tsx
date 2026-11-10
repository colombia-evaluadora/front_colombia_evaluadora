import { Button } from "@/components/ui/button"
import { XIcon } from "@/components/ui/icons"

import type { OpcionCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import type { EstudianteFila as Fila } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"

interface Props {
  fila: Fila
  roles: OpcionCatalogo[]
  mostrarErrores: boolean
  onRol: (rol: string) => void
  onQuitar: () => void
}

/** Una fila de «Estudiantes involucrados»: nombre, grado y rol en la situación. */
export function FilaEstudiante({ fila: e, roles, mostrarErrores, onRol, onQuitar }: Props) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">{e.nombre}</span>
        {e.grado && <span className="text-muted-foreground"> · {e.grado}</span>}
      </span>
      <ComboOpciones
        inline
        className="w-72 flex-none gap-2"
        id={`est-rol-${e.fk_matricula}`}
        label="Rol"
        required
        size="sm"
        todos={false}
        value={e.rol}
        options={roles}
        error={mostrarErrores && !e.rol ? "Elija el rol." : undefined}
        onChange={onRol}
      />
      <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Quitar a ${e.nombre}`} onClick={onQuitar}>
        <XIcon />
      </Button>
    </li>
  )
}
