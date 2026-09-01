import { useEffect, useState } from "react"
import * as React from "react"
import { useForm, useSelector } from "@tanstack/react-form"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircleIcon, TrashIcon } from "@/components/ui/icons"
import { FileUploadOutlinedIcon, ImageIcon } from "@/components/ui/icons"

import type { Actividad, Adaptacion, Criterio, Recurso } from "@/features/planeador/api/types/actividad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"

/**
 * `<Textarea>` no tiene variante `outlined` propia (a diferencia de `Input`,
 * que la hereda del contexto `Field`): siempre sale con la línea inferior.
 * Acá la aplicamos a mano para que matchee el resto del form cuando está
 * dentro de un `<Field variant="outlined">`. Las clases están copiadas de
 * `inputVariants({variant: "outlined"})` para que ambos controles se vean
 * idénticos.
 */
const TEXTAREA_OUTLINED =
  "rounded-md border border-input px-3 py-2 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red aria-invalid:focus-visible:border-red aria-invalid:focus-visible:ring-red/20"

interface EditarActividadFormProps {
  actividad: Actividad
  /** Llamado cada vez que el form pasa de limpio a sucio o viceversa. */
  onDirtyChange?: (isDirty: boolean) => void
  /** Id del `<form>` para que el footer pueda dispararlo desde fuera. */
  formId: string
}

/**
 * Edición visual de una actividad. Carga los datos como `defaultValues`,
 * deja los inputs editables y reporta el estado "dirty" hacia arriba para
 * que el `<TableScreenFooter>` decida si mostrar el aviso de cambios.
 *
 * El form no persiste todavía: la iteración actual es read-only en la red
 * (sin endpoint de update), así que `onSubmit` solo dispara un log local.
 * Quedan listos los campos, la estructura de las secciones y el sticky
 * footer para cuando llegue `useUpdateActividad`.
 */
export function EditarActividadForm({ actividad, onDirtyChange, formId }: EditarActividadFormProps) {
  const { data: unidades = [] } = useUnidadesQuery()

  const form = useForm({
    defaultValues: actividad,
    onSubmit: () => {
      // Stub: cuando exista `useUpdateActividad`, acá va la mutación.
    },
  })

  // `isDefaultValue` es lo que usa el form académico para detectar cambios:
  // es `false` apenas el usuario toca cualquier campo. Se re-emite hacia
  // arriba para que el `<TableScreenFooter>` muestre el aviso + el Guardar
  // solo cuando hace falta.
  const isDirty = useSelector(form.store, (state) => !state.isDefaultValue)
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  return (
    <form
      id={formId}
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <IdentificacionSection form={form} unidades={unidades} />
      <UnidadSection unidad={actividad.unidad} />
      <AsignaturaGradoSection form={form} />
      <MaterialesSection form={form} />
      <RecursosSection form={form} />
      <ProgramacionSection form={form} />
      <EvaluacionSection form={form} />
      <RubricasSection form={form} />
      <AdaptacionesSection form={form} />
      <SeguimientoSection form={form} />
    </form>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Secciones
//
// Cada sección recibe `form` con el tipo genérico del `useForm` de
// `@tanstack/react-form`. Como la firma de `useForm` es muy sobrecargada,
// declarar el tipo a mano como alias evita arrastrar todos los
// `TOn…/TSubmitMeta` por las props.
// ────────────────────────────────────────────────────────────────────────────

// `useForm` tiene una firma sobrecargada: queremos el alias con `Actividad`
// como `TFormData`, así los `field.state.value` salen tipados. Los `TOn…`
// genéricos no nos importan en este form, así que los dejamos en `any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormActividad = ReturnType<typeof useForm<Actividad, any, any, any, any, any, any, any, any, any, any, any>>

function IdentificacionSection({
  form,
  unidades,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
}) {
  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Identificación de la actividad</h3>
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <form.Field name="nombre">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Nombre de la actividad</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="tipo">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Tipo de actividad</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value as Actividad["tipo"])}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Proyecto">Proyecto</SelectItem>
                  <SelectItem value="Taller">Taller</SelectItem>
                  <SelectItem value="Evaluación">Evaluación</SelectItem>
                  <SelectItem value="Actividad">Actividad</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field name="unidad">
          {(field) => (
            // `gap-0` + redondeado y borde derechos del `SelectTrigger`
            // anulados (vía descendiente del `Field`) + redondeado y borde
            // izquierdos del botón del popover anulados → los dos controles
            // se leen como un único split-button.
            <div className="flex items-end gap-0">
              <Field
                variant="outlined"
                className="min-w-0 flex-1 [&_[data-slot=select-trigger]]:rounded-r-none [&_[data-slot=select-trigger]]:border-r-0"
              >
                <FieldLabel htmlFor={field.name}>Unidad temática asociada</FieldLabel>
                <Select
                  value={field.state.value.id}
                  onValueChange={(value) => {
                    const next = unidades.find((u) => u.id === value)
                    if (next) field.handleChange({ id: next.id, nombre: next.nombre })
                  }}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Seleccione</SelectItem>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <CrearUnidadPopover
                className="rounded-l-none border-l-0"
                onCreate={(nombre) => {
                  // Stub: en esta iteración no persiste la unidad nueva —
                  // sólo se asigna al campo con un id temporal para que la
                  // pantalla refleje lo que el usuario tipeó.
                  field.handleChange({
                    id: `nueva-${Date.now()}`,
                    nombre,
                  })
                }}
              />
            </div>
          )}
        </form.Field>
      </div>
    </Card>
  )
}

