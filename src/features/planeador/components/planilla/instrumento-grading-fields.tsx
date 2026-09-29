import { useId } from "react"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CaretDownIcon, XIcon } from "@/components/ui/icons"
import { inputTriggerVariants, inputVariants } from "@/components/ui/input"
import { cn } from "@/lib/utils"
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

export function notaDe(value: NotaCriterio[], criterioId: number): NotaCriterio | undefined {
  return value.find((n) => n.criterioId === criterioId)
}

/**
 * Los "criterios generales" de una escala son texto plano separado por
 * coma (`TACTIVIDAD_ESCALA.CRITERIOS_GENERALES`, sin PK propio — pedido
 * explícito, no se promovió a una tabla). El backend (V472,
 * `fn_actividad_nota_calificar_escala_criterios`) deriva "cuántos criterios
 * tiene la escala" partiendo ese MISMO string, sin filtrar vacíos — acá se
 * hace exactamente igual para que la cuenta de los dos lados coincida
 * siempre (un string con comas dobles/consecutivas cuenta los huecos como
 * criterios "sin nombre", no los descarta).
 */
export function splitCriteriosGenerales(criteriosGenerales: string | null | undefined): string[] {
  return criteriosGenerales ? criteriosGenerales.split(",") : []
}

/**
 * "Otro (personalizado)" con método de valoración configurado (V240/V241)
 * se califica EXACTAMENTE igual que su instrumento equivalente directo — el
 * backend (`fn_actividad_nota_calificar`) resuelve el método y despacha al
 * MISMO `fn_actividad_nota_calificar_rubrica/_cotejo/_escala`, con el MISMO
 * payload. Confirmado real contra producción: `GET .../instrumento` de un
 * "Otro" con método "Escala de valoración" trae
 * `definicion.metodoValoracionValor` + `definicion.definicion` con la MISMA
 * forma que traería la escala si fuera el instrumento directo.
 *
 * Esta función unifica los dos caminos (directo vs. "Otro" con método) en
 * un solo tipo, para que el resto del archivo (y `buildCalificarCeldaInput`/
 * `buildBulkInputs`) no tengan que repetir el `if (instrumento === "OTRO")`
 * en cada rama. Antes de esto, "Otro" SIEMPRE caía al campo numérico plano
 * sin importar el método configurado — perdiendo la rúbrica/lista de
 * cotejo/escala real definida debajo (reportado en vivo).
 */
export type InstrumentoEfectivo =
  | { tipo: "RUBRICA"; definicion: InstrumentoCriterio[] }
  | { tipo: "LISTA_COTEJO"; definicion: InstrumentoCotejoItem[] }
  | { tipo: "ESCALA_VALORACION"; definicion: InstrumentoEscala }
  /** "Otro" sin método configurado (texto libre real): sigue siendo un
   *  porcentaje manual, no hay estructura que mostrar. */
  | { tipo: "VALOR_NUMERICO" }
  | { tipo: null }

/** Bulk soportado por el backend real: RUBRICA/LISTA_COTEJO siempre;
 *  ESCALA_VALORACION siempre (`calificar-bulk/escala` acepta `PK_NIVEL`/
 *  `VALOR_NUMERICO` con 0-1 criterio, o `CRITERIOS` — un valor por criterio,
 *  igual para todos los estudiantes — con 2+, desde V484). Solo
 *  VALOR_NUMERICO ("Otro" sin método) se queda sin endpoint de bulk. */
export function instrumentoSinBulk(efectivo: InstrumentoEfectivo): boolean {
  return efectivo.tipo === "VALOR_NUMERICO"
}

export function resolverInstrumentoEfectivo(
  instrumento: InstrumentoActividad | undefined,
): InstrumentoEfectivo {
  if (!instrumento || !instrumento.instrumento) return { tipo: null }
  if (instrumento.instrumento === "OTRO") {
    const d = instrumento.definicion
    if (d.metodoValoracionValor === "RUBRICA") return { tipo: "RUBRICA", definicion: d.definicion }
    if (d.metodoValoracionValor === "LISTA_COTEJO") return { tipo: "LISTA_COTEJO", definicion: d.definicion }
    if (d.metodoValoracionValor === "ESCALA_VALORACION") return { tipo: "ESCALA_VALORACION", definicion: d.definicion }
    return { tipo: "VALOR_NUMERICO" }
  }
  if (instrumento.instrumento === "RUBRICA") return { tipo: "RUBRICA", definicion: instrumento.definicion }
  if (instrumento.instrumento === "LISTA_COTEJO") return { tipo: "LISTA_COTEJO", definicion: instrumento.definicion }
  if (instrumento.instrumento === "ESCALA_VALORACION") return { tipo: "ESCALA_VALORACION", definicion: instrumento.definicion }
  return { tipo: null }
}


