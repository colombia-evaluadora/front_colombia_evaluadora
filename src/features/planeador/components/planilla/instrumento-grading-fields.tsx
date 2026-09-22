import { useId } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useInstrumentoActividadQuery } from "@/features/planeador/api/query/use-instrumento-actividad-query"
import type {
  InstrumentoActividad,
  InstrumentoCotejoItem,
  InstrumentoCriterio,
  InstrumentoEscala,
} from "@/features/planeador/api/types/planilla"
import type { NotaCriterio } from "@/features/planeador/api/types/calificacion"

interface InstrumentoGradingFieldsProps {
  actividadId: number
  /** Notas de UN estudiante en esta actividad (o el valor "a transmitir" en
   *  la pantalla de calificación en bulk, antes de aplicarlo a nadie). */
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
}

function setNota(
  value: NotaCriterio[],
  criterioId: number,
  valor: number,
  nivelId?: number,
): NotaCriterio[] {
  return [...value.filter((n) => n.criterioId !== criterioId), { criterioId, valor, nivelId }]
}

function quitarNota(value: NotaCriterio[], criterioId: number): NotaCriterio[] {
  return value.filter((n) => n.criterioId !== criterioId)
}

function notaDe(value: NotaCriterio[], criterioId: number): NotaCriterio | undefined {
  return value.find((n) => n.criterioId === criterioId)
}

/**
 * ¿Ya se puede guardar `value` contra el backend real? Rúbrica exige cubrir
 * TODOS los criterios activos en un solo request (400 si falta alguno) —
 * el resto de instrumentos solo necesita al menos una nota cargada. Se usa
 * tanto para deshabilitar el botón "Guardar" como para armar el payload de
 * la mutación (`CeldaNotaPopover`/`CalificarActividadBulk`) sin repetir la
 * misma cuenta.
 */
export function instrumentoCompletitud(
  instrumento: InstrumentoActividad | undefined,
  value: NotaCriterio[],
): { completo: boolean; mensaje?: string } {
  if (!instrumento || !instrumento.instrumento) {
    return { completo: false, mensaje: "Esta actividad todavía no tiene instrumento definido." }
  }
  if (instrumento.instrumento === "RUBRICA") {
    const total = instrumento.definicion.length
    // Solo cuenta contra criterios que SIGUEN activos en la rúbrica de
    // ahora — `value` puede traer una nota precargada (`toNotas`) de un
    // criterio que ya se borró/desactivó después de que el estudiante fue
    // calificado la primera vez. Sin este filtro, esa nota vieja se sumaba
    // a la elegida ahora y "completaba" de más: el backend terminaba
    // rechazando el guardado con "La rúbrica tiene N criterio(s) activo(s)
    // pero se calificaron M" en cuanto el docente elegía el único criterio
    // vigente.
    const criteriosActivos = new Set(instrumento.definicion.map((c) => c.pk))
    const cubiertos = value.filter((n) => n.nivelId != null && criteriosActivos.has(n.criterioId)).length
    if (total === 0) return { completo: false, mensaje: "La rúbrica no tiene criterios activos." }
    if (cubiertos < total) {
      return {
        completo: false,
        mensaje: `Faltan ${total - cubiertos} de ${total} criterio(s) por calificar.`,
      }
    }
    return { completo: true }
  }
  return { completo: value.length > 0 }
}

/**
 * El formulario "volátil" de calificación: qué campos mostrar depende del
 * instrumento REAL de la actividad (`GET .../actividades/:id/instrumento`),
 * no de la rúbrica/lista de cotejo/escala de la Unidad temática — son dos
 * jerarquías independientes en el backend real, y esta es la única que
 * consume calificar. Se usa tal cual tanto en el popover por celda
 * (`CeldaNotaPopover`) como en la pantalla de calificación en bulk
 * (`CalificarActividadBulk`) — el `value`/`onChange` son lo único que
 * cambia entre los dos contextos.
 */
export function InstrumentoGradingFields({
  actividadId,
  value,
  onChange,
}: InstrumentoGradingFieldsProps) {
  const { data: instrumento, isPending } = useInstrumentoActividadQuery(actividadId)

  if (isPending) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner /> Cargando instrumento…
      </div>
    )
  }

  if (!instrumento || !instrumento.instrumento) {
    return (
      <p className="text-muted-foreground text-sm">
        Esta actividad todavía no tiene instrumento de evaluación definido.
      </p>
    )
  }

  if (instrumento.instrumento === "RUBRICA") {
    return <RubricaFields criterios={instrumento.definicion} value={value} onChange={onChange} />
  }

  if (instrumento.instrumento === "LISTA_COTEJO") {
    return <ListaCotejoFields items={instrumento.definicion} value={value} onChange={onChange} />
  }

  if (instrumento.instrumento === "ESCALA_VALORACION") {
    return <EscalaValoracionFields escala={instrumento.definicion} value={value} onChange={onChange} />
  }

  return <ValorNumericoField value={value} onChange={onChange} />
}