function UnidadSection({ unidad }: { unidad: { nombre: string } }) {
  return (
    <fieldset className="rounded-md border bg-card px-4 pb-4">
      <legend className="px-1.5 text-sm font-semibold">{unidad.nombre}</legend>
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-sm font-semibold">Contenidos:</p>
          <BulletList items={[]} />
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Objetivos:</p>
          <BulletList items={[]} />
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Descripción:</p>
          <BulletList items={[]} />
        </div>
      </div>
    </fieldset>
  )
}

function AsignaturaGradoSection({ form }: { form: FormActividad }) {
  return (
    <Card className="gap-4 p-4">
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <form.Field name="asignatura">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Asignatura / materia</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="grupo">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Grado / Grupo</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={`${form.getFieldValue("grado")}${field.state.value}`}
                onChange={(e) => {
                  const v = e.target.value
                  form.setFieldValue("grado", v.slice(0, -1))
                  field.handleChange(v.slice(-1))
                }}
              />
            </Field>
          )}
        </form.Field>
      </div>
    </Card>
  )
}

function MaterialesSection({ form }: { form: FormActividad }) {
  return (
    <Card className="gap-4 p-4">
      <form.Field name="materiales">
        {(field) => (
          <Field variant="outlined">
            <FieldLabel htmlFor={field.name}>Materiales requeridos (lista breve)</FieldLabel>
            <Textarea className={TEXTAREA_OUTLINED}
              id={field.name}
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={4}
            />
          </Field>
        )}
      </form.Field>
    </Card>
  )
}

function RecursosSection({ form }: { form: FormActividad }) {
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Materiales de apoyo (agrega varios recursos)</h3>
        <Button
          variant="fill"
          color="primary"
          size="icon-sm"
          type="button"
          aria-label="Agregar recurso"
          onClick={() => {
            const list = form.getFieldValue("recursos") as Recurso[]
            form.setFieldValue("recursos", [
              ...list,
              { id: cryptoId(), titulo: "", fuente: "", tipo: "URL", url: "", descripcion: "" },
            ])
          }}
        >
          <PlusCircleIcon />
        </Button>
      </div>

      <form.Field name="recursos">
        {(field) => {
          const recursos = field.state.value as Recurso[]
          if (recursos.length === 0) {
            return (
              <p className="text-muted-foreground text-sm">Esta actividad no tiene recursos de apoyo.</p>
            )
          }
          return (
            <ul className="flex flex-col gap-4">
              {recursos.map((recurso, index) => (
                <RecursoItem
                  key={recurso.id}
                  recurso={recurso}
                  index={index}
                  onChange={(next) => {
                    const list = (field.state.value as Recurso[]).slice()
                    list[index] = next
                    field.handleChange(list)
                  }}
                  onRemove={() => {
                    const list = (field.state.value as Recurso[]).slice()
                    list.splice(index, 1)
                    field.handleChange(list)
                  }}
                />
              ))}
            </ul>
          )
        }}
      </form.Field>
    </Card>
  )
}

