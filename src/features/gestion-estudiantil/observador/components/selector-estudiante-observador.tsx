import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { CombosCascadaEstudiante } from "@/features/gestion-estudiantil/observador/components/cascada-estudiante"
import {
  etiquetaEstudiante,
  useBusquedaEstudiantes,
} from "@/features/gestion-estudiantil/observador/hooks/use-busqueda-estudiantes"
import type { PropositoEstudiantes } from "@/features/gestion-estudiantil/observador/api/query/use-opciones-observador-query"
import type { EstudianteObservador } from "@/features/gestion-estudiantil/observador/api/types"

interface Props {
  idPrefix: string
  proposito: PropositoEstudiantes
  value: EstudianteObservador | null
  onChange: (estudiante: EstudianteObservador | null) => void
  error?: string
  /** Solo consulta con el diálogo abierto. */
  enabled?: boolean
}

/**
 * Estudiante (G.1.FIR.1 y FIR.3): cascada Establecimiento, Sede, Jornada y Grado/Grupo para acotar
 * y búsqueda remota por nombre o documento, del alcance de quien genera. De su matrícula salen la
 * sede, la jornada y los períodos.
 */
export function SelectorEstudianteObservador({ idPrefix, proposito, value, onChange, error, enabled = true }: Props) {
  const b = useBusquedaEstudiantes(proposito, enabled)
  const lista = b.estudiantes.data ?? []
  // El elegido sigue entre las opciones aunque la búsqueda actual ya no lo traiga.
  const todos = value && !lista.some((e) => e.fk_tmatricula === value.fk_tmatricula) ? [value, ...lista] : lista
  return (
    <div className="flex flex-col gap-3">
      <CombosCascadaEstudiante idPrefix={idPrefix} filtro={b.filtro} onChange={b.setFiltro} cascada={b.cascada} grupoOpciones={b.grupoOpciones} />
      <ComboOpciones
        id={`${idPrefix}-estudiante`}
        label="Estudiante"
        required
        todos={false}
        placeholder="Seleccione"
        value={value ? String(value.fk_tmatricula) : ""}
        options={todos.map((e) => ({ value: String(e.fk_tmatricula), label: etiquetaEstudiante(e) }))}
        error={error}
        onChange={(x) => onChange(todos.find((e) => String(e.fk_tmatricula) === x) ?? null)}
        // Al elegir, el combo escribe la etiqueta del estudiante en el buscador: usarla como búsqueda
        // dejaba la lista reducida a ese estudiante y no se podía cambiar por otro.
        onInputChange={(t) => b.setConsulta(value && t === etiquetaEstudiante(value) ? "" : t)}
        description="Busca por nombre o documento."
      />
    </div>
  )
}
