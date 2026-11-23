import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import type { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import type { FiltroEstudiante } from "@/features/gestion-estudiantil/observador/hooks/use-busqueda-estudiantes"

interface CombosProps {
  idPrefix: string
  filtro: FiltroEstudiante
  onChange: (next: FiltroEstudiante) => void
  cascada: ReturnType<typeof useOpcionesCascada>
  /** Grados/Grupos del alcance del propósito (`opciones/grupos`), no los de la cascada común. */
  grupoOpciones: Opcion[]
  /** Se llama al cambiar el establecimiento: lo elegido de otro establecimiento ya no vale. */
  onEstablecimientoCambia?: () => void
}

/** Los combos de la cascada; cada nivel reencuadra los de abajo. */
export function CombosCascadaEstudiante({ idPrefix, filtro, onChange, cascada, grupoOpciones, onEstablecimientoCambia }: CombosProps) {
  const conEstablecimiento = cascada.establecimientoOpciones.length > 0
  return (
    <div className={`grid grid-cols-1 gap-3 ${conEstablecimiento ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
      {conEstablecimiento && (
        <ComboOpciones
          id={`${idPrefix}-establecimiento`}
          label="Establecimiento"
          value={filtro.establecimiento}
          options={cascada.establecimientoOpciones}
          onChange={(establecimiento) => {
            onChange({ establecimiento, sede: "", jornada: "", grupo: "" })
            onEstablecimientoCambia?.()
          }}
        />
      )}
      <ComboOpciones
        id={`${idPrefix}-sede`}
        label="Sede"
        value={filtro.sede}
        options={cascada.sedeOpciones}
        onChange={(sede) => onChange({ ...filtro, sede, jornada: "", grupo: "" })}
      />
      <ComboOpciones
        id={`${idPrefix}-jornada`}
        label="Jornada"
        value={filtro.jornada}
        options={cascada.jornadaOpciones}
        disabled={!filtro.sede}
        placeholder={filtro.sede ? "Todos" : "Seleccione Sede primero"}
        onChange={(jornada) => onChange({ ...filtro, jornada, grupo: "" })}
      />
      <ComboOpciones
        id={`${idPrefix}-grupo`}
        label="Grado/Grupo"
        value={filtro.grupo}
        options={grupoOpciones}
        disabled={!filtro.jornada}
        placeholder={filtro.jornada ? "Todos" : "Seleccione Jornada primero"}
        onChange={(grupo) => onChange({ ...filtro, grupo })}
      />
    </div>
  )
}