function RecursoItem({
  recurso,
  index,
  onChange,
  onRemove,
}: {
  recurso: Recurso
  index: number
  onChange: (next: Recurso) => void
  onRemove: () => void
}) {
  // El campo "fuente" cambia de icono (y levemente de input) según el
  // tipo de recurso: para URL es solo un input de enlace; para Unidad
  // virtual muestra el ícono de imagen; para Archivo muestra el ícono de
  // upload (lo que abre el file picker del SO).
  const FuenteIcon =
    recurso.tipo === "Unidad virtual"
      ? ImageIcon
      : recurso.tipo === "Archivo"
        ? FileUploadOutlinedIcon
        : null

  return (
    <li className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Recurso {index + 1} - Fuente</h4>
        <Button
          variant="ghost"
          color="neutral"
          size="icon-sm"
          type="button"
          aria-label={`Quitar recurso ${index + 1}`}
          onClick={onRemove}
        >
          <TrashIcon />
        </Button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Field variant="outlined">
          <FieldLabel>Tipo</FieldLabel>
          <Select
            value={recurso.tipo as never}
            onValueChange={(v) => {
              const nextTipo = (v ?? "") as Recurso["tipo"]
              onChange({
                ...recurso,
                tipo: nextTipo,
                // Al pasar a "Archivo", la URL anterior pierde sentido
                // (y el browser rechaza programáticamente cualquier
                // string en un `<input type="file">` que no sea "" —
                // "Failed to set the 'value' property on 'HTMLInputElement'").
                // En los demás cambios (URL ↔ Unidad virtual) se preserva
                // para no borrar lo que el usuario ya tipeó.
                url: nextTipo === "Archivo" ? "" : recurso.url,
              })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Seleccione</SelectItem>
              <SelectItem value="URL">URL / Sitio web</SelectItem>
              <SelectItem value="Unidad virtual">Unidad virtual / repositorio</SelectItem>
              <SelectItem value="Archivo">Archivo en PC</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field variant="outlined">
          <FieldLabel>Fuente</FieldLabel>
          <div className="relative">
            {FuenteIcon && (
              <FuenteIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            )}
            <Input
              type={recurso.tipo === "Archivo" ? "file" : "url"}
              value={recurso.url}
              onChange={(e) => onChange({ ...recurso, url: e.target.value })}
              className={FuenteIcon ? "pl-9" : undefined}
            />
          </div>
        </Field>
      </div>

      <Field variant="outlined" className="mt-3">
        <FieldLabel>Descripción / nota</FieldLabel>
        <Textarea className={TEXTAREA_OUTLINED}
          rows={2}
          value={recurso.descripcion}
          onChange={(e) => onChange({ ...recurso, descripcion: e.target.value })}
        />
      </Field>
    </li>
  )
}

function ProgramacionSection({ form }: { form: FormActividad }) {
  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Programación</h3>
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <form.Field name="fechaInicio">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Fecha inicio</FieldLabel>
              <Input
                id={field.name}
                type="date"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="fechaCierre">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Fecha de entrega o cierre</FieldLabel>
              <Input
                id={field.name}
                type="date"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="duracionEstimada">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Duración estimada (horas o sesiones)</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="semana">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Semana del cronograma</FieldLabel>
              <Input
                id={field.name}
                type="number"
                min={1}
                max={40}
                value={field.state.value}
                onChange={(e) => field.handleChange(Number(e.target.value))}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="modalidad">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Modalidad</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value as Actividad["modalidad"])}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccione</SelectItem>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Virtual">Virtual</SelectItem>
                  <SelectItem value="Mixta">Mixta</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>
      </div>
    </Card>
  )
}

