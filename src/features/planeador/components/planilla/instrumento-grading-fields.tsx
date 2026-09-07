import { useId } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type {
  Actividad,
  Criterio,
  EscalaValoracion,
  ListaCotejoItem,
} from "@/features/planeador/api/types/actividad"
import type { NivelElegible, NotaCriterio } from "@/features/planeador/api/types/calificacion"
import { nivelesDe } from "@/features/planeador/api/types/calificacion"

interface InstrumentoGradingFieldsProps {
  actividad: Actividad
  /** Notas de UN estudiante en esta actividad (o el valor "a transmitir" en
   *  la pantalla de calificación en bulk, antes de aplicarlo a nadie). */
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
}

function setNota(value: NotaCriterio[], criterioId: number, valor: number): NotaCriterio[] {
  return [...value.filter((n) => n.criterioId !== criterioId), { criterioId, valor }]
}

function quitarNota(value: NotaCriterio[], criterioId: number): NotaCriterio[] {
  return value.filter((n) => n.criterioId !== criterioId)
}

function notaDe(value: NotaCriterio[], criterioId: number): number | undefined {
  return value.find((n) => n.criterioId === criterioId)?.valor
}

/**
 * El formulario "volátil" de calificación: qué campos mostrar depende del
 * instrumento de la actividad — mismo criterio de resolución que
 * `itemsPonderables` (calificacion.ts), que además resuelve los mismos
 * `metodoValoracion` delegados de "Otro". Se usa tal cual tanto en el
 * popover por celda (`CeldaNotaPopover`) como en la pantalla de
 * calificación en bulk (`CalificarActividadBulk`) — el `value`/`onChange`
 * son lo único que cambia entre los dos contextos.
 */
export function InstrumentoGradingFields({
  actividad,
  value,
  onChange,
}: InstrumentoGradingFieldsProps) {
  const instrumentoEfectivo =
    actividad.instrumento === "Otro"
      ? actividad.instrumentoPersonalizado.metodoValoracion || "Otro"
      : actividad.instrumento

  if (instrumentoEfectivo === "Lista de cotejo") {
    return (
      <ListaCotejoFields items={actividad.listaCotejo.items} value={value} onChange={onChange} />
    )
  }

  if (instrumentoEfectivo === "Escala de valoración") {
    return (
      <EscalaValoracionFields
        escala={actividad.escalaValoracion}
        value={value}
        onChange={onChange}
      />
    )
  }

  if (instrumentoEfectivo === "Otro") {
    return <PersonalizadoSimpleFields value={value} onChange={onChange} />
  }

  return <RubricaFields criterios={actividad.rubrica.criterios} value={value} onChange={onChange} />
}

function RubricaFields({
  criterios,
  value,
  onChange,
}: {
  criterios: Criterio[]
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
}) {
  if (criterios.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Esta actividad todavía no tiene criterios de rúbrica definidos.
      </p>
    )
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {criterios.map((criterio) => (
        <NivelSelectField
          key={criterio.id}
          label={criterio.nombre}
          niveles={nivelesDe(criterio)}
          valorActual={notaDe(value, criterio.id)}
          onSelect={(valor) => onChange(setNota(value, criterio.id, valor))}
        />
      ))}
    </div>
  )
}

function EscalaValoracionFields({
  escala,
  value,
  onChange,
}: {
  escala: EscalaValoracion
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
}) {
  if (escala.tipo === "Numérica") {
    return (
      <EscalaNumericaField
        valorMinimo={escala.valorMinimo ?? 1}
        valorMaximo={escala.valorMaximo ?? 5}
        value={value}
        onChange={onChange}
      />
    )
  }
  return (
    <NivelSelectField
      label={escala.criteriosGenerales || "Nivel"}
      niveles={nivelesDe(escala)}
      valorActual={notaDe(value, 0)}
      onSelect={(valor) => onChange(setNota(value, 0, valor))}
    />
  )
}

/** El único `NotaCriterio` de una escala numérica se guarda como porcentaje
 *  (0-100, misma escala que el resto de los instrumentos) — acá se
 *  desconvierte para mostrar/editar en la escala real de la actividad
 *  (p. ej. 1-5) y se vuelve a convertir al guardar. */