function RubricaFields({
  criterios,
  value,
  onChange,
}: {
  criterios: InstrumentoCriterio[]
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
          key={criterio.pk}
          label={criterio.nombre}
          niveles={criterio.niveles}
          nivelIdActual={notaDe(value, criterio.pk)?.nivelId}
          onSelect={(nivel) => onChange(setNota(value, criterio.pk, nivel.ponderacion, nivel.pk))}
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
  escala: InstrumentoEscala
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
}) {
  // Sin niveles cualitativos: es una escala numérica — el backend la exige
  // calificar celda a celda con `valorNumerico`, no con `calificar-bulk`
  // (ver el 400 documentado: "use PUT .../calificar con valorNumerico").
  if (escala.niveles.length === 0) {
    return (
      <ValorNumericoField
        value={value}
        onChange={onChange}
        min={escala.valorMin ?? undefined}
        max={escala.valorMax ?? undefined}
      />
    )
  }
  return (
    <NivelSelectField
      label="Nivel"
      niveles={escala.niveles}
      nivelIdActual={notaDe(value, 0)?.nivelId}
      onSelect={(nivel) => onChange(setNota(value, 0, nivel.ponderacion, nivel.pk))}
    />
  )
}

/**
 * Único campo numérico — cubre la escala NUMÉRICA (rango real
 * `valorMin`-`valorMax` de la escala, confirmado real en
 * `GET .../instrumento`: `definicion.valorMin`/`valorMax`) y el instrumento
 * "OTRO" (shape no confirmado contra el backend real todavía, sin rango
 * propio que mostrar — cae al 0-100 de siempre, mismo criterio conservador
 * que `use-nota-estudiante-query.ts`).
 *
 * El backend califica con el valor CRUDO (`valorNumerico`, la escala
 * 1-5/3-15/etc., NO un porcentaje ya calculado — % = valor / valorMax * 100,
 * ver V469) — antes el campo decía "Nota (0-100)" y no validaba contra el
 * rango real de la escala, así que un docente podía cargar un valor fuera
 * de rango sin aviso hasta que el backend lo rechazara (o, peor, uno DENTRO
 * de 0-100 pero fuera del rango real de la escala, que el backend sí acepta
 * sin quejarse aunque no tenga sentido para esa escala puntual).
 */
function ValorNumericoField({
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
  min?: number
  max?: number
}) {
  const id = useId()
  const actual = notaDe(value, 0)?.valor
  return (
    <Field variant="outlined">
      <FieldLabel htmlFor={id}>{`Nota (${min}-${max})`}</FieldLabel>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        placeholder="Agregar"
        value={actual ?? ""}
        onChange={(e) => {
          const raw = Number(e.target.value)
          if (e.target.value === "" || Number.isNaN(raw)) {
            onChange(quitarNota(value, 0))
            return
          }
          onChange(setNota(value, 0, Math.min(max, Math.max(min, raw))))
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
  items: InstrumentoCotejoItem[]
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
        const checked = notaDe(value, item.pk) !== undefined
        return (
          <li key={item.pk} className="flex items-center gap-3 px-4 py-2.5">
            <Checkbox
              checked={checked}
              onCheckedChange={() =>
                onChange(checked ? quitarNota(value, item.pk) : setNota(value, item.pk, 100))
              }
              aria-label={item.descripcion || `Ítem ${item.pk}`}
            />
            <span className="text-sm">{item.descripcion || `Ítem ${item.pk}`}</span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * `<Select>` de un nivel elegible (nivel de rúbrica o de escala
 * cualitativa), mostrando su etiqueta pero guardando el `pk` real que exige
 * el backend al calificar.
 */
function NivelSelectField({
  label,
  niveles,
  nivelIdActual,
  onSelect,
}: {
  label: string
  niveles: { pk: number; etiqueta: string; ponderacion: number }[]
  nivelIdActual: number | undefined
  onSelect: (nivel: { pk: number; ponderacion: number }) => void
}) {
  const id = useId()
  const etiquetaActual = niveles.find((n) => n.pk === nivelIdActual)?.etiqueta

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
        value={etiquetaActual}
        onValueChange={(nextLabel) => {
          const nivel = niveles.find((n) => n.etiqueta === nextLabel)
          if (nivel) onSelect(nivel)
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Seleccione" />
        </SelectTrigger>
        <SelectContent>
          {niveles.map((nivel) => (
            <SelectItem key={nivel.pk} value={nivel.etiqueta}>
              {nivel.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