function EvaluacionSection({ form }: { form: FormActividad }) {
  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Evaluación</h3>
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <form.Field name="esEvaluativa">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>¿Es actividad evaluativa?</FieldLabel>
              <Select
                value={field.state.value ? "si" : "no"}
                onValueChange={(value) => field.handleChange(value === "si")}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field name="instrumento">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Instrumento de evaluación</FieldLabel>
              <Select value={field.state.value} onValueChange={(v) => v && field.handleChange(v)} >
                <SelectTrigger id={field.name}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rúbrica">Rúbrica</SelectItem>
                  <SelectItem value="Lista de cotejo">Lista de cotejo</SelectItem>
                  <SelectItem value="Escala de valoración">Escala de valoración</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>
      </div>
    </Card>
  )
}

function RubricasSection({ form }: { form: FormActividad }) {
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Definición de Rúbricas</h3>
        <Button
          variant="fill"
          color="primary"
          size="icon-sm"
          type="button"
          aria-label="Agregar criterio"
          onClick={() => {
            const rubrica = form.getFieldValue("rubrica") as { id: string; criterios: Criterio[] }
            form.setFieldValue("rubrica", {
              ...rubrica,
              criterios: [
                ...rubrica.criterios,
                { id: cryptoId(), nombre: "", excelente: "", niveles: [], ponderacion: 0 },
              ],
            })
          }}
        >
          <PlusCircleIcon />
        </Button>
      </div>

      <form.Field name="rubrica">
        {(field) => {
          const rubrica = field.state.value as { id: string; criterios: Criterio[] }
          if (rubrica.criterios.length === 0) {
            return (
              <p className="text-muted-foreground text-sm">Esta rúbrica todavía no tiene criterios.</p>
            )
          }
          return (
            <ul className="flex flex-col gap-6">
              {rubrica.criterios.map((criterio, index) => (
                <CriterioItem
                  key={criterio.id}
                  criterio={criterio}
                  index={index}
                  onChange={(next) => {
                    const current = field.state.value as { id: string; criterios: Criterio[] }
                    const next_criterios = current.criterios.slice()
                    next_criterios[index] = next
                    field.handleChange({ ...current, criterios: next_criterios })
                  }}
                  onRemove={() => {
                    const current = field.state.value as { id: string; criterios: Criterio[] }
                    const next_criterios = current.criterios.slice()
                    next_criterios.splice(index, 1)
                    field.handleChange({ ...current, criterios: next_criterios })
                  }}
                />
              ))}
            </ul>
          )
        }}
      </form.Field>
    </Card>
  )
}

