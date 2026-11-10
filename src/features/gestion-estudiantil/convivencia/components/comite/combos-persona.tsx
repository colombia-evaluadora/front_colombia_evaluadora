import {
  useEstudiantesComiteQuery,
  useFuncionariosComiteQuery,
} from "@/features/gestion-estudiantil/convivencia/api/query/use-comite-query"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { useBusquedaDiferida } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-busqueda"

interface ComboBaseProps {
  id: string
  label: string
  /** Comité cuyo establecimiento acota la búsqueda; sin él la consulta no corre. */
  periodo: number | null
  /** pk elegida ("" sin elección). */
  value: string
  /** Nombre del elegido, para que siga visible aunque la búsqueda actual ya no lo traiga. */
  nombre?: string
  onChange: (pk: number | null, nombre: string) => void
  required?: boolean
  disabled?: boolean
  error?: string
}

/** El elegido encabeza la lista aunque la búsqueda actual no lo devuelva. */
function conElegido(opciones: Opcion[], value: string, nombre?: string): Opcion[] {
  if (value && !opciones.some((o) => o.value === value)) return [{ value, label: nombre || value }, ...opciones]
  return opciones
}

interface FuncionarioProps extends ComboBaseProps {
  /** Responsable de seguimiento de un caso Tipo II/III: solo los roles que el backend permite. */
  soloSeguimiento?: boolean
}

/** Funcionario del establecimiento con búsqueda en servidor (debounce, sin consulta hasta tener Comité). */
export function ComboFuncionarioComite({
  id,
  label,
  periodo,
  value,
  nombre,
  onChange,
  required,
  disabled,
  error,
  soloSeguimiento = false,
}: FuncionarioProps) {
  const { setTexto, busqueda } = useBusquedaDiferida()
  const q = useFuncionariosComiteQuery(periodo, { soloSeguimiento, search: busqueda })
  const filas = q.data ?? []
  const opciones = conElegido(
    filas.map((f) => ({
      value: String(f.fk_tfuncionario),
      label: f.rol_nombre ? `${f.nombre} · ${f.rol_nombre}` : f.nombre,
    })),
    value,
    nombre,
  )
  return (
    <ComboOpciones
      id={id}
      label={label}
      required={required}
      size="default"
      todos={false}
      disabled={disabled}
      placeholder={q.isFetching && !q.data ? "Cargando…" : "Buscar funcionario"}
      value={value}
      options={opciones}
      error={error}
      onInputChange={setTexto}
      onChange={(v) => {
        const f = filas.find((x) => String(x.fk_tfuncionario) === v)
        onChange(v ? Number(v) : null, f?.nombre ?? "")
      }}
    />
  )
}

/** Estudiante del establecimiento: la consulta exige al menos 2 caracteres. */
export function ComboEstudianteComite({ id, label, periodo, value, nombre, onChange, required, disabled, error }: ComboBaseProps) {
  const { setTexto, busqueda } = useBusquedaDiferida()
  const q = useEstudiantesComiteQuery(periodo, busqueda.length >= 2 ? busqueda : "")
  const filas = q.data ?? []
  const opciones = conElegido(
    filas.map((e) => ({ value: String(e.fk_matricula), label: e.grado_grupo ? `${e.nombre} · ${e.grado_grupo}` : e.nombre })),
    value,
    nombre,
  )
  return (
    <ComboOpciones
      id={id}
      label={label}
      required={required}
      size="default"
      todos={false}
      disabled={disabled}
      placeholder="Escriba al menos 2 letras del nombre"
      value={value}
      options={opciones}
      error={error}
      onInputChange={setTexto}
      onChange={(v) => {
        const e = filas.find((x) => String(x.fk_matricula) === v)
        onChange(v ? Number(v) : null, e?.nombre ?? "")
      }}
    />
  )
}