export function instrumentoCompletitud(
  instrumento: InstrumentoActividad | undefined,
  value: NotaCriterio[],
): { completo: boolean; mensaje?: string } {
  if (!instrumento || !instrumento.instrumento) {
    return { completo: false, mensaje: "Esta actividad todavía no tiene instrumento definido." }
  }
  const efectivo = resolverInstrumentoEfectivo(instrumento)
  if (efectivo.tipo === "RUBRICA") {
    const total = efectivo.definicion.length
    const criteriosActivos = new Set(efectivo.definicion.map((c) => c.pk))
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
  if (efectivo.tipo === "ESCALA_VALORACION") {
    const criterios = splitCriteriosGenerales(efectivo.definicion.criteriosGenerales)
    if (criterios.length > 1) {
      const cubiertos = value.filter(
        (n) => n.criterioId < criterios.length && (n.nivelId != null || n.valor != null),
      ).length
      if (cubiertos < criterios.length) {
        return {
          completo: false,
          mensaje: `Faltan ${criterios.length - cubiertos} de ${criterios.length} criterio(s) por calificar.`,
        }
      }
      return { completo: true }
    }
  }
  return { completo: value.length > 0 }
}

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

  // "Otro (personalizado)" con método configurado se resuelve al MISMO
  // campo que su instrumento equivalente directo (ver el comentario de
  // `resolverInstrumentoEfectivo`) — antes caía siempre a `ValorNumericoField`.
  const efectivo = resolverInstrumentoEfectivo(instrumento)

  if (efectivo.tipo === "RUBRICA") {
    return <RubricaFields criterios={efectivo.definicion} value={value} onChange={onChange} />
  }

  if (efectivo.tipo === "LISTA_COTEJO") {
    return <ListaCotejoSelect items={efectivo.definicion} value={value} onChange={onChange} />
  }

  if (efectivo.tipo === "ESCALA_VALORACION") {
    return <EscalaValoracionFields escala={efectivo.definicion} value={value} onChange={onChange} />
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
  const criterios = splitCriteriosGenerales(escala.criteriosGenerales)
  if (escala.niveles.length === 0) {
    if (criterios.length > 1) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {criterios.map((criterio, index) => (
            <ValorNumericoField
              key={index}
              value={value}
              onChange={onChange}
              criterioId={index}
              label={`Criterio ${index + 1}${criterio.trim() ? `: ${criterio.trim()}` : ""}`}
              min={escala.valorMin ?? undefined}
              max={escala.valorMax ?? undefined}
            />
          ))}
        </div>
      )
    }
    return (
      <ValorNumericoField
        value={value}
        onChange={onChange}
        min={escala.valorMin ?? undefined}
        max={escala.valorMax ?? undefined}
      />
    )
  }

  if (criterios.length > 1) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {criterios.map((criterio, index) => (
          <NivelSelectField
            key={index}
            label={`Criterio ${index + 1}${criterio.trim() ? `: ${criterio.trim()}` : ""}`}
            niveles={escala.niveles}
            nivelIdActual={notaDe(value, index)?.nivelId}
            onSelect={(nivel) => onChange(setNota(value, index, nivel.ponderacion, nivel.pk))}
          />
        ))}
      </div>
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

function ValorNumericoField({
  value,
  onChange,
  min = 0,
  max = 100,
  criterioId = 0,
  label,
}: {
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
  min?: number
  max?: number
  criterioId?: number
  label?: string
}) {
  const id = useId()
  const actual = notaDe(value, criterioId)?.valor
  return (
    <Field variant="outlined">
      <FieldLabel htmlFor={id}>{label ?? `Nota (${min}-${max})`}</FieldLabel>
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
            onChange(quitarNota(value, criterioId))
            return
          }
          onChange(setNota(value, criterioId, Math.min(max, Math.max(min, raw))))
        }}
      />
    </Field>
  )
}

/** Lista de cotejo (ítem tildado = nota 100) como select múltiple con chips
 *  y "Seleccionar todos". */
function ListaCotejoSelect({
  items,
  value,
  onChange,
}: {
  items: InstrumentoCotejoItem[]
  value: NotaCriterio[]
  onChange: (next: NotaCriterio[]) => void
}) {
  const id = useId()
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Esta actividad todavía no tiene ítems de lista de cotejo definidos.
      </p>
    )
  }
  const nombre = (item: InstrumentoCotejoItem) => item.descripcion || `Ítem ${item.pk}`
  const isChecked = (pk: number) => notaDe(value, pk) !== undefined
  const seleccionados = items.filter((i) => isChecked(i.pk))
  const todos = seleccionados.length === items.length
  const toggle = (pk: number) =>
    onChange(isChecked(pk) ? quitarNota(value, pk) : setNota(value, pk, 100))

  return (
    <Field variant="outlined">
      <FieldLabel htmlFor={id}>Ítems</FieldLabel>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              id={id}
              type="button"
              className={cn(
                inputVariants({ variant: "outlined" }),
                inputTriggerVariants({ variant: "outlined" }),
                "flex h-auto min-h-11 items-center justify-between gap-2 py-2 text-left",
              )}
            />
          }
        >
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {seleccionados.length === 0 ? (
              <span className="text-muted-foreground">Seleccionar</span>
            ) : (
              seleccionados.map((item) => (
                <Badge key={item.pk} variant="soft" color="muted" className="text-xs normal-case">
                  <span>{nombre(item)}</span>
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Quitar ${nombre(item)}`}
                    data-icon="inline-end"
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(item.pk)
                    }}
                  >
                    <XIcon className="size-3" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 min-w-64 overflow-y-auto">
          <DropdownMenuCheckboxItem
            checked={todos}
            onCheckedChange={() =>
              onChange(todos ? [] : items.map((i) => ({ criterioId: i.pk, valor: 100 })))
            }
          >
            {todos ? "Deseleccionar todos" : "Seleccionar todos"}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {items.map((item) => (
            <DropdownMenuCheckboxItem
              key={item.pk}
              checked={isChecked(item.pk)}
              onCheckedChange={() => toggle(item.pk)}
            >
              {nombre(item)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  )
}

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