function CriterioItem({
  criterio,
  index,
  onChange,
  onRemove,
}: {
  criterio: Criterio
  index: number
  onChange: (next: Criterio) => void
  onRemove: () => void
}) {
  // Buffer local para el input "Agregar" de niveles: el valor que escribe
  // el usuario no es parte del criterio hasta que confirma con el botón
  // "Agregar nivel". Tenerlo en estado local evita que cada tecleo toque
  // el `onChange` del criterio padre y dispare `dirty` antes de confirmar.
  const [nivelInput, setNivelInput] = useState("")

  return (
    <li className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Criterio {index + 1}</h4>
        <Button
          variant="ghost"
          color="neutral"
          size="icon-sm"
          type="button"
          aria-label={`Quitar criterio ${index + 1}`}
          onClick={onRemove}
        >
          <TrashIcon />
        </Button>
      </div>

      {/* Cada control usa `Field variant="outlined"` con `FieldLabel`
          adentro: el label queda flotando sobre el borde (estilo MUI
          TextField). `text-sm font-semibold` del `Criterio N` y de
          `Excelente` son títulos estáticos, no labels de campo. */}
      <Field variant="outlined" className="mt-3">
        <FieldLabel>Nombre del criterio</FieldLabel>
        <Input
          value={criterio.nombre}
          onChange={(e) => onChange({ ...criterio, nombre: e.target.value })}
        />
      </Field>

      {/* `Excelente` va como label estático a la izquierda del textarea:
          la captura lo muestra pegado al borde izquierdo, no flotando
          dentro del outline del textarea. La columna del label va con
          `min-w-28` para que todas las filas del criterio (Excelente +
          niveles) compartan el mismo ancho de label y los textareas
          queden alineados a la derecha. */}
      <div className="mt-4 grid items-start gap-3 sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_auto]">
        <p className="pt-2 text-sm font-semibold">Excelente</p>
        <Textarea
          className={TEXTAREA_OUTLINED}
          rows={2}
          value={criterio.excelente}
          onChange={(e) => onChange({ ...criterio, excelente: e.target.value })}
        />
        {/* Tachito a la derecha del textarea (mismo patrón que la captura). */}
        <Button
          variant="ghost"
          color="neutral"
          size="icon-sm"
          type="button"
          aria-label="Quitar excelente"
          onClick={() => onChange({ ...criterio, excelente: "" })}
        >
          <TrashIcon />
        </Button>
      </div>

      {/* Lista de niveles ya creados. Cada nivel sigue el mismo patrón que
          el bloque "Excelente" de arriba: el `nombre` (la etiqueta que el
          usuario tipeó al confirmar con "Agregar nivel") va como label
          estático a la izquierda —estilo "Bueno", "Aceptable"—, y la
          `descripcion` se edita en un `Textarea` al medio. El tachito va
          a la derecha, igual que en el bloque de "Excelente". El primer
          track del grid usa el mismo `minmax(7rem,auto)` que el bloque de
          "Excelente" para que ambas columnas de label queden alineadas. */}
      <ul className="mt-4 flex flex-col gap-3">
        {criterio.niveles.map((nivel, nIndex) => (
          <li
            key={nivel.id}
            className="grid items-start gap-3 sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_auto]"
          >
            <p className="pt-2 text-sm font-semibold">{nivel.nombre}</p>
            <Textarea
              className={TEXTAREA_OUTLINED}
              rows={2}
              value={nivel.descripcion}
              onChange={(e) => {
                const next = criterio.niveles.slice()
                next[nIndex] = { ...nivel, descripcion: e.target.value }
                onChange({ ...criterio, niveles: next })
              }}
            />
            <Button
              variant="ghost"
              color="neutral"
              size="icon-sm"
              type="button"
              aria-label={`Quitar nivel ${nivel.nombre}`}
              onClick={() => {
                const next = criterio.niveles.slice()
                next.splice(nIndex, 1)
                onChange({ ...criterio, niveles: next })
              }}
            >
              <TrashIcon />
            </Button>
          </li>
        ))}
      </ul>

      {/* Split-button con Input + botón al borde derecho (la captura los
          muestra dentro del mismo rectángulo con borde). `gap-0` + borde/redondeado
          derechos del `Input` anulados (vía descendiente del `Field`) +
          borde/redondeado izquierdos del `Button` anulados → se leen como
          un único control. `size="default"` (h-11) en el `Button` para que
          calce con la altura del `Input`.

          `mt-6` y no el `mt-2` del variant: el `FieldLabel` outlined se
          posiciona en `top-0 -translate-y-[calc(100%-0.625rem)]`, o sea
          que "asoma" por encima del borde superior del `Field`. Con `mt-2`
          ese asomo se come el `mb` de la lista de niveles de arriba y el
          label termina pisando la última fila (visible en la captura).
          24px es lo mínimo para que el label quede libre. */}
      <Field
        variant="outlined"
        className="mt-6 [&_[data-slot=input]]:rounded-r-none [&_[data-slot=input]]:border-r-0"
      >
        <FieldLabel>Niveles de desempeño (agregar niveles)</FieldLabel>
        <div className="flex items-center gap-0">
          <Input
            placeholder="Agregar"
            value={nivelInput}
            onChange={(e) => setNivelInput(e.target.value)}
          />
          <Button
            variant="fill"
            color="primary"
            size="default"
            className="rounded-l-none border-l-0"
            type="button"
            onClick={() => {
              const value = nivelInput.trim()
              if (!value) return
              // El texto tipeado pasa a ser el `nombre` (label que aparece a
              // la izquierda, igual que "Excelente"). La `descripcion` arranca
              // vacía para que el usuario la complete en el textarea que se
              // renderiza al confirmar.
              onChange({
                ...criterio,
                niveles: [
                  ...criterio.niveles,
                  { id: cryptoId(), nombre: value, descripcion: "" },
                ],
              })
              setNivelInput("")
            }}
          >
            <PlusCircleIcon data-icon="inline-start" />
            Agregar nivel
          </Button>
        </div>
      </Field>

      <Field variant="outlined" className="mt-4 max-w-48">
        <FieldLabel>Ponderación (%)</FieldLabel>
        <Input
          type="number"
          min={0}
          max={100}
          value={criterio.ponderacion}
          onChange={(e) => onChange({ ...criterio, ponderacion: Number(e.target.value) })}
        />
      </Field>
    </li>
  )
}

