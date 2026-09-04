import { useState } from "react"

import { Button } from "@/components/ui/button"
import { FieldDescription, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlusCircleIcon, PlusIcon, TrashIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

interface ListaAgregableFieldProps {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}

/**
 * Lista de texto libre que se arma de a un ítem por vez: el input de abajo
 * agrega (Enter o el botón "+" del título) en vez de guardar todo como un
 * solo texto separado por coma — cada ítem agregado aparece como su propia
 * fila, con su tachito para sacarlo. Mismo idioma que "Materiales de apoyo"
 * en `form-editar-actividad.tsx`: título + botón "+" en la misma fila, el
 * input abajo es `outline` simple (sin el label flotando encima del
 * borde) — no un `Field variant="outlined"`.
 *
 * Mismo widget para "Contenidos"/"Objetivos" en `CrearUnidadPopover` (el
 * popover de alta rápida desde el form de Actividad) y en
 * `UnidadInfoGeneralFields` (páginas de alta/edición de la unidad), para
 * que las tres pantallas se comporten igual.
 */
export function ListaAgregableField({
  label,
  items,
  onChange,
  placeholder = "Agregar",
}: ListaAgregableFieldProps) {
  const [draft, setDraft] = useState("")

  function agregar() {
    const value = draft.trim()
    if (!value) return
    onChange([...items, value])
    setDraft("")
  }

  function quitar(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{label}</h4>
        <Button
          type="button"
          variant="fill"
          color="primary"
          size="icon-sm"
          aria-label={`Agregar a "${label}"`}
          disabled={!draft.trim()}
          onClick={agregar}
        >
          <PlusIcon />
        </Button>
      </div>

      <Input
        variant="outlined"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            agregar()
          }
        }}
      />

      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-2 text-sm"
            >
              <span className="min-w-0 break-words">{item}</span>
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                aria-label={`Quitar "${item}"`}
                onClick={() => quitar(index)}
              >
                <TrashIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface ListaAgregableCajaProps {
  title: string
  description?: string
  /** Encabezado de la única columna de la caja (ej. "OBJETIVO",
   *  "CONTENIDO (COMPONENTE)") — mayúsculas vía CSS, no hace falta pasarlo
   *  así. */
  columnLabel: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}

/**
 * Variante "caja" del mismo widget de arriba: título + descripción afuera,
 * un bloque con borde que solo tiene el encabezado de columna y los ítems
 * ya agregados (separados por líneas, tachito solo al hover — mismo
 * idioma que las filas de acción de `DataTable`), y el input de alta
 * AFUERA de esa caja, en su propia fila — no como última fila dentro del
 * borde: el input es para cargar el próximo ítem, no uno ya guardado, así
 * que no pertenece visualmente a la lista.
 *
 * El botón "Agregar…" al lado del input solo aparece con texto tipeado
 * (mismo criterio que "Vincular" en `dialog-agregar-actividad.tsx`): un
 * botón siempre visible pero deshabilitado invita a completar el resto del
 * form primero, cuando acá alcanza con escribir y confirmar. Enter hace lo
 * mismo sin necesidad del botón.
 *
 * Es lo que usan las páginas de alta/edición de unidad
 * (`UnidadInfoGeneralFields`) para "Objetivos"/"Contenidos" —
 * `ListaAgregableField` (arriba) es la variante compacta que usa
 * `CrearUnidadPopover`, con título y botón "+" en la misma fila; acá el
 * mockup de la página completa pide la lista en su propia caja.
 */
