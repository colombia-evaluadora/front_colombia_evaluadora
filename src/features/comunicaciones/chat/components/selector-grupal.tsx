import type { OpcionSeleccion } from "@/features/comunicaciones/chat/api/types"
import { useOpcionesSeleccionQuery } from "@/features/comunicaciones/chat/api/query/use-seleccion-grupal-query"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  etiquetaOpcion,
  OPCIONES_PARA,
  type ParaSeleccion,
  type SeleccionGrupal,
} from "@/features/comunicaciones/chat/lib/seleccion-grupal"

// Agregar a un grupo por grado, grupo académico (601, 802-A) o rol (todos los docentes), además del
// buscador de personas. Las opciones son de los establecimientos de quien crea el grupo
// (comms-service); los miembros se resuelven en el servidor al confirmar. De los grados y grupos se
// eligen sus estudiantes, sus acudientes (por invitación, una por acudiente) o ambos.
export function SelectorGrupal({
  enabled,
  value,
  onChange,
}: {
  enabled: boolean
  value: SeleccionGrupal
  onChange: (v: SeleccionGrupal) => void
}) {
  const opciones = useOpcionesSeleccionQuery(enabled)
  const datos = opciones.data

  return (
    // `min-w-0`: un fieldset tiene `min-inline-size: min-content` y se estiraba con los chips.
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-2 text-sm font-medium">O agrega por grado, grupo o rol</legend>
      {opciones.isError ? (
        <p className="text-sm text-muted-foreground">
          No se pudieron cargar los grados, grupos y roles.{" "}
          <button type="button" onClick={() => void opciones.refetch()} className="font-medium text-primary underline">
            Reintentar
          </button>
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo
            etiqueta="Grado"
            nombreAccesible="Grados"
            opciones={datos?.grados ?? []}
            cargando={opciones.isPending}
            value={value.grados}
            onChange={(grados) => onChange({ ...value, grados })}
            placeholder="P. ej.: Sexto"
            vacio="No hay grados con estudiantes matriculados."
          />
          <Campo
            etiqueta="Grupo"
            nombreAccesible="Grupos académicos"
            opciones={datos?.grupos ?? []}
            cargando={opciones.isPending}
            value={value.grupos}
            onChange={(grupos) => onChange({ ...value, grupos })}
            placeholder="P. ej.: 601"
            vacio="No hay grupos con estudiantes matriculados."
          />
          <Campo
            etiqueta="Rol"
            nombreAccesible="Roles"
            opciones={datos?.roles ?? []}
            cargando={opciones.isPending}
            value={value.roles}
            onChange={(roles) => onChange({ ...value, roles })}
            placeholder="P. ej.: Docente"
            vacio="No hay roles de funcionarios."
          />
        </div>
      )}
      {value.grados.length + value.grupos.length > 0 && (
        <fieldset className="min-w-0 space-y-1.5">
          <legend className="text-sm font-medium">De los grados y grupos, agregar a</legend>
          <RadioGroup
            value={value.para ?? "ESTUDIANTES"}
            onValueChange={(v) => onChange({ ...value, para: v as ParaSeleccion })}
            className="flex flex-wrap gap-x-5 gap-y-2"
          >
            {OPCIONES_PARA.map((o) => (
              <label key={o.valor} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={o.valor} />
                {o.etiqueta}
              </label>
            ))}
          </RadioGroup>
        </fieldset>
      )}
      <p className="text-xs text-muted-foreground">
        Los acudientes reciben una invitación (una sola aunque tengan varios hijos) y entran al grupo
        solo si la aceptan.
      </p>
    </fieldset>
  )
}

function Campo({
  etiqueta,
  nombreAccesible,
  opciones,
  cargando,
  value,
  onChange,
  placeholder,
  vacio,
}: {
  etiqueta: string
  nombreAccesible: string
  opciones: OpcionSeleccion[]
  cargando: boolean
  value: OpcionSeleccion[]
  onChange: (v: OpcionSeleccion[]) => void
  placeholder: string
  vacio: string
}) {
  return (
    <div className="relative min-w-0">
      <span className="pointer-events-none absolute -top-2.5 left-3 z-10 bg-popover px-1 text-sm font-medium">
        {etiqueta}
      </span>
      <SelectorChips
        items={opciones}
        value={value}
        onChange={onChange}
        getId={(o) => o.valor}
        getLabel={etiquetaOpcion}
        cargando={cargando}
        conFlecha
        ariaLabel={nombreAccesible}
        placeholder={placeholder}
        vacio={vacio}
        renderItem={(o) => (
          <span className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{o.etiqueta}</span>
              {o.detalle && <span className="block truncate text-xs text-muted-foreground">{o.detalle}</span>}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {o.total === 1 ? "1 persona" : `${o.total} personas`}
            </span>
          </span>
        )}
      />
    </div>
  )
}