function AdaptacionesSection({ form }: { form: FormActividad }) {
  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Adaptaciones curriculares</h3>

      <form.Field name="adaptaciones">
        {(field) => {
          const adaptaciones = field.state.value as Adaptacion[]
          const add = () =>
            field.handleChange([
              ...adaptaciones,
              {
                tipo: "",
                descripcion: "",
                versionModificada: "no",
                versionModificadaRef: "",
                aplicaA: "",
              },
            ])
          if (adaptaciones.length === 0) {
            return (
              <div className="flex items-center justify-between rounded-md border bg-card p-3">
                <p className="text-sm font-semibold">Si aplica, registre las adaptaciones</p>
                <Button
                  variant="fill"
                  color="primary"
                  size="icon-sm"
                  type="button"
                  aria-label="Agregar adaptación"
                  onClick={add}
                >
                  <PlusCircleIcon />
                </Button>
              </div>
            )
          }
          return (
            <ul className="flex flex-col gap-3">
              {adaptaciones.map((adapt, aIndex) => (
                <AdaptacionItem
                  key={aIndex}
                  index={aIndex}
                  adaptacion={adapt}
                  onChange={(next) => {
                    const list = adaptaciones.slice()
                    list[aIndex] = next
                    field.handleChange(list)
                  }}
                  onRemove={() => {
                    const list = adaptaciones.slice()
                    list.splice(aIndex, 1)
                    field.handleChange(list)
                  }}
                />
              ))}
              <li>
                <Button
                  variant="outline"
                  color="primary"
                  size="sm"
                  type="button"
                  onClick={add}
                >
                  <PlusCircleIcon data-icon="inline-start" />
                  Agregar otra adaptación
                </Button>
              </li>
            </ul>
          )
        }}
      </form.Field>
    </Card>
  )
}

/**
 * Bloque de una adaptación curricular. Mismo patrón que `CriterioItem`:
 * título con índice y tachito, luego los cuatro campos del mockup.
 *
 * El campo `descripcion` lleva `maxLength={500}` para hacer cumplir el
 * tope del placeholder. Los selects usan `Field variant="outlined"` con
 * `FieldLabel` adentro —mismo patrón que el resto del form— y arrancan
 * con `Seleccione` como placeholder hasta que se elija un valor real.
 */
