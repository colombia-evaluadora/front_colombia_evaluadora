
import type { OpcionCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import type { EstudianteFila as Fila } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { BotonQuitar } from "@/features/gestion-estudiantil/commons/components/boton-quitar"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"

interface Props {
  fila: Fila
  roles: OpcionCatalogo[]
  mostrarErrores: boolean
  onRol: (rol: string) => void
  /** Ausente: la fila no se puede quitar. */
  onQuitar?: () => void
}

/** Una fila de «Estudiantes involucrados»: nombre, grado y rol en la situación. */
export function FilaEstudiante({ fila: e, roles, mostrarErrores, onRol, onQuitar }: Props) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">{e.nombre}</span>
        {e.grado && <span className="text-muted-foreground"> · {e.grado}</span>}
      </span>
      {/* Select con label flotante, como el resto de campos del proyecto (no el estilo en línea). */}
      <ComboOpciones
        className="w-72 flex-none"
        id={`est-rol-${e.fk_matricula}`}
        label="Rol"
        required
        todos={false}
        value={e.rol}
        options={roles}
        error={mostrarErrores && !e.rol ? "Elija el rol." : undefined}
        onChange={onRol}
      />
      {/* mt-2: el campo con label flotante baja 8px; así la papelera queda centrada con él. */}
      <BotonQuitar label={`Quitar a ${e.nombre}`} onClick={onQuitar ?? (() => {})} disabled={!onQuitar} className="mt-2" />
    </li>
  )
}