function EscalaNumericaField({
  valorMinimo,
  valorMaximo,
  value,
  onChange,
}: {
  valorMinimo: number
  valorMaximo: number
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
}) {
  const id = useId()
  const porcentajeActual = notaDe(value, 0)
  const rango = valorMaximo - valorMinimo
  const valorActual =
    porcentajeActual !== undefined
      ? valorMinimo + (porcentajeActual / 100) * rango
      : undefined

  return (
    <Field variant="outlined">
      <FieldLabel htmlFor={id}>{`Valor (${valorMinimo}-${valorMaximo})`}</FieldLabel>
      <Input
        id={id}
        type="number"
        min={valorMinimo}
        max={valorMaximo}
        placeholder="Agregar"
        value={valorActual ?? ""}
        onChange={(e) => {
          const raw = Number(e.target.value)
          if (e.target.value === "" || Number.isNaN(raw)) {
            onChange(quitarNota(value, 0))
            return
          }
          const clamped = Math.min(valorMaximo, Math.max(valorMinimo, raw))
          const porcentaje = rango === 0 ? 100 : ((clamped - valorMinimo) / rango) * 100
          onChange(setNota(value, 0, porcentaje))
        }}
      />
    </Field>
  )
}

function ListaCotejoFields({
  items,
  value,
  onChange,
}: {
  items: ListaCotejoItem[]
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
}) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Esta actividad todavía no tiene ítems de lista de cotejo definidos.
      </p>
    )
  }
  return (
    <ul className="border-input divide-border max-h-64 divide-y overflow-y-auto rounded-md border">
      {items.map((item) => {
        const checked = notaDe(value, item.id) !== undefined
        return (
          <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
            <Checkbox
              checked={checked}
              onCheckedChange={() =>
                onChange(
                  checked
                    ? quitarNota(value, item.id)
                    : setNota(value, item.id, item.ponderacion ?? 100),
                )
              }
              aria-label={item.descripcion || `Ítem ${item.id}`}
            />
            <span className="text-sm">{item.descripcion || `Ítem ${item.id}`}</span>
          </li>
        )
      })}
    </ul>
  )
}

function PersonalizadoSimpleFields({
  value,
  onChange,
}: {
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
}) {
  const id = useId()
  const actual = notaDe(value, 0)
  return (
    <Field variant="outlined">
      <FieldLabel htmlFor={id}>Nota (0-100)</FieldLabel>
      <Input
        id={id}
        type="number"
        min={0}
        max={100}
        placeholder="Agregar"
        value={actual ?? ""}
        onChange={(e) => {
          const raw = Number(e.target.value)
          if (e.target.value === "" || Number.isNaN(raw)) {
            onChange(quitarNota(value, 0))
            return
          }
          onChange(setNota(value, 0, Math.min(100, Math.max(0, raw))))
        }}
      />
    </Field>
  )
}

/**
 * `<Select>` de un nivel elegible (nivel de rúbrica o de escala
 * cualitativa), mostrando su etiqueta pero guardando el número que aporta.
 * La etiqueta preseleccionada se aproxima buscando qué nivel tiene el mismo
 * valor guardado — si dos niveles compartieran el mismo valor (p. ej. ambos
 * sin ponderación explícita) gana el primero; no afecta lo que se guarda,
 * solo qué aparece marcado al reabrir.
 */
function NivelSelectField({
  label,
  niveles,
  valorActual,
  onSelect,
}: {
  label: string
  niveles: NivelElegible[]
  valorActual: number | undefined
  onSelect: (valor: number) => void
}) {
  const id = useId()
  const labelActual = niveles.find((n) => n.valor === valorActual)?.label

  if (niveles.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        &ldquo;{label}&rdquo; todavía no tiene niveles definidos.
      </p>
    )
  }

  return (
    <Field variant="outlined">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={labelActual}
        onValueChange={(nextLabel) => {
          const nivel = niveles.find((n) => n.label === nextLabel)
          if (nivel) onSelect(nivel.valor)
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Seleccione" />
        </SelectTrigger>
        <SelectContent>
          {niveles.map((nivel) => (
            <SelectItem key={nivel.label} value={nivel.label}>
              {nivel.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