function AdaptacionItem({
  index,
  adaptacion,
  onChange,
  onRemove,
}: {
  index: number
  adaptacion: Adaptacion
  onChange: (next: Adaptacion) => void
  onRemove: () => void
}) {
  return (
    <li className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Adaptación {index + 1}</h4>
        <Button
          variant="ghost"
          color="neutral"
          size="icon-sm"
          type="button"
          aria-label={`Quitar adaptación ${index + 1}`}
          onClick={onRemove}
        >
          <TrashIcon />
        </Button>
      </div>

      <Field variant="outlined" className="mt-3">
        <FieldLabel>¿Qué tipo de adaptación requiere esta actividad?</FieldLabel>
        <Select
          value={adaptacion.tipo as never}
          onValueChange={(value) =>
            onChange({ ...adaptacion, tipo: (value ?? "") as Adaptacion["tipo"] })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Seleccione</SelectItem>
            <SelectItem value="Discapacidad visual">Discapacidad visual</SelectItem>
            <SelectItem value="Discapacidad auditiva">Discapacidad auditiva</SelectItem>
            <SelectItem value="Dificultades cognitivas">Dificultades cognitivas</SelectItem>
            <SelectItem value="Estilo de aprendizaje">
              Estilo de aprendizaje (visual, kinestésico, auditivo)
            </SelectItem>
            <SelectItem value="Modalidad">
              Modalidad (virtual, asincrónica, presencial)
            </SelectItem>
            <SelectItem value="Nivel de desempeño">
              Nivel de desempeño (refuerzo, ampliación)
            </SelectItem>
            <SelectItem value="Otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field variant="outlined" className="mt-4">
        <FieldLabel>
          Describa cómo se adapta la actividad para este caso (máx. 500 caracteres)
        </FieldLabel>
        <Textarea
          rows={3}
          maxLength={500}
          placeholder="Describa la adaptación…"
          value={adaptacion.descripcion}
          onChange={(e) => onChange({ ...adaptacion, descripcion: e.target.value })}
          className={TEXTAREA_OUTLINED}
        />
      </Field>

      <Field variant="outlined" className="mt-4">
        <FieldLabel>
          ¿Se usará una versión modificada del instrumento de evaluación?
        </FieldLabel>
        <Select
          value={adaptacion.versionModificada as never}
          onValueChange={(value) =>
            onChange({
              ...adaptacion,
              versionModificada: (value ?? "") as Adaptacion["versionModificada"],
              // Al cambiar de modo se limpia el auxiliar para no arrastrar
              // una URL de un archivo anterior o viceversa.
              versionModificadaRef: "",
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Seleccione</SelectItem>
            <SelectItem value="no">No</SelectItem>
            <SelectItem value="archivo">Sí, Adjuntar plantilla (archivo)</SelectItem>
            <SelectItem value="enlace">Sí, Adjuntar plantilla (enlace)</SelectItem>
            <SelectItem value="biblioteca">Sí, Adjuntar plantilla (biblioteca)</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* Campos condicionales según el modo de `versionModificada`. El `No`
          no muestra nada; los tres modos "Sí…" muestran cada uno su propio
          control (file picker, input URL o select de plantillas). */}
      {adaptacion.versionModificada === "archivo" && (
        <Field variant="outlined" className="mt-4">
          <FieldLabel>Archivo de plantilla</FieldLabel>
          <div className="relative">
            <FileUploadOutlinedIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              type="file"
              value={adaptacion.versionModificadaRef}
              onChange={(e) =>
                onChange({ ...adaptacion, versionModificadaRef: e.target.value })
              }
              className="pl-9"
            />
          </div>
        </Field>
      )}

      {adaptacion.versionModificada === "enlace" && (
        <Field variant="outlined" className="mt-4">
          <FieldLabel>Enlace de la plantilla</FieldLabel>
          <Input
            type="url"
            placeholder="https://…"
            value={adaptacion.versionModificadaRef}
            onChange={(e) =>
              onChange({ ...adaptacion, versionModificadaRef: e.target.value })
            }
          />
        </Field>
      )}

      {adaptacion.versionModificada === "biblioteca" && (
        <Field variant="outlined" className="mt-4">
          <FieldLabel>Seleccionar desde biblioteca institucional</FieldLabel>
          <Select
            value={adaptacion.versionModificadaRef as never}
            onValueChange={(value) =>
              onChange({ ...adaptacion, versionModificadaRef: (value ?? "") as string })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Seleccione</SelectItem>
              <SelectItem value="plantilla-a">Biblioteca - Plantilla A</SelectItem>
              <SelectItem value="plantilla-b">Biblioteca - Plantilla B</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field variant="outlined" className="mt-4">
        <FieldLabel>¿A quién se aplica esta adaptación?</FieldLabel>
        <Select
          value={adaptacion.aplicaA as never}
          onValueChange={(value) =>
            onChange({ ...adaptacion, aplicaA: (value ?? "") as Adaptacion["aplicaA"] })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Seleccione</SelectItem>
            <SelectItem value="A todo el grupo">A todo el grupo</SelectItem>
            <SelectItem value="Estudiantes específicos">Estudiantes específicos</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </li>
  )
}

function SeguimientoSection({ form }: { form: FormActividad }) {
  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Seguimiento</h3>

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <form.Field name="generaEvidencias">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>¿Genera evidencias?</FieldLabel>
              <Select
                value={field.state.value ? "si" : "no"}
                onValueChange={(value) => field.handleChange(value === "si")}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field name="tipoEvidencia">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Tipo de evidencia</FieldLabel>
              <Select value={field.state.value} onValueChange={(v) => v && field.handleChange(v)} >
                <SelectTrigger id={field.name}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Archivo">Archivo</SelectItem>
                  <SelectItem value="Link">Link</SelectItem>
                  <SelectItem value="Texto">Texto</SelectItem>
                  <SelectItem value="Imagen">Imagen</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field name="requiereValidacion">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>¿Requiere validación del coordinador?</FieldLabel>
              <Select
                value={field.state.value ? "si" : "no"}
                onValueChange={(value) => field.handleChange(value === "si")}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>
      </div>

      <form.Field name="observaciones">
        {(field) => (
          <Field variant="outlined">
            <FieldLabel htmlFor={field.name}>Observaciones del docente</FieldLabel>
            <Textarea className={TEXTAREA_OUTLINED}
              id={field.name}
              rows={4}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      </form.Field>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">—</p>
  }
  return (
    <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

/** Id aleatorio estable para items nuevos (recursos/criterios/niveles). */
function cryptoId() {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Botón "+" pegado al `Select` de unidad temática. Abre un Popover con el
 * mini-form para crear una unidad en el momento — mismo flujo que la
 * captura del mockup. El Popover (no Dialog) mantiene la referencia visual
 * con el botón que lo abrió.
 */
function CrearUnidadPopover({
  onCreate,
  className,
}: {
  onCreate: (nombre: string) => void
  /** Se aplica al `Button` del trigger para encadenarlo visualmente con
   * un control adyacente (split-button): típico `rounded-l-none border-l-0`
   * para pegarse a un `Select`/`Input` por la izquierda. */
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [nombre, setNombre] = React.useState("")
  const [contenidos, setContenidos] = React.useState("")
  const [objetivos, setObjetivos] = React.useState("")
  const [descripcion, setDescripcion] = React.useState("")

  const reset = () => {
    setNombre("")
    setContenidos("")
    setObjetivos("")
    setDescripcion("")
  }

  const guardar = () => {
    if (!nombre.trim()) return
    onCreate(nombre.trim())
    reset()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={(next) => {
      setOpen(next)
      if (!next) reset()
    }}>
      <PopoverTrigger
        render={
          <Button
            variant="fill"
            color="primary"
            size="icon-sm"
            aria-label="Crear nueva unidad temática"
            // `size-11` para igualar la altura del `SelectTrigger` (h-11);
            // `shrink-0` para que el flex del call site no lo aplaste.
            // Si el call site pasa `className` (típico `rounded-l-none
            // border-l-0` para split-button), gana sobre el `rounded-md`
            // base porque va al final.
            className={cn("size-11 shrink-0 rounded-md", className)}
          />
        }
      >
        <PlusCircleIcon />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-80"
      >
        <h3 className="text-base font-semibold">Crear nueva unidad temática</h3>

        <Field variant="outlined">
          <FieldLabel>Nombre de la unidad</FieldLabel>
          <Input
            placeholder="Agregar"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </Field>

        <Field variant="outlined">
          <FieldLabel>Contenidos temáticos vinculados</FieldLabel>
          <Input
            placeholder="Agregar"
            value={contenidos}
            onChange={(e) => setContenidos(e.target.value)}
          />
        </Field>

        <Field variant="outlined">
          <FieldLabel>Objetivos específicos relacionados</FieldLabel>
          <Input
            placeholder="Agregar"
            value={objetivos}
            onChange={(e) => setObjetivos(e.target.value)}
          />
        </Field>

        <Field variant="outlined">
          <FieldLabel>Descripción breve</FieldLabel>
          <Textarea
            rows={3}
            placeholder="Propósito pedagógico y dinámica general"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={TEXTAREA_OUTLINED}
          />
        </Field>

        <div className="flex justify-end">
          <Button
            variant="fill"
            color="primary"
            size="sm"
            onClick={guardar}
            disabled={!nombre.trim()}
          >
            Guardar unidad
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