export function ListaAgregableCaja({
  title,
  description,
  columnLabel,
  items,
  onChange,
  placeholder = "Agregar",
}: ListaAgregableCajaProps) {
  const [draft, setDraft] = useState("")

  function agregar() {
    const value = draft.trim()
    if (!value) return
    onChange([...items, value])
    setDraft("")
  }

  function quitar(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <FieldSet className="gap-2">
      {/* `<legend>` a mano, no `FieldLegend`: esa lleva `text-xs uppercase`
          fijos vía `data-[variant=legend]:text-xs` en la clase base, y ese
          selector con modificador gana en el cascade sobre un `text-base`
          pasado por `className` (tailwind-merge no los ve como el mismo
          slot y no dedupea) — el título quedaba chico y en mayúscula pase
          lo que pase se le pasara por className. Acá el título necesita
          verse como título de sección, no como el label chico de un
          field. */}
      <legend className="mb-0 text-base font-semibold">{title}</legend>
      {description && <FieldDescription>{description}</FieldDescription>}

      <div className="rounded-md border">
        <p
          className={cn(
            "text-muted-foreground px-3 py-2 text-xs font-semibold tracking-wide uppercase",
            items.length > 0 && "border-b",
          )}
        >
          {columnLabel}
        </p>
        {items.length > 0 && (
          <ul className="divide-y">
            {items.map((item, index) => (
              <li
                key={index}
                className="group/item flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="min-w-0 break-words">{item}</span>
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Quitar "${item}"`}
                  className="opacity-0 transition-opacity group-hover/item:opacity-100 group-focus-within/item:opacity-100"
                  onClick={() => quitar(index)}
                >
                  <TrashIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-start gap-2">
        <Input
          variant="outlined"
          className="flex-1"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              agregar()
            }
          }}
        />
        {draft.trim() && (
          <Button type="button" variant="fill" color="primary" size="default" onClick={agregar}>
            <PlusCircleIcon data-icon="inline-start" />
            Agregar {columnLabel.toLowerCase()}
          </Button>
        )}
      </div>
    </FieldSet>
  )
}

interface ListaAgregableCajaSelectProps {
  title: string
  description?: string
  /** Encabezado de la única columna de la caja (ej. "ENUNCIADOS"). */
  columnLabel: string
  items: string[]
  /** Opciones que puede ofrecer el `<Select>` de abajo (ya sin las que
   *  están en `items` — ver `disponibles` acá adentro). */
  options: string[]
  onChange: (items: string[]) => void
  /** El `<Select>` se deshabilita mientras esto sea `true` —falta elegir
   *  lo que determina las `options` (acá, el Grado de la unidad)—, no
   *  tiene sentido dejarlo tocar antes de eso. */
  disabled?: boolean
  /** Mientras las `options` todavía se están trayendo (ver
   *  `useEnunciadosDbaQuery`), el trigger queda deshabilitado y muestra
   *  "Cargando…" en vez del placeholder normal. */
  isPending?: boolean
  placeholder?: string
}

/**
 * Misma "caja" que `ListaAgregableCaja` (título + descripción afuera, caja
 * con encabezado de columna + ítems ya agregados), pero el alta es por
 * `<Select>` en vez de texto libre + botón: los ítems posibles no son lo
 * que el docente tipee, sino un catálogo acotado (ej. los enunciados de DBA
 * que le corresponden al Grado de la unidad, ver `useEnunciadosDbaQuery`).
 * Elegir una opción la agrega de una —no hace falta un botón "Agregar"
 * aparte— y esa opción desaparece de la lista para no ofrecer duplicados.
 */
export function ListaAgregableCajaSelect({
  title,
  description,
  columnLabel,
  items,
  options,
  onChange,
  disabled = false,
  isPending = false,
  placeholder = "Seleccione",
}: ListaAgregableCajaSelectProps) {
  const disponibles = options.filter((option) => !items.includes(option))

  function quitar(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <FieldSet className="gap-2">
      <legend className="mb-0 text-base font-semibold">{title}</legend>
      {description && <FieldDescription>{description}</FieldDescription>}

      <div className="rounded-md border">
        <p
          className={cn(
            "text-muted-foreground px-3 py-2 text-xs font-semibold tracking-wide uppercase",
            items.length > 0 && "border-b",
          )}
        >
          {columnLabel}
        </p>
        {items.length > 0 && (
          <ul className="divide-y">
            {items.map((item, index) => (
              <li
                key={index}
                className="group/item flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="min-w-0 break-words">{item}</span>
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Quitar "${item}"`}
                  className="opacity-0 transition-opacity group-hover/item:opacity-100 group-focus-within/item:opacity-100"
                  onClick={() => quitar(index)}
                >
                  <TrashIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Select
        // Sin `value` propio: apenas se elige una opción se agrega a
        // `items` y la opción misma sale de `disponibles` (el `<Select>`
        // no "recuerda" la última elegida, cada apertura arranca en el
        // placeholder — es un alta, no una edición de un campo único).
        value=""
        onValueChange={(value) => value && onChange([...items, value])}
        disabled={disabled || isPending || disponibles.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder={isPending ? "Cargando…" : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {disponibles.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldSet>
  )
}
