import { useEffect, useState } from "react"
import * as React from "react"
import { useForm, useSelector } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/date-picker"
import { Field, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { parseDateValue, formatDateValue } from "@/lib/date-value"
import { toDigitsOnly, toDigitsOrRangeInput } from "@/lib/text-input"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUnidadDetalleQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useConfiguracionActividadQuery } from "@/features/planeador/api/query/use-configuracion-actividad-query"
import { useReferenteCurricularQuery } from "@/features/planeador/api/query/use-referente-curricular-query"
import { useDocenteGruposQuery } from "@/features/planeador/api/query/use-docente-grupos-query"
import { useDocenteGradoAsignaturaQuery } from "@/features/planeador/api/query/use-docente-grado-asignatura-query"
import { useTipoActividadCatalogQuery } from "@/features/planeador/api/query/use-tipo-actividad-catalog"
import { useInstrumentoEvaluacionCatalogQuery } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import {
  ListaAgregableField,
  ListaAgregableCajaSelect,
} from "@/features/planeador/components/forms/field-lista-agregable"
import { useEnunciadosDbaQuery } from "@/features/planeador/api/query/use-enunciados-dba"
import {
  CriteriosUnidadChecklist,
  EnunciadosEvidenciasChecklist,
  UnidadFicha,
} from "@/features/planeador/components/unidad-evidencias-section"
import {
  METODO_CALCULO_INFO,
  METODO_CALCULO_OPTIONS,
} from "@/features/planeador/components/forms/form-unidad-info-general"
import {
  EyeIcon,
  FileDownloadOutlinedIcon,
  FileTextIcon,
  FileUploadOutlinedIcon,
  FolderOpenIcon,
  ImageIcon,
  InfoIcon,
  InsertLinkOutlinedIcon,
  PermMediaOutlinedIcon,
  PlusCircleIcon,
  PlusIcon,
  RemoveCircleOutlineIcon,
  SpinnerIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { paths } from "@/config/paths"

import type {
  Actividad,
  Adaptacion,
  Criterio,
  EscalaValoracion,
  EscalaValoracionTipo,
  InstrumentoPersonalizado,
  ListaCotejo,
  ListaCotejoItem,
  Nivel,
  Recurso,
} from "@/features/planeador/api/types/actividad"
import type { MetodoCalculo, UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import type { Estudiante } from "@/features/planeador/api/types/calificacion"
import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useCalificacionesQuery } from "@/features/planeador/api/query/use-calificaciones-query"
import { useCreateUnidad } from "@/features/planeador/api/mutations/create-unidad"

import { DialogBibliotecaRecursos } from "@/features/planeador/components/dialogs/dialog-biblioteca-recursos"

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

// Labels de los `<Select>` cuyo `value` no coincide con el texto que muestra
// la opción (ids, abreviaturas). El `<SelectValue>` de cada uno resuelve acá
// en vez de mostrar el `value` crudo —mismo patrón que el resto de la app
// (ver `dialog-save-menu.tsx`, `form-academic-period.tsx`).

/**
 * Presentación visual de cada `RecursoTipo`. Centraliza icono, label y color
 * (el mismo para el cuadrado de la cabecera y el badge de la derecha, así
 * siempre combinan) para que el `RecursoItem` y cualquier otro consumidor
 * (filtros, exports, …) saquen todo de un mismo mapper y no terminen con
 * versiones distintas.
 */
type RecursoPresentacion = {
  /** Label legible del tipo. */
  label: string
  /** Ícono que se muestra en el cuadrado de la cabecera y en el badge. */
  Icon: React.ComponentType<{ className?: string }>
  /** `bg-*` compartido por el cuadrado de la cabecera y el badge. */
  bg: string
  /** `text-*` compartido por el ícono del header y el texto + ícono del badge. */
  text: string
}

const RECURSO_PRESENTACION: Record<Recurso["tipo"], RecursoPresentacion> = {
  URL: {
    label: "URL / Sitio web",
    Icon: InsertLinkOutlinedIcon,
    bg: "bg-green-22",
    text: "text-green",
  },
  "Unidad virtual": {
    label: "Unidad virtual / repositorio",
    Icon: PermMediaOutlinedIcon,
    bg: "bg-purple-22",
    text: "text-purple",
  },
  Archivo: {
    label: "Archivo en PC",
    Icon: FileTextIcon,
    bg: "bg-orange-22",
    text: "text-orange",
  },
}

const ADAPTACION_TIPO_LABELS: Record<string, string> = {
  "Estilo de aprendizaje": "Estilo de aprendizaje (visual, kinestésico, auditivo)",
  Modalidad: "Modalidad (virtual, asincrónica, presencial)",
  "Nivel de desempeño": "Nivel de desempeño (refuerzo, ampliación)",
}

const VERSION_MODIFICADA_LABELS: Record<string, string> = {
  no: "No",
  archivo: "Sí, Adjuntar plantilla (archivo)",
  enlace: "Sí, Adjuntar plantilla (enlace)",
  biblioteca: "Sí, Adjuntar plantilla (biblioteca)",
}

const PLANTILLA_BIBLIOTECA_LABELS: Record<string, string> = {
  "plantilla-a": "Biblioteca - Plantilla A",
  "plantilla-b": "Biblioteca - Plantilla B",
}

const TIPO_EVIDENCIA_ESPERADA_LABELS: Record<string, string> = {
  Archivo: "Archivo (PDF, Word, imagen, otro)",
  Enlace: "Enlace (video, blog, presentación)",
  "Observación directa": "Observación directa",
  "Registro en campo": "Registro en campo",
}

interface EditarActividadFormProps {
  actividad: Actividad
  /** Llamado cada vez que el form pasa de limpio a sucio o viceversa. */
  onDirtyChange?: (isDirty: boolean) => void
  /** Id del `<form>` para que el footer pueda dispararlo desde fuera. */
  formId: string
  /**
   * Llamado con los valores completos al confirmar el submit (botón
   * "Guardar" del footer, vía `form={formId}`). Opcional: la edición
   * todavía no tiene `useUpdateActividad` (el submit no hace nada si no se
   * pasa), pero el alta sí lo usa para mandar la actividad a
   * `useCreateActividad` — mismo form, un solo lugar donde vive el submit
   * real en vez de bifurcar el componente entero por "crear" vs "editar".
   */
  onSubmit?: (values: Actividad) => void
  /**
   * `true` en el alta (`crearActividadVacia`), donde `actividad.id` es un
   * id de BORRADOR (`draftId()`, un número aleatorio) que nunca existió en
   * el backend — no un `PK_TACTIVIDAD` real todavía. Sin esta bandera, el
   * form disparaba igual `GET /actividades/:id/calificaciones` con ese id
   * inventado (confirmado en vivo: 403, porque esa actividad no existe),
   * para una lista de estudiantes que en el alta ni siquiera tiene sentido
   * pedir todavía. Default `false`: la edición confía en que `actividad`
   * viene de `useActividadDetalleQuery`, con un id real.
   */
  esNueva?: boolean
}

/**
 * Form de una actividad — se reusa tal cual para editar (`actividad` ya
 * existente) y para crear (`actividad` en blanco, ver `crearActividadVacia`
 * en `lib/empty-actividad.ts`). Carga los datos como `defaultValues`, deja
 * los inputs editables y reporta el estado "dirty" hacia arriba para que el
 * `<TableScreenFooter>` decida si mostrar el aviso de cambios.
 */
export function EditarActividadForm({
  actividad,
  onDirtyChange,
  formId,
  onSubmit,
  esNueva = false,
}: EditarActividadFormProps) {
  const { data: unidadesResult } = useUnidadesQuery()
  const unidadesQuery = unidadesResult?.rows ?? []
  // Estudiantes del grupo de la actividad — mismo query que alimenta la
  // vista de calificaciones. Se usa acá para el checklist "Seleccionar
  // estudiantes (múltiple)" cuando una adaptación aplica a "Estudiantes
  // específicos" (ver `AdaptacionItem`). `undefined` en el alta: ver la
  // nota de `esNueva` en `EditarActividadFormProps`.
  const { data: estudiantes = [] } = useCalificacionesQuery(esNueva ? undefined : actividad.id)

  // Unidades creadas al vuelo desde `CrearUnidadPopover`. `useCreateUnidad`
  // ya las persiste de verdad (`POST /planeador/unidades`), pero invalidar
  // el query e esperar el refetch dejaría al `<Select>` sin la unidad nueva
  // por un instante — se guarda también acá, con el id REAL que devolvió el
  // backend, para que aparezca en la lista de opciones de inmediato.
  const [unidadesCreadas, setUnidadesCreadas] = useState<UnidadTematica[]>([])
  // Dedupe por `id`: si `unidadesQuery` ya refrescó y trae una unidad que
  // también sigue en `unidadesCreadas` (creada un momento antes en esta
  // misma sesión de formulario), se descarta la copia local -- sin esto
  // la misma unidad aparecía dos veces en el `<Select>` apenas el query
  // real se ponía al día.
  const unidadesCreadasPendientes = unidadesCreadas.filter(
    (creada) => !unidadesQuery.some((real) => real.id === creada.id),
  )
  const unidades = [...unidadesQuery, ...unidadesCreadasPendientes]
  const createUnidadMutation = useCreateUnidad()

  const form = useForm({
    defaultValues: actividad,
    onSubmit: ({ value }) => onSubmit?.(value),
  })

  // `isDefaultValue` es lo que usa el form académico para detectar cambios:
  // es `false` apenas el usuario toca cualquier campo. Se re-emite hacia
  // arriba para que el `<TableScreenFooter>` muestre el aviso + el Guardar
  // solo cuando hace falta.
  const isDirty = useSelector(form.store, (state) => !state.isDefaultValue)
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // Crea la unidad de verdad (`POST /planeador/unidades`, `useCreateUnidad`)
  // con lo que capturó el popover, la agrega a `unidadesCreadas` con el id
  // REAL que devolvió el backend y la devuelve para que quien la pidió (el
  // `<Select>` de "Unidad temática asociada") la asigne de una. El resto de
  // la ficha (fechas derivadas, criterios, actividades) se completa después,
  // editando la unidad ya creada — acá solo va "Información general".
  async function crearUnidad(data: {
    nombre: string
    contenidos: string[]
    objetivos: string[]
    descripcion: string
    enunciadosDba: { id: number; text: string }[]
    metodoCalculo: MetodoCalculo
    gradoId: number | undefined
    grado: string
    asignaturaId: number | undefined
    asignatura: string
  }): Promise<UnidadTematica> {
    const infoGeneral = {
      nombre: data.nombre,
      area: "",
      enfoquePedagogico: "Evaluativo" as const,
      status: "pending" as const,
      fechaInicio: "",
      fechaFin: "",
      descripcion: data.descripcion,
      objetivos: data.objetivos,
      contenidos: data.contenidos,
      metodoCalculo: data.metodoCalculo,
      grado: data.grado,
      asignatura: data.asignatura,
      gradoId: data.gradoId,
      asignaturaId: data.asignaturaId,
      enunciadosDba: data.enunciadosDba,
    }
    const { id } = await createUnidadMutation.mutateAsync(infoGeneral)
    const nueva: UnidadTematica = { ...infoGeneral, id, criterios: [], actividades: [] }
    setUnidadesCreadas((prev) => [...prev, nueva])
    return nueva
  }

  const { camposEfectivos, esFormativa } = useCamposEvaluacionEfectivos(
    form,
    actividad.camposDisponibles,
    actividad.unidad.id,
  )

  return (
    <form
      id={formId}
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      {/* Va primero, antes de "Identificación": es la única pregunta que
          reclasifica la actividad entera ("esto no es la evaluación
          normal, es su recuperación"), así que se responde antes de
          completar cualquier otro campo. */}
      <EsRecuperacionToggle form={form} />
      {/* Identificación + Asignatura/Grado en UNA sola grilla —antes vivían
          en dos `<Card>` separadas y se veían como dos cajas sueltas, aunque
          las dos son "de dónde depende la actividad" (Nombre/Tipo/Unidad
          arriba, Asignatura/Grado abajo, mismo grid). Cada sección sigue
          siendo su propio componente (hooks/lógica separados), pero acá
          comparten un solo `<Card>` y un solo `grid`. */}
      <Card className="gap-4 p-4">
        <h3 className="text-base font-semibold">Identificación de la actividad</h3>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <IdentificacionSection form={form} unidades={unidades} onCrearUnidad={crearUnidad} />
          <AsignaturaGradoSection form={form} />
        </div>
      </Card>
      <UnidadSection
        form={form}
        unidades={unidades}
        evidenciasOriginales={esNueva ? [] : actividad.evidenciasIds}
        criteriosUnidadOriginales={esNueva ? [] : actividad.criteriosUnidadIds}
      />
      <MaterialesSection form={form} />
      <RecursosSection form={form} />
      <ProgramacionSection form={form} />
      <EvaluacionSection
        form={form}
        unidades={unidades}
        camposEfectivos={camposEfectivos}
        esFormativa={esFormativa}
      />
      {/* Adaptaciones y Seguimiento se desactivan junto con Evaluación
          cuando el referente de la unidad es FORMATIVO — regla de negocio
          confirmada: una unidad formativa no lleva instrumentos ni
          ponderación, y tampoco adaptaciones/seguimiento (que existen para
          hacerle ajustes a una evaluación sumativa). Mismo `esFormativa`
          que ya usa `EvaluacionSection`, calculado una sola vez acá arriba
          para no triplicar las queries de `campos_disponibles`. */}
      {!esFormativa && (
        <>
          <AdaptacionesSection form={form} estudiantes={estudiantes} />
          <SeguimientoSection form={form} />
        </>
      )}
    </form>
  )
}

/**
 * Toggle "Es una recuperación", arriba de todo el form. Solo tiene
 * sentido para una actividad sumativa —una formativa no pondera nota,
 * así que no hay nada que "recuperar"—, por eso se lee `esEvaluativa`
 * del store (mismo flag que gobierna la ponderación en `EvaluacionSection`
 * y `InstrumentoEvaluacionSection`) y el control desaparece por completo
 * cuando es `false`, en vez de deshabilitarse: no es que falte
 * completar algo, es que la pregunta no aplica.
 *
 * Si el usuario tenía el toggle en `true` y después cambia la actividad
 * a no-sumativa, el valor sigue guardado en el form (no se resetea a
 * `false`): si vuelve a marcar sumativa, reaparece en el estado que
 * dejó. Forzar un reset ahí sería más sorpresa que ayuda.
 */
function EsRecuperacionToggle({ form }: { form: FormActividad }) {
  return (
    <form.Subscribe selector={(state) => state.values.esEvaluativa}>
      {(esEvaluativa) =>
        !esEvaluativa ? null : (
          <form.Field name="esRecuperacion">
            {(field) => (
              <label
                htmlFor={field.name}
                className="flex w-full items-center gap-3 rounded-md border border-input px-3 py-2.5 text-sm"
              >
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                  className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
                />
                Es una recuperación
              </label>
            )}
          </form.Field>
        )
      }
    </form.Subscribe>
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
  onCrearUnidad,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  onCrearUnidad: (data: {
    nombre: string
    contenidos: string[]
    objetivos: string[]
    descripcion: string
    enunciadosDba: { id: number; text: string }[]
    metodoCalculo: MetodoCalculo
    gradoId: number | undefined
    grado: string
    asignaturaId: number | undefined
    asignatura: string
  }) => Promise<UnidadTematica>
}) {
  // Catálogo `TIPO_ACTIVIDAD` (`TLISTA_VALOR`) — antes hardcodeado acá mismo.
  const { data: tiposActividad = [] } = useTipoActividadCatalogQuery()

  return (
    <>
        <form.Field name="nombre">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Nombre de la actividad</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                placeholder="Agregar"
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
                  {tiposActividad.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) => `${state.values.grado}/${state.values.asignatura}`}
        >
          {() => {
            // "Unidad temática asociada" depende de Grado + Asignatura, no
            // de Grado + Grupo: una unidad se identifica por (asignatura,
            // grado) —igual que el backend real (`FK_TASIGNATURA`/
            // `FK_TGRADO` en `POST /unidades`)—, el grupo no participa de su
            // identidad. Antes exigía `grupo` acá, así que elegir Asignatura
            // sin volver a tocar "Grado / Grupo" (p.ej. al editar una
            // actividad existente, donde `grado` se resuelve recién cuando
            // `AsignaturaGradoSection` cruza `grupoId` contra el catálogo
            // del docente) dejaba este select deshabilitado sin motivo.
            const grado = form.getFieldValue("grado")
            const asignatura = form.getFieldValue("asignatura")
            const hasGradoAsignatura = Boolean(grado && asignatura)
            // `grado`/`asignatura` y `UnidadTematica.grado`/`.asignatura`
            // salen ahora del mismo origen real (`docentes/grupos`/
            // `docentes/grado-asignatura`), así que se comparan directo —
            // ya no hace falta traducir contra el catálogo genérico.
            const unidadesDelGrado = hasGradoAsignatura
              ? unidades.filter((u) => u.grado === grado && u.asignatura === asignatura)
              : []

            return (
              <form.Field name="unidad">
                {(field) => (
                  // `gap-0` + redondeado y borde derechos del `SelectTrigger`
                  // anulados (vía descendiente del `Field`) + redondeado y
                  // borde izquierdos del botón del popover anulados → los dos
                  // controles se leen como un único split-button.
                  <div className="flex items-end gap-0">
                    <Field
                      variant="outlined"
                      className="min-w-0 flex-1 [&_[data-slot=select-trigger]]:rounded-r-none [&_[data-slot=select-trigger]]:border-r-0"
                    >
                      <FieldLabel htmlFor={field.name}>Unidad temática asociada</FieldLabel>
                      <Select
                        // `Select` siempre trabaja con `value` string — el id real
                        // es numérico, así que se convierte acá. `0` es el
                        // sentinel de "sin unidad" (ningún PK real es 0).
                        value={field.state.value.id === 0 ? "__none__" : String(field.state.value.id)}
                        disabled={!hasGradoAsignatura}
                        onValueChange={(value) => {
                          // `__none__` es el placeholder "Seleccione": antes el
                          // `find` no lo encontraba en `unidades` y el `if (!next)
                          // return` cortaba en seco, dejando la unidad anterior
                          // pegada —clickear "Seleccione" no hacía nada. Se
                          // maneja aparte para poder vaciar el campo de una.
                          // Guardamos el id como `0` (sentinel de "sin unidad")
                          // para que el value de arriba lo vuelva a mostrar como
                          // "__none__" — mismo patrón que el `Select` de
                          // "Modalidad".
                          if (value === "__none__") {
                            field.handleChange({ id: 0, nombre: "" })
                            // Sin unidad no hay `metodoCalculo` que decida
                            // ponderación/puntaje — mismo criterio de abajo.
                            form.setFieldValue("ponderacion", 0)
                            form.setFieldValue("notaMaxima", undefined)
                            return
                          }
                          const next = unidadesDelGrado.find((u) => String(u.id) === value)
                          if (!next) return
                          field.handleChange({ id: next.id, nombre: next.nombre })
                          // Regla de negocio: una unidad de enfoque formativo no
                          // admite actividades sumativas. Si el usuario cambia a
                          // una unidad así, la actividad deja de ser sumativa acá
                          // mismo —no queda esperando a que la reabra— para que
                          // el resto del form (ponderación, lista de cotejo/
                          // rúbrica, "Es una recuperación") reaccione de una.
                          if (next.enfoquePedagogico === "Formativo") {
                            form.setFieldValue("esEvaluativa", false)
                          }
                          // `ponderacion`/`notaMaxima` son alternativos y
                          // dependen del `metodoCalculo` de la unidad elegida
                          // (ver `EvaluacionSection` más abajo) — sin
                          // limpiarlos acá, un valor tipeado con la unidad
                          // ANTERIOR (p. ej. un % de "Ponderado") queda pegado
                          // y se manda igual al guardar aunque la unidad
                          // NUEVA no lo pida (o pida el otro campo).
                          if (next.metodoCalculo !== "Ponderado") form.setFieldValue("ponderacion", 0)
                          if (next.metodoCalculo !== "Suma de puntos") form.setFieldValue("notaMaxima", undefined)
                        }}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue
                            placeholder={hasGradoAsignatura ? "Seleccione" : "Elegí grado/asignatura primero"}
                          >
                            {(value) =>
                              unidadesDelGrado.find((u) => String(u.id) === value)?.nombre ?? "Seleccione"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Seleccione</SelectItem>
                          {unidadesDelGrado.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <CrearUnidadPopover
                      className="rounded-l-none border-l-0"
                      gradoId={form.getFieldValue("gradoId")}
                      asignaturaId={form.getFieldValue("asignaturaId")}
                      onCreate={async (data) => {
                        // `onCrearUnidad` crea la unidad DE VERDAD (`POST
                        // /planeador/unidades`) y la devuelve con su id real:
                        // recién ahí queda en la lista que consume este
                        // `<Select>`, así que el campo se puede asignar por
                        // id sin quedar "huérfano". Grado/Asignatura de la
                        // nueva unidad son los mismos que ya eligió esta
                        // actividad — el popover no vuelve a pedirlos.
                        const nueva = await onCrearUnidad({
                          ...data,
                          gradoId: form.getFieldValue("gradoId"),
                          grado,
                          asignaturaId: form.getFieldValue("asignaturaId"),
                          asignatura,
                        })
                        field.handleChange({ id: nueva.id, nombre: nueva.nombre })
                      }}
                    />
                  </div>
                )}
              </form.Field>
            )
          }}
        </form.Subscribe>
    </>
  )
}

/**
 * Ficha de la unidad elegida arriba en "Unidad temática asociada" + la
 * sección de checkboxes de evidencias (nivel 2) de sus enunciados ya
 * relacionados (`useUnidadReferenteQuery`). Se arma en vivo: lee el `id`
 * actual del field `unidad` vía `form.Subscribe` (no un prop estático) para
 * que cambiar la unidad en el select la actualice de una. Sin unidad
 * elegida no hay nada que mostrar.
 *
 * La descripción/objetivos/contenidos de la ficha salen de
 * `useUnidadDetalleQuery`, NO de `unidades` (la lista que ya trae el form
 * para el `<Select>`): el listado real (`GET /planeador/unidades`) solo
 * confirma `area`/`descripcion`/fechas/`total_actividades` (ver el
 * comentario de `UnidadRealRow` en `use-unidades-query.ts`) — `objetivos`/
 * `contenidos` pueden faltar ahí aunque la unidad sí los tenga, y solo el
 * detalle por `:id` los trae de forma confiable.
 *
 * La selección de evidencias viaja en el propio form (`values.evidenciasIds`)
 * y se guarda junto con el resto al submit, igual que cualquier otro campo.
 * Al EDITAR una actividad ya creada, `evidenciasOriginales` marca cuáles ya
 * estaban relacionadas: esas quedan tildadas pero no se pueden destildar (no
 * hay endpoint confirmado para desvincular una evidencia, solo para agregar
 * una nueva — ver el comentario de `Actividad.evidenciasIds`).
 */
function UnidadSection({
  form,
  unidades,
  evidenciasOriginales,
  criteriosUnidadOriginales,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  evidenciasOriginales: number[]
  criteriosUnidadOriginales: number[]
}) {
  const gradoId = useSelector(form.store, (state) => state.values.gradoId)
  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)

  return (
    <form.Subscribe selector={(state) => state.values.unidad}>
      {(unidad) => {
        const seleccionada = unidades.find((u) => u.id === unidad.id)
        if (!seleccionada) return null
        return (
          <form.Field name="evidenciasIds">
            {(evidenciasField) => (
              <form.Field name="criteriosUnidadIds">
                {(criteriosField) => (
                  <UnidadFichaYEvidencias
                    unidadId={seleccionada.id}
                    nombreFallback={seleccionada.nombre}
                    gradoId={gradoId}
                    asignaturaId={asignaturaId}
                    seleccionadas={evidenciasField.state.value}
                    onToggle={(evidenciaId) => {
                      const actual = evidenciasField.state.value
                      evidenciasField.handleChange(
                        actual.includes(evidenciaId)
                          ? actual.filter((id) => id !== evidenciaId)
                          : [...actual, evidenciaId],
                      )
                    }}
                    disabledIds={evidenciasOriginales}
                    criteriosSeleccionados={criteriosField.state.value}
                    onToggleCriterio={(criterioId) => {
                      const actual = criteriosField.state.value
                      criteriosField.handleChange(
                        actual.includes(criterioId)
                          ? actual.filter((id) => id !== criterioId)
                          : [...actual, criterioId],
                      )
                    }}
                    criteriosDisabledIds={criteriosUnidadOriginales}
                  />
                )}
              </form.Field>
            )}
          </form.Field>
        )
      }}
    </form.Subscribe>
  )
}

/** Separado de `UnidadSection` solo para poder llamar
 *  `useUnidadDetalleQuery`/`useReferenteCurricularQuery` de forma
 *  incondicional (reglas de hooks) — `UnidadSection` decide arriba si hay
 *  unidad elegida antes de montar esto. */
function UnidadFichaYEvidencias({
  unidadId,
  nombreFallback,
  gradoId,
  asignaturaId,
  seleccionadas,
  onToggle,
  disabledIds,
  criteriosSeleccionados,
  onToggleCriterio,
  criteriosDisabledIds,
}: {
  unidadId: number
  nombreFallback: string
  gradoId: number | undefined
  asignaturaId: number | undefined
  seleccionadas: number[]
  onToggle: (evidenciaId: number) => void
  disabledIds: number[]
  criteriosSeleccionados: number[]
  onToggleCriterio: (criterioId: number) => void
  criteriosDisabledIds: number[]
}) {
  const { data: unidad } = useUnidadDetalleQuery(unidadId)
  // El árbol de evidencias a ofrecer sale del referente curricular de
  // GRADO + ASIGNATURA (`GET /planeador/referente-curricular`), no de la
  // unidad — cambiar de asignatura cambia el referente y con él las
  // evidencias disponibles, sin importar qué unidad siga elegida.
  const { data: referente } = useReferenteCurricularQuery(gradoId, asignaturaId)

  return (
    <div className="flex flex-col gap-4">
      <UnidadFicha
        nombre={unidad?.nombre ?? nombreFallback}
        descripcion={unidad?.descripcion ?? ""}
        objetivos={unidad?.objetivos ?? []}
        contenidos={unidad?.contenidos ?? []}
      />
      {referente && referente.enunciados.length > 0 && (
        <EnunciadosEvidenciasChecklist
          nivel1Etiqueta={referente.nivel1Etiqueta}
          nivel2Etiqueta={referente.nivel2Etiqueta}
          enunciados={referente.enunciados}
          seleccionadas={seleccionadas}
          onToggle={onToggle}
          disabledIds={disabledIds}
        />
      )}
      {unidad && unidad.criterios.length > 0 && (
        <CriteriosUnidadChecklist
          criterios={unidad.criterios}
          seleccionados={criteriosSeleccionados}
          onToggle={onToggleCriterio}
          disabledIds={criteriosDisabledIds}
        />
      )}
    </div>
  )
}

/**
 * "Grado / Grupo" es UN SOLO `<Select>` (no dos campos separados): cada
 * opción ya es una combinación real "grado/grupo" del DOCENTE autenticado
 * (`useDocenteGruposQuery` — mismo endpoint real que ya usa el filtro de la
 * Planilla, `GET /planeador/docentes/grupos`), no el catálogo genérico de
 * Establecimiento (que ofrecía grados/grupos que ni siquiera le
 * correspondían a este docente). Elegir un combo escribe `grado`/`grado Id`
 * y `grupo`/`grupoId` en el form y habilita Asignatura y "Unidad temática
 * asociada" (`IdentificacionSection`), que dependen de él y se filtran/
 * limpian cuando cambia.
 *
 * Asignatura sale de `useDocenteGradoAsignaturaQuery` (mismo endpoint real,
 * `GET /planeador/docentes/grado-asignatura`), filtrada por el `gradoId`
 * ya elegido — reemplaza la lista `ASIGNATURA_OPTIONS` hardcodeada, que
 * ofrecía asignaturas sin relación con lo que el docente realmente dicta.
 */
/** `grupo_codigo` viene `null` en los datos reales — `grupo_nombre` ("01",
 *  "302", …) es el que sí trae valor, así que se prioriza acá. Mismo
 *  criterio que `grupoLabel` en `filtro-planilla-cascada.tsx`. */
function grupoLabel(grupo: { grupoCodigo: string; grupoNombre: string }): string {
  return grupo.grupoCodigo || grupo.grupoNombre
}

function AsignaturaGradoSection({ form }: { form: FormActividad }) {
  const { data: docenteGrupos = [] } = useDocenteGruposQuery()
  const { data: docenteGradoAsignatura = [] } = useDocenteGradoAsignaturaQuery()
  const gradoId = useSelector(form.store, (state) => state.values.gradoId)
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  // El backend real de una actividad no siempre trae `fk_tgrado`/el id no
  // siempre está en el catálogo del docente autenticado (una actividad
  // puede pertenecer a un grado/grupo/asignatura que este docente ya no
  // dicta, o a otro docente) — sin esto el `<SelectValue>` no encuentra con
  // qué opción matchear el id guardado y termina mostrando el número
  // crudo. `grado`/`grupo`/`asignatura` son los labels que el mapper real
  // (`toActividadDetalle`) SÍ preserva siempre; se usan como respaldo.
  const grado = useSelector(form.store, (state) => state.values.grado)
  const grupo = useSelector(form.store, (state) => state.values.grupo)
  const asignatura = useSelector(form.store, (state) => state.values.asignatura)
  const hasGradoGrupo = gradoId != null && grupoId != null

  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)

  // El detalle real de la actividad (`toActividadDetalle`) NO trae
  // `fk_tgrado` —solo `fk_tgrupo`—, así que al abrir el form de EDITAR
  // `gradoId` llega vacío aunque `grupoId` sí esté, y eso dejaba "Asignatura
  // / materia" deshabilitado de entrada (además de encadenarse a "Unidad
  // temática asociada" en `IdentificacionSection`, que depende de `grado`).
  // Acá se resuelve el `gradoId`/`grado` que falta cruzando `grupoId` contra
  // el catálogo `docentes/grupos` del propio docente, que sí trae el grado
  // de cada uno de sus grupos.
  //
  // Ese cruce por GRUPO solo resuelve si el grupo de la actividad es uno
  // que ESTE docente dicta — para una actividad de un grupo ajeno (dato de
  // otro docente/de prueba, el caso que rompía "¿es formativo?" en
  // `CrearUnidadPopover` acá abajo: sin `gradoId` nunca puede derivarlo ni
  // crear la unidad nueva), `combo` nunca aparece y `gradoId` se queda
  // `undefined` para siempre, aunque el detalle sí traiga `fk_tasignatura`
  // (`asignaturaId`, éste sí siempre presente — ver `toActividadDetalle`).
  // Ahí se intenta un segundo cruce, por ASIGNATURA en vez de por grupo,
  // contra `docentes/grado-asignatura`: mismo catálogo del propio docente,
  // pero una asignatura suele repetirse en más grados que un grupo puntual,
  // así que tiene más chance de matchear.
  useEffect(() => {
    if (gradoId != null) return
    if (grupoId != null) {
      const combo = docenteGrupos.find((g) => g.grupoId === grupoId)
      if (combo) {
        form.setFieldValue("gradoId", combo.gradoId)
        form.setFieldValue("grado", combo.gradoNombre)
        return
      }
    }
    if (asignaturaId != null) {
      const par = docenteGradoAsignatura.find((p) => p.asignaturaId === asignaturaId)
      if (par) {
        form.setFieldValue("gradoId", par.gradoId)
        form.setFieldValue("grado", par.gradoNombre)
      }
    }
  }, [gradoId, grupoId, asignaturaId, docenteGrupos, docenteGradoAsignatura, form])

  const asignaturas = docenteGradoAsignatura.filter((par) => par.gradoId === gradoId)

  return (
    <>
        <form.Field name="asignaturaId">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Asignatura / materia</FieldLabel>
              <Select
                // `__none__` es el sentinel de "sin elegir" — mismo patrón
                // que "Unidad temática asociada". Sin un valor propio para
                // ese estado, no había forma de VOLVER a "sin asignatura"
                // una vez elegida una: y sin asignatura (ni grado) el
                // enfoque no se puede derivar, así que "¿Es evaluación
                // sumativa?" queda libre (ver `EvaluacionSection`) en vez
                // de bloqueado por una unidad/referente que ya no aplica.
                value={field.state.value != null ? String(field.state.value) : "__none__"}
                onValueChange={(v) => {
                  if (!v) return
                  if (v === "__none__") {
                    field.handleChange(undefined)
                    form.setFieldValue("asignatura", "")
                    return
                  }
                  const par = asignaturas.find((a) => String(a.asignaturaId) === v)
                  if (!par) return
                  field.handleChange(par.asignaturaId)
                  form.setFieldValue("asignatura", par.asignaturaNombre)
                }}
                disabled={!hasGradoGrupo}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue
                    placeholder={hasGradoGrupo ? "Seleccione" : "Elegí grado/grupo primero"}
                  >
                    {(value) =>
                      value === "__none__"
                        ? "Seleccione"
                        : // `||`, no `??`: `asignatura` llega `""` (no
                          // `undefined`) cuando el detalle real no trae
                          // ninguna todavía, y `?? "Seleccione"` no cae ahí —
                          // se veía en blanco en vez del placeholder.
                          (asignaturas.find((a) => String(a.asignaturaId) === value)?.asignaturaNombre ||
                            asignatura ||
                            "Seleccione")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccione</SelectItem>
                  {asignaturas.map((a) => (
                    <SelectItem key={a.asignaturaId} value={String(a.asignaturaId)}>
                      {a.asignaturaNombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <Field variant="outlined">
          <FieldLabel htmlFor="grado-grupo">Grado / Grupo</FieldLabel>
          <Select
            // `__none__` es el sentinel de "sin elegir" — mismo criterio
            // que Asignatura arriba (y que "Unidad temática asociada"):
            // permite volver a "sin grado/grupo" en vez de quedar pegado a
            // la primera combinación elegida.
            value={grupoId != null ? String(grupoId) : "__none__"}
            onValueChange={(v) => {
              if (!v) return
              if (v === "__none__") {
                form.setFieldValue("gradoId", undefined)
                form.setFieldValue("grado", "")
                form.setFieldValue("grupoId", undefined)
                form.setFieldValue("grupo", "")
                form.setFieldValue("asignaturaId", undefined)
                form.setFieldValue("asignatura", "")
                form.setFieldValue("unidad", { id: 0, nombre: "" })
                return
              }
              const combo = docenteGrupos.find((g) => String(g.grupoId) === v)
              if (!combo) return
              form.setFieldValue("gradoId", combo.gradoId)
              form.setFieldValue("grado", combo.gradoNombre)
              form.setFieldValue("grupoId", combo.grupoId)
              form.setFieldValue("grupo", grupoLabel(combo))
              // Asignatura y unidad dependen de "Grado / Grupo": cambiarlo
              // invalida lo que había elegido en las dos.
              form.setFieldValue("asignaturaId", undefined)
              form.setFieldValue("asignatura", "")
              form.setFieldValue("unidad", { id: 0, nombre: "" })
            }}
          >
            <SelectTrigger id="grado-grupo">
              <SelectValue placeholder="Seleccione">
                {(value) => {
                  if (value === "__none__") return "Seleccione"
                  const combo = docenteGrupos.find((g) => String(g.grupoId) === value)
                  if (combo) return `${combo.gradoNombre}/${grupoLabel(combo)}`
                  return [grado, grupo].filter(Boolean).join("/") || "Seleccione"
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Seleccione</SelectItem>
              {docenteGrupos.map((g) => (
                <SelectItem key={g.grupoId} value={String(g.grupoId)}>
                  {g.gradoNombre}/{grupoLabel(g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
    </>
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
              placeholder="Ej: Cuaderno, colores, computador portátil…"
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

/**
 * Draft de un recurso todavía no agregado a la lista. Vive en estado local
 * del componente —no en el form field— hasta que el usuario confirma con
 * "Agregar a la lista", recién ahí se commitea al `form.field.recursos`.
 *
 * Antes cada item agregado se renderizaba como un `RecursoItem` editable
 * inline, igual que el form de alta: el resultado era N copias del mismo
 * formulario apiladas, con su propio botón "Quitar" cada una. El mockup
 * pide una sola pieza de alta + una lista compacta debajo —un form arriba,
 * ítems display-only abajo con acciones al hover—. Eso es lo que modela
 * `draft` + commit.
 */
type RecursoDraft = Omit<Recurso, "id">

const RECURSO_DRAFT_VACIO: RecursoDraft = {
  titulo: "",
  fuente: "",
  tipo: "URL",
  url: "",
  descripcion: "",
}

function RecursosSection({ form }: { form: FormActividad }) {
  // Colapsa/expande el cuerpo del card. El título + los botones del header
  // (biblioteca, + agregar) quedan siempre a la vista; el toggle `-/+`
  // muestra u oculta el form de alta + la lista.
  const [collapsed, setCollapsed] = useState(false)
  // Abre/cierra el modal de biblioteca: galería con buscador + paginación
  // de todos los recursos que el docente ha subido en otras actividades,
  // para reutilizarlos acá sin tener que volver a cargarlos.
  const [bibliotecaOpen, setBibliotecaOpen] = useState(false)
  // Borrador del recurso que el usuario está cargando ahora mismo. Vive
  // afuera del form field: hasta que no se commitea con "Agregar a la
  // lista", los cambios NO se reflejan en el form state ni disparan
  // `isDirty` — así editar el borrador no ensucia el form antes de tiempo.
  const [draft, setDraft] = useState<RecursoDraft>(RECURSO_DRAFT_VACIO)

  function updateDraft(patch: Partial<RecursoDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function handleAddDraft() {
    // El commit pide al menos una URL/fuente: un item sin referencia no
    // aporta nada en la lista de "Recursos agregados" (se vería como
    // una línea vacía con un tag).
    if (!draft.url.trim() && !draft.fuente.trim()) return
    const list = form.getFieldValue("recursos") as Recurso[]
    form.setFieldValue("recursos", [
      ...list,
      { id: cryptoId(), ...draft },
    ])
    setDraft(RECURSO_DRAFT_VACIO)
  }

  // Cuando el docente elige un recurso de la biblioteca, se inserta
  // directo en la lista de "Recursos agregados" (mismo flujo que
  // `handleAddDraft`, pero sin pasar por el draft). El id nuevo se
  // genera acá: el `Recurso` que viene del modal ya trae un id del
  // recurso original en otra actividad, y si lo reusáramos dos
  // recursos podrían colisionar en el `<ul>` (la key es el id).
  function handlePickFromBiblioteca(recurso: Omit<Recurso, "id">) {
    const list = form.getFieldValue("recursos") as Recurso[]
    form.setFieldValue("recursos", [...list, { id: cryptoId(), ...recurso }])
  }

  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Materiales de apoyo (agrega varios recursos)</h3>
        <div className="flex gap-2">
          {/* Biblioteca: abre el modal de "galería de recursos del docente"
              — todos los recursos que el usuario ha subido en sus
              actividades previas, con buscador y paginación. El ícono es
              `RemoveCircleOutlineIcon` (que en este contexto representa
              "abrir el repositorio" — es el mismo ícono que usan los
              otros repositorios de la app). `outline` + `primary` para
              que sea un botón secundario de la cabecera (el primario es
              el toggle de colapsar, que es la acción más usada). */}
          <Button
            variant="outline"
            color="primary"
            size="icon-sm"
            type="button"
            onClick={() => setBibliotecaOpen(true)}
            aria-label="Adjuntar desde biblioteca"
          >
            <FolderOpenIcon />
          </Button>
          {/* Toggle colapsar/expandir. El ícono cambia entre los dos
              estados: `+` outline (expandir) cuando está colapsado, `-`
              fill (colapsar) cuando está expandido. Mismo idioma visual
              que otros accordions del DS, con el `+`/`-` mapeado al
              estado del colapso. Este queda como `fill` + `primary` —
              es la acción primaria de la cabecera, la biblioteca es
              secundaria. */}
          <Button
            variant="fill"
            color="primary"
            size="icon-sm"
            type="button"
            aria-label={collapsed ? "Expandir sección de recursos" : "Colapsar sección de recursos"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <PlusCircleIcon /> : <RemoveCircleOutlineIcon />}
          </Button>
        </div>
      </div>

      {collapsed ? null : (
        <div className="flex flex-col gap-4">
          {/* Form de alta: SIEMPRE uno solo, vive afuera del `.map()` de la
              lista. Antes había uno por item agregado, lo que duplicaba el
              form N veces y rompía la lectura visual de "estoy agregando
              un nuevo recurso". */}
          <RecursoForm
            draft={draft}
            onChange={updateDraft}
            onAdd={handleAddDraft}
          />

          <form.Field name="recursos">
            {(field) => {
              const recursos = field.state.value as Recurso[]
              // Lista compacta display-only. Vacío = no se muestra la sección
              // (la propia "(agrega varios recursos)" + el form de arriba ya
              // invitan a cargar el primero).
              if (recursos.length === 0) return null
              return (
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    Recursos agregados
                  </h4>
                  <ul className="flex flex-col gap-2">
                    {recursos.map((recurso, index) => (
                      <RecursoItem
                        key={recurso.id}
                        recurso={recurso}
                        onRemove={() => {
                          const list = (field.state.value as Recurso[]).slice()
                          list.splice(index, 1)
                          field.handleChange(list)
                        }}
                      />
                    ))}
                  </ul>
                </div>
              )
            }}
          </form.Field>
        </div>
      )}

      {/* Modal de biblioteca: galería con buscador + paginación. Se monta
          siempre (no depende de `collapsed`) — el padre controla la
          apertura con `bibliotecaOpen` y el `onOpenChange` resetea el
          buscador + página al cerrar (lo hace el componente mismo).
          Le pasamos la lista actual de recursos para que excluya los que
          ya están en el form y no aparezcan como duplicados. */}
      <form.Subscribe selector={(state) => state.values.recursos}>
        {(recursos) => (
          <DialogBibliotecaRecursos
            open={bibliotecaOpen}
            onOpenChange={setBibliotecaOpen}
            recursosActuales={recursos as Recurso[]}
            onSelect={handlePickFromBiblioteca}
          />
        )}
      </form.Subscribe>
    </Card>
  )
}

/**
 * Form de alta de un recurso. Recibe el `draft` desde `RecursosSection` y
 * emite cambios vía `onChange`. El botón "Agregar a la lista" es el que
 * dispara el commit en el padre.
 *
 * El campo "Fuente" cambia su placeholder según el tipo seleccionado: la
 * URL pide una URL, la unidad virtual pide el nombre del repositorio, el
 * archivo pide el nombre del archivo. Misma idea detrás del cambio de
 * ícono/icono que ya tenía el campo.
 */
function RecursoForm({
  draft,
  onChange,
  onAdd,
}: {
  draft: RecursoDraft
  onChange: (patch: Partial<RecursoDraft>) => void
  onAdd: () => void
}) {
  const FuenteIcon =
    draft.tipo === "Unidad virtual"
      ? ImageIcon
      : draft.tipo === "Archivo"
        ? FileUploadOutlinedIcon
        : null

  // Placeholder contextual del campo "Fuente" según el tipo. La idea es
  // que el ejemplo que ve el usuario matchee lo que va a tipear —si es
  // URL, una URL de ejemplo; si es archivo, el nombre de un archivo, etc.
  const fuentePlaceholder =
    draft.tipo === "Unidad virtual"
      ? "Nombre de la unidad virtual o repositorio"
      : draft.tipo === "Archivo"
        ? "Nombre del archivo"
        : "https://..."

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Recurso - Fuente</h4>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Field variant="outlined">
          <FieldLabel>Tipo</FieldLabel>
          <Select
            value={draft.tipo}
            onValueChange={(v) =>
              onChange({
                tipo: (v ?? "URL") as Recurso["tipo"],
                // Al pasar a "Archivo" la URL previa pierde sentido (el
                // browser rechaza cualquier string en `<input type="file">`
                // que no sea ""). En los demás cambios (URL ↔ Unidad
                // virtual) se preserva para no borrar lo que el usuario
                // ya tipeó.
                url: v === "Archivo" ? "" : draft.url,
              })
            }
          >
            <SelectTrigger>
              {/* El trigger pinta ícono + label del tipo seleccionado,
                  sacando ambos del mapper. Si no hay valor todavía, cae
                  al placeholder "URL / Sitio web" con el ícono de ese
                  tipo (es el primero del mapper y el que la app usa
                  como default en el draft vacío). */}
              <SelectValue placeholder="URL / Sitio web">
                {(value) => {
                  const pres = RECURSO_PRESENTACION[value as Recurso["tipo"]]
                  if (!pres) return "URL / Sitio web"
                  const Icon = pres.Icon
                  return (
                    <span className="flex items-center gap-2">
                      <Icon className="size-3.5" />
                      {pres.label}
                    </span>
                  )
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {/* Iteramos sobre el mapper (no sobre un array hardcodeado)
                  para que agregar un tipo nuevo sea un cambio de una sola
                  línea en `RECURSO_PRESENTACION`. Mismo patrón que el
                  `<DualList>` de roles-menus que mapea `MenuNode[]`. */}
              {(Object.entries(RECURSO_PRESENTACION) as [Recurso["tipo"], RecursoPresentacion][]).map(
                ([value, { label, Icon }]) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">
                      <Icon className="size-3.5" />
                      {label}
                    </span>
                  </SelectItem>
                ),
              )}
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
              type={draft.tipo === "Archivo" ? "file" : "url"}
              placeholder={fuentePlaceholder}
              value={draft.url}
              onChange={(e) => onChange({ url: e.target.value })}
              className={FuenteIcon ? "pl-9" : undefined}
            />
          </div>
        </Field>
      </div>

      <Field variant="outlined" className="mt-3">
        <FieldLabel>Descripción / nota</FieldLabel>
        <Textarea
          className={TEXTAREA_OUTLINED}
          rows={2}
          placeholder="Ej: Video introductorio (7 min)"
          value={draft.descripcion}
          onChange={(e) => onChange({ descripcion: e.target.value })}
        />
      </Field>

      {/* Se oculta (no se deshabilita) mientras el draft no tenga URL ni
          fuente: un item sin referencia no aporta nada en la lista de
          "Recursos agregados", y un botón deshabilitado invita a completar
          el resto de los campos primero cuando en realidad ya alcanza con
          la URL/fuente. */}
      {(draft.url.trim() || draft.fuente.trim()) && (
        <div className="mt-3 flex justify-end">
          <Button variant="fill" color="primary" size="sm" type="button" onClick={onAdd}>
            <PlusIcon data-icon="inline-start" />
            Guardar
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Display-only de un recurso ya agregado. A diferencia del antiguo
 * `RecursoItem` (que era el mismo form de alta repetido por item), acá
 * el item es de lectura: muestra URL + descripción + tag del tipo, y
 * las acciones (ver, descargar, eliminar) aparecen SOLO al hover/foco
 * de la fila. Mismo idioma visual que la `DataTable` (overlay sticky
 * sobre la celda de acciones).
 */
function RecursoItem({
  recurso,
  onRemove,
}: {
  recurso: Recurso
  onRemove: () => void
}) {
  // Toda la presentación (ícono, color, label) sale del mapper: si mañana
  // se agrega un tipo nuevo o se cambia el color de "URL", se toca un solo
  // lugar y todos los call sites se actualizan.
  const { label, Icon, bg, text } = RECURSO_PRESENTACION[recurso.tipo]

  return (
    // `relative` en el `<li>` ancla el overlay de acciones a la tarjeta.
    // Sin él, el `absolute` del overlay se posiciona contra el ancestro
    // posicionado más cercano (que puede ser muy arriba en el árbol) y
    // los botones terminan flotando fuera del card al hacer scroll.
    // Mismo idioma que la celda `actions` de `DataTable`.
    // `hover:bg-muted-22` en la tarjeta — mismo hover que las filas de
    // `DataTable` (`bg-muted-22` ≈ muted al 28%, ver el comentario del
    // `overlayClass` en `data-table.tsx`). Mantiene la consistencia con
    // el resto de los listados de la app: lo que se "ilumina" al pasar
    // el cursor es siempre el mismo tono.
    <li className="group/recuro relative flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-muted-22">
      {/* Cuadrado de la cabecera: tipo-específico (color + ícono del
          mapper). Cambia del círculo genérico anterior a un cuadrado
          redondeado, igual al del mockup, y crece a `size-10` para
          que el ícono interno a `size-6` se lea con peso. */}
      <span
        aria-hidden
        className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", bg, text)}
      >
        <Icon className="size-6" />
      </span>

      {/* Cuerpo: URL arriba (truncada con tooltip), descripción abajo.
          `min-w-0` + `truncate` para que un enlace largo no rompa el
          flex y empuje el contenido. `pr-*` reserva el ancho del
          overlay de acciones a la derecha, así el título y la
          descripción no quedan tapados cuando se hace hover. */}
      <div className="min-w-0 flex-1 pr-24">
        <p
          className="truncate text-sm font-semibold"
          title={recurso.url || recurso.fuente}
        >
          {recurso.url || recurso.fuente || "(sin URL)"}
        </p>
        {recurso.descripcion && (
          <p className="text-muted-foreground truncate text-xs" title={recurso.descripcion}>
            {recurso.descripcion}
          </p>
        )}
      </div>

      {/* Badge del tipo — mismo componente `Badge` que usan las columnas de
          las tablas del resto de la app, con el color del mapper. Acá el
          texto sube a `text-xs` (el default del Badge es `text-[0.625rem]`,
          pensado para columnas angostas): en esta fila comparte espacio con
          la URL en `text-sm`, y a la talla default se leía perdido.
          Sigue en el flex (no es absolute) porque siempre debe verse; las
          acciones son las que se overlay-an, no el badge. */}
      <Badge variant="soft" className={cn("shrink-0 text-xs", bg, text)}>
        <Icon data-icon="inline-start" />
        {label}
      </Badge>

      {/* Acciones: overlay ABSOLUTO anclado al borde derecho de la
          tarjeta. No ocupa lugar en el flex del cuerpo —el `pr-24` del
          div de arriba reserva el espacio visual— así el título y la
          descripción NO se mueven al hacer hover (antes, con las
          acciones en el flujo, el badge se desplazaba hacia la
          izquierda). Por defecto `opacity-0`; al hover de la fila o
          cuando cualquier hijo recibe foco visible, se pinta.

          Mismo color que el hover del `<li>`, pero pre-mezclado con
          `color-mix` (igual que en DataTable) en vez de `bg-muted-22`:
          `muted-22` lleva alfa, así que apilado sobre el badge se veía
          transparente/lavado; el color-mix da un sólido opaco que tapa
          bien lo que hay debajo y solo los botones destacan. */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center gap-1 rounded-r-md bg-[color-mix(in_srgb,var(--muted)_28%,var(--card))] pl-2 pr-3 opacity-0 transition-opacity",
          "group-hover/recuro:opacity-100 group-has-[:focus-visible]/recuro:opacity-100",
        )}
      >
        <Button
          variant="ghost"
          color="neutral"
          size="icon-sm"
          type="button"
          aria-label="Ver recurso"
          render={
            recurso.url
              ? (
                <Link
                  to={paths.app.planeadorRecursoPreview.getHref()}
                  search={{
                    tipo: recurso.tipo,
                    url: recurso.url,
                    fuente: recurso.fuente,
                    titulo: recurso.titulo,
                    descripcion: recurso.descripcion,
                  }}
                />
              )
              : undefined
          }
        >
          <EyeIcon />
        </Button>
        <Button
          variant="ghost"
          color="neutral"
          size="icon-sm"
          type="button"
          aria-label="Descargar"
        >
          <FileDownloadOutlinedIcon />
        </Button>
        <Button
          variant="ghost"
          color="neutral"
          size="icon-sm"
          type="button"
          aria-label="Quitar de la lista"
          onClick={onRemove}
        >
          <TrashIcon />
        </Button>
      </div>
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
              <DatePicker
                mode="date"
                id={field.name}
                value={parseDateValue(field.state.value)}
                onChange={(date) => field.handleChange(formatDateValue(date))}
              />
            </Field>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.fechaInicio}>
          {(fechaInicio) => (
            <form.Field name="fechaCierre">
              {(field) => (
                <Field variant="outlined">
                  <FieldLabel htmlFor={field.name}>Fecha de entrega o cierre</FieldLabel>
                  <DatePicker
                    mode="date"
                    id={field.name}
                    value={parseDateValue(field.state.value)}
                    onChange={(date) => field.handleChange(formatDateValue(date))}
                    minDate={parseDateValue(fechaInicio)}
                  />
                </Field>
              )}
            </form.Field>
          )}
        </form.Subscribe>

        <form.Field name="duracionEstimada">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Duración estimada (horas o sesiones)</FieldLabel>
              {/* `type="text"` + `inputMode="numeric"` y no `type="number"`:
                  mismo criterio que el resto de la app (ver `text-input.ts`)
                  — un `number` acepta notación como `1e5` y no sirve para
                  un conteo simple. Solo dígitos, sin la unidad ("horas")
                  mezclada en el valor. */}
              <Input
                id={field.name}
                inputMode="numeric"
                placeholder="Ej: 20"
                value={field.state.value}
                onChange={(e) => field.handleChange(toDigitsOnly(e.target.value))}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="semana">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Semana del cronograma</FieldLabel>
              {/* Solo un número o un rango simple ("10-12") — ver
                  `toDigitsOrRangeInput` en `text-input.ts`. Ya no admite
                  letras ("Semana ") ni listas separadas por coma. */}
              <Input
                id={field.name}
                inputMode="numeric"
                placeholder="Ej: 10-12"
                value={field.state.value}
                onChange={(e) => field.handleChange(toDigitsOrRangeInput(e.target.value))}
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
                  {/* Sin esta función, seleccionar "Seleccione" (value
                      "__none__") dejaba ese id crudo pintado en el trigger
                      en vez de caer al placeholder — mismo arreglo que el
                      resto de los `Select` con opción "Seleccione" del
                      form (ver "¿A quién se aplica esta adaptación?"). */}
                  <SelectValue placeholder="Seleccione">
                    {(value) => (value === "__none__" ? "Seleccione" : (value as string))}
                  </SelectValue>
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

/**
 * `campos_disponibles.evaluacion` (mismo bloque que `GET .../configuracion`,
 * carpeta 5) es la respuesta YA RESUELTA por el backend con TODAS sus
 * reglas de negocio (huérfana, unidad sin referente, referente FORMATIVO,
 * grado de preescolar, …) — manda sobre cualquier re-derivación en el
 * cliente, CON o SIN unidad: antes esta foto solo se usaba para actividades
 * huérfanas y, con unidad, se re-derivaba en vivo con
 * `useUnidadReferenteQuery(unidadId)` (`GET /unidades/:id/referente`, que
 * solo trae "¿es formativa?", no obligatoriedad) — pero para una actividad
 * cuya propia unidad SÍ tiene un referente FORMATIVO confirmado
 * (`campos_disponibles.evaluacion.visible: false`), esa re-derivación podía
 * no coincidir y dejaba "¿Es evaluación sumativa?" sin bloquear pese a que
 * el backend ya lo tenía resuelto.
 *
 * Se calcula UNA sola vez en `EditarActividadForm` (en vez de adentro de
 * `EvaluacionSection`) porque `esFormativa` también apaga Adaptaciones y
 * Seguimiento — regla de negocio confirmada: una unidad formativa nunca
 * lleva instrumentos, ponderación, adaptaciones ni seguimiento.
 */
function useCamposEvaluacionEfectivos(
  form: FormActividad,
  camposDisponibles: Actividad["camposDisponibles"],
  actividadUnidadId: number,
) {
  const unidadIdRaw = useSelector(form.store, (state) => state.values.unidad.id)
  const unidadId = unidadIdRaw || undefined
  const gradoId = useSelector(form.store, (state) => state.values.gradoId)
  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  const esEvaluativaValue = useSelector(form.store, (state) => state.values.esEvaluativa)

  // Sigue aplicando solo mientras la unidad elegida en el form sea la MISMA
  // con la que se tomó la foto (`unidadId === actividadUnidadId`, sentinel
  // `undefined`/`0` incluido para el caso huérfano): si el usuario cambia
  // de unidad —o le agrega una a una huérfana— la foto quedó vieja y hace
  // falta resolver en vivo contra la unidad nueva.
  const camposDisponiblesAplica = camposDisponibles != null && (unidadId ?? 0) === actividadUnidadId

  // Grado/Asignatura ahora se pueden volver a dejar en "Seleccione" (ver
  // `AsignaturaGradoSection`) — pero `camposDisponibles` es una foto FIJA
  // del detalle con el que se abrió el form, tomada cuando SÍ tenían un
  // grado/asignatura. Sin este chequeo, limpiar los dos de vuelta a
  // "Seleccione" seguía bloqueando "¿Es evaluación sumativa?" con esa foto
  // vieja, como si el grado/asignatura que ya no está siguiera aplicando.
  const sinGradoNiAsignatura = gradoId == null && asignaturaId == null
  // SIN unidad Y sin foto vigente hay dos casos: editando una huérfana cuya
  // foto quedó vieja (grado/asignatura recién cambiados en el form), o
  // dando de alta una actividad nueva (`crearActividadVacia`, todavía sin
  // detalle real) — en ambos se resuelve en vivo por grado/asignatura, que
  // en el alta siempre resuelve porque el docente elige de su propio
  // catálogo (ver `AsignaturaGradoSection`).
  const sinUnidadNiDetalle = unidadId == null && !camposDisponiblesAplica
  // Con unidad elegida (alta de actividad, o huérfana recién vinculada) se
  // resuelve en vivo contra `GET /unidades/:id/configuracion-actividad`
  // (`useConfiguracionActividadQuery`) — la MISMA fuente `campos_disponibles`
  // que ya usa el detalle real, en vez de la vieja `useUnidadReferenteQuery`
  // que solo traía "¿es formativa?" sin decir qué es obligatorio.
  const { data: configuracionEnVivo } = useConfiguracionActividadQuery(
    !camposDisponiblesAplica && unidadId != null ? unidadId : undefined,
    esEvaluativaValue,
  )
  const { data: referenteDeGradoAsignatura } = useReferenteCurricularQuery(
    sinUnidadNiDetalle ? gradoId : undefined,
    sinUnidadNiDetalle ? asignaturaId : undefined,
  )

  // Fuente de verdad efectiva para "qué mostrar/exigir": la foto fija del
  // detalle si sigue aplicando, si no la configuración en vivo por unidad
  // (alta, o huérfana recién vinculada) — la usa tanto `esFormativa` como
  // los asteriscos de "obligatorio" y el catálogo de instrumentos permitidos.
  const camposEfectivos = camposDisponiblesAplica ? camposDisponibles : configuracionEnVivo

  const esFormativa = camposEfectivos
    ? camposEfectivos.evaluacion.visible === false
    : !sinGradoNiAsignatura && (referenteDeGradoAsignatura?.esFormativo ?? false)

  return { camposEfectivos, esFormativa }
}

function EvaluacionSection({
  form,
  unidades,
  camposEfectivos,
  esFormativa,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  /** Ver `useCamposEvaluacionEfectivos`, calculado una sola vez en
   *  `EditarActividadForm`. */
  camposEfectivos: ReturnType<typeof useCamposEvaluacionEfectivos>["camposEfectivos"]
  esFormativa: boolean
}) {
  // `disabled={esFormativa}` de abajo solo bloquea el control — no corrige
  // el VALOR. Sin esto, una actividad que ya traía `esEvaluativa: true` al
  // abrir el form (o cuya unidad recién se supo formativa cuando terminó de
  // resolver la query en vivo, que es asíncrona) se quedaba marcada como
  // sumativa aunque el select apareciera bloqueado en "Sí" — y ese valor
  // viajaba igual al guardar. La regla es "formativa nunca sumativa"
  // siempre, no solo mientras el usuario toca el select.
  useEffect(() => {
    if (esFormativa) form.setFieldValue("esEvaluativa", false)
  }, [esFormativa, form])

  // Catálogo `INSTRUMENTO_EVALUACION` (`TLISTA_VALOR`) — antes hardcodeado
  // acá mismo. Filtrado por `camposEfectivos.evaluacion.instrumentosPermitidos`
  // (regla confirmada: un referente EVALUATIVO solo permite ciertos
  // instrumentos, no el catálogo completo) — sin foto/config resuelta
  // todavía, o con la lista vacía, se muestra el catálogo completo en vez
  // de dejar el select sin opciones.
  const { data: instrumentos = [] } = useInstrumentoEvaluacionCatalogQuery()
  const instrumentosPermitidos = camposEfectivos?.evaluacion.instrumentosPermitidos
  const instrumentosDisponibles =
    instrumentosPermitidos && instrumentosPermitidos.length > 0
      ? instrumentos.filter((instrumento) => instrumentosPermitidos.includes(instrumento))
      : instrumentos

  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Evaluación</h3>
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <form.Field name="esEvaluativa">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>¿Es evaluación sumativa?</FieldLabel>
              <Select
                value={field.state.value ? "si" : "no"}
                onValueChange={(value) => field.handleChange(value === "si")}
                disabled={esFormativa}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue>{(value) => (value === "si" ? "Sí" : "No")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        {/* El instrumento (y su definición, más abajo) solo aplican con un
            referente EVALUATIVO — regla de negocio confirmada: "referente
            formativo: la actividad nunca tendrá instrumentos de
            evaluación". Antes se mostraban siempre (para no tapar una
            Rúbrica/Lista de cotejo ya guardada si el referente cambiaba
            después de crearla), pero esa excepción quedó descartada: una
            unidad formativa no lleva instrumento, punto. */}
        {!esFormativa && (
          <form.Field name="instrumento">
            {(field) => (
              <Field variant="outlined">
                <FieldLabel htmlFor={field.name}>
                  Instrumento de evaluación{camposEfectivos?.evaluacion.requerido ? " *" : ""}
                </FieldLabel>
                <Select value={field.state.value} onValueChange={(v) => v && field.handleChange(v)} >
                  <SelectTrigger id={field.name}>
                    <SelectValue>
                      {(value) => (value === "Otro" ? "Otro (personalizado)" : (value as string))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {instrumentosDisponibles.map((instrumento) => (
                      <SelectItem key={instrumento} value={instrumento}>
                        {instrumento === "Otro" ? "Otro (personalizado)" : instrumento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>
        )}

      </div>

      {esFormativa ? null : (
        <>
          {/* La definición del instrumento (Rúbrica o Lista de cotejo) vive
              adentro del mismo card de "Evaluación", entre el `instrumento`
              elegido arriba y la `Ponderación (%)` de abajo — antes era un
              `Card` hermano y suelto, separado de este. */}
          <InstrumentoEvaluacionSection form={form} unidades={unidades} />

          {/* Ponderación/Puntaje va AL FINAL, después de la definición del
              instrumento (Rúbrica/Lista de cotejo). La lectura del form es:
                1. ¿Es sumativa?  →  2. ¿Con qué instrumento?  →
                3. definición del instrumento  →  4. ¿Cuánto pesa?
              Si la respuesta a (1) es "No", (4) desaparece (no aplica).

              Además de `esEvaluativa`, (4) también depende del `metodoCalculo`
              de la unidad temática elegida — mismo criterio de tres vías que
              `esPonderado` en `DialogAgregarActividad` (ver el comentario de
              ese componente), pero completo acá:
                - "Ponderado"     → el docente escribe el % (`ponderacion`).
                - "Suma de puntos" → el docente escribe el puntaje máximo
                  (`notaMaxima`) y el sistema calcula el % resultante — no
                  coexiste con `ponderacion`, son campos alternativos.
                - "Promedio simple" → ninguno de los dos aplica: cada
                  actividad pesa igual, no hay nada que repartir ni puntuar. */}
          <form.Subscribe selector={(state) => [state.values.esEvaluativa, state.values.unidad.id] as const}>
            {([esEvaluativa, unidadId]) => {
              if (!esEvaluativa) return null
              const metodoCalculo = unidades.find((u) => u.id === unidadId)?.metodoCalculo
              if (metodoCalculo === "Ponderado") {
                return (
                  <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <form.Field name="ponderacion">
                      {(ponderacionField) => (
                        <Field variant="outlined">
                          <FieldLabel htmlFor={ponderacionField.name}>
                            Ponderación (%){camposEfectivos?.ponderacion.requerido ? " *" : ""}
                          </FieldLabel>
                          <Input
                            id={ponderacionField.name}
                            type="number"
                            min={0}
                            max={100}
                            value={ponderacionField.state.value}
                            onChange={(e) => ponderacionField.handleChange(Number(e.target.value))}
                          />
                        </Field>
                      )}
                    </form.Field>
                  </div>
                )
              }
              if (metodoCalculo === "Suma de puntos") {
                return (
                  <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <form.Field name="notaMaxima">
                      {(notaMaximaField) => (
                        <Field variant="outlined">
                          <FieldLabel htmlFor={notaMaximaField.name}>
                            Puntaje máximo{camposEfectivos?.ponderacion.requerido ? " *" : ""}
                          </FieldLabel>
                          <Input
                            id={notaMaximaField.name}
                            type="number"
                            min={0}
                            value={notaMaximaField.state.value ?? ""}
                            onChange={(e) =>
                              notaMaximaField.handleChange(e.target.value === "" ? undefined : Number(e.target.value))
                            }
                          />
                        </Field>
                      )}
                    </form.Field>
                  </div>
                )
              }
              return null
            }}
          </form.Subscribe>
        </>
      )}
    </Card>
  )
}

/**
 * El instrumento de evaluación decide qué editor mostrar: "Lista de
 * cotejo" → `ListaCotejoSection`, "Escala de valoración" →
 * `EscalaValoracionSection`, cualquier otro valor (Rúbrica, Rúbrica
 * analítica, Prueba escrita, Autoevaluación, "—", …) cae en
 * `RubricasSection`. Los tres comparten estructura de datos
 * independiente (`rubrica`, `listaCotejo` y `escalaValoracion` son
 * fields separados del `Actividad`), así que cambiar de instrumento no
 * pierde lo cargado en los otros: si el usuario prueba "Lista de
 * cotejo" y vuelve a "Rúbrica", sus criterios siguen ahí.
 */
function InstrumentoEvaluacionSection({
  form,
  unidades,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
}) {
  return (
    <form.Subscribe selector={(state) => state.values.instrumento}>
      {(instrumento) =>
        instrumento === "Lista de cotejo" ? (
          <ListaCotejoSection form={form} />
        ) : instrumento === "Escala de valoración" ? (
          <EscalaValoracionSection form={form} unidades={unidades} />
        ) : instrumento === "Otro" ? (
          <InstrumentoPersonalizadoSection form={form} unidades={unidades} />
        ) : (
          <RubricasSection form={form} />
        )
      }
    </form.Subscribe>
  )
}

/**
 * Editor de la lista de cotejo: grilla de 2 columnas de ítems, cada uno
 * con su descripción y —cuando la actividad es sumativa— un campo de
 * ponderación al lado (mockup: "Ítem 1" / "Ítem 2" con "Descripción del
 * ítem" debajo del título; el % aparece junto a la descripción solo si
 * `esEvaluativa`). Estructura paralela a `RubricasSection`: mismo header
 * con botón "+" para agregar, mismo empty state.
 */
function ListaCotejoSection({ form }: { form: FormActividad }) {
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Definición Lista de Cotejo</h3>
        <Button
          variant="fill"
          color="primary"
          size="icon-sm"
          type="button"
          aria-label="Agregar ítem"
          onClick={() => {
            const listaCotejo = form.getFieldValue("listaCotejo") as ListaCotejo
            form.setFieldValue("listaCotejo", {
              ...listaCotejo,
              items: [...listaCotejo.items, { id: cryptoId(), descripcion: "" }],
            })
          }}
        >
          <PlusCircleIcon />
        </Button>
      </div>

      {/* Mismo flag que gobierna la ponderación de la rúbrica: un ítem
          de lista de cotejo solo pondera si la actividad es sumativa. */}
      <form.Subscribe selector={(state) => state.values.esEvaluativa}>
        {(esEvaluativa) => (
          <form.Field name="listaCotejo">
            {(field) => {
              const listaCotejo = field.state.value as ListaCotejo
              if (listaCotejo.items.length === 0) {
                return null
              }
              return (
                <div className="grid gap-4 sm:grid-cols-2">
                  {listaCotejo.items.map((item, index) => (
                    <ListaCotejoItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      esEvaluativa={esEvaluativa}
                      onChange={(next) => {
                        const current = field.state.value as ListaCotejo
                        const nextItems = current.items.slice()
                        nextItems[index] = next
                        field.handleChange({ ...current, items: nextItems })
                      }}
                      onRemove={() => {
                        const current = field.state.value as ListaCotejo
                        const nextItems = current.items.slice()
                        nextItems.splice(index, 1)
                        field.handleChange({ ...current, items: nextItems })
                      }}
                    />
                  ))}
                </div>
              )
            }}
          </form.Field>
        )}
      </form.Subscribe>
    </Card>
  )
}

/**
 * Card de un ítem de la lista de cotejo. `esEvaluativa` decide si se
 * muestra el campo "Puntaje" al lado de la descripción — mismo
 * patrón que el input por-nivel de `CriterioItem` en la rúbrica: el
 * campo aparece/desaparece según el flag, no se deshabilita (no aplica,
 * no es que falte llenar algo).
 */
function ListaCotejoItemCard({
  item,
  index,
  esEvaluativa,
  onChange,
  onRemove,
}: {
  item: ListaCotejoItem
  index: number
  esEvaluativa: boolean
  onChange: (next: ListaCotejoItem) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Ítem {index + 1}</h4>
        <Button
          variant="ghost"
          color="neutral"
          size="icon-sm"
          type="button"
          aria-label={`Quitar ítem ${index + 1}`}
          onClick={onRemove}
        >
          <TrashIcon />
        </Button>
      </div>

      {/* Descripción + ponderación en la misma fila: `flex-1` en la
          descripción para que absorba el ancho sobrante, `w-36 shrink-0`
          en la ponderación —ancho subido de `w-24`: a 96px el label
          "Puntaje" quedaba apretado contra el borde del campo—
          para que no se comprima con textos largos. Sin `esEvaluativa`
          el campo de ponderación no se monta —no queda un hueco vacío
          al lado del textarea. */}
      <div className="mt-3 flex items-start gap-3">
        <Field variant="outlined" className="min-w-0 flex-1">
          <FieldLabel htmlFor={`${item.id}-descripcion`}>Descripción del ítem</FieldLabel>
          <Textarea
            id={`${item.id}-descripcion`}
            className={TEXTAREA_OUTLINED}
            rows={2}
            value={item.descripcion}
            onChange={(e) => onChange({ ...item, descripcion: e.target.value })}
          />
        </Field>

        {esEvaluativa && (
          <Field variant="outlined" className="w-36 shrink-0">
            <FieldLabel htmlFor={`${item.id}-ponderacion`}>Puntaje</FieldLabel>
            <Input
              id={`${item.id}-ponderacion`}
              type="number"
              min={0}
              max={100}
              value={item.ponderacion ?? ""}
              onChange={(e) => {
                const raw = e.target.value
                // string vacío → `undefined`, no `0`: evita un valor
                // "fantasma" mientras el usuario borra para reescribir.
                onChange({ ...item, ponderacion: raw === "" ? undefined : Number(raw) })
              }}
            />
          </Field>
        )}
      </div>
    </div>
  )
}

/**
 * Editor de la escala de valoración. Arranca con "Criterios generales":
 * qué se evalúa (texto libre) y con qué TIPO de escala —Numérica o
 * Cualitativa, radio group de shadcn (`RadioGroup`/`RadioGroupItem`),
 * mismo patrón que "¿Aplica la aprobación por promedio?" en
 * `tab-promotion-criteria.tsx`—. El resto del editor se ramifica según
 * esa elección:
 * - "Numérica": rango `valorMinimo`/`valorMaximo` + un textarea de
 *   "Interpretación de rangos" (texto libre — qué significa cada tramo).
 * - "Cualitativa": "Definiciones cualitativas" — la lista de niveles
 *   nombrados (Bajo/Medio/Alto/…). El `nombre` es un input editable
 *   (a diferencia del nivel de un criterio de rúbrica, donde queda fijo
 *   al crearlo): el docente puede renombrar la escala por defecto a la
 *   que use su institución. Cuando la actividad es sumativa, cada nivel
 *   pondera individualmente al lado de su descripción — mismo patrón
 *   que los niveles intermedios de `CriterioItem`.
 * Al cambiar "Escala" a Cualitativa por primera vez (`niveles` vacío),
 * se siembran los 3 niveles por defecto —Bajo/Medio/Alto— de una: el
 * usuario ve algo que completar en vez de una lista vacía + un paso
 * extra para crear cada nivel. El botón "+" del header agrega más
 * niveles después de esos tres, tomando el siguiente nombre de
 * `NIVELES_CUALITATIVOS_DEFAULT` o cayendo a "Nivel N".
 */
const NIVELES_CUALITATIVOS_DEFAULT = ["Bajo", "Medio", "Alto"]

function nextNivelCualitativoNombre(existingCount: number): string {
  return NIVELES_CUALITATIVOS_DEFAULT[existingCount] ?? `Nivel ${existingCount + 1}`
}

/**
 * Punto de partida de la Escala Cualitativa: si la actividad está vinculada
 * a una unidad que YA tiene su propia Rúbrica definida (pestaña "Rúbricas"
 * de la unidad, `unidad.criterios` — cada uno con un nivel de desempeño por
 * columna, ver `CriterioUnidad`), se reusan esos MISMOS nombres de nivel
 * ("Bajo"/"Básico"/"Alto"/"Superior" o los que traiga la escala de
 * valoración configurada para el nivel educativo de la unidad) y, como
 * descripción, lo que el docente ya escribió ahí para cada nivel —juntando
 * las de todos los criterios cuando hay más de uno, así no arranca en
 * blanco algo que ya se definió a nivel unidad. Es solo un DRAFT: son
 * niveles independientes de los de la unidad, así que el docente puede
 * editarlos o borrarlos sin que eso toque la Rúbrica de la unidad.
 *
 * Sin unidad, o con una unidad que todavía no tiene criterios cargados, cae
 * al default fijo `NIVELES_CUALITATIVOS_DEFAULT`.
 */
function nivelesCualitativosDesdeUnidad(
  unidad: UnidadTematica | undefined,
): { nombre: string; descripcion: string }[] | null {
  const primerCriterio = unidad?.criterios[0]
  if (!primerCriterio || primerCriterio.niveles.length === 0) return null
  return primerCriterio.niveles.map((nivel) => {
    const descripciones = unidad!.criterios
      .map((criterio) => criterio.niveles.find((n) => n.nombre === nivel.nombre)?.descripcion.trim())
      .filter((descripcion): descripcion is string => !!descripcion)
    return { nombre: nivel.nombre, descripcion: descripciones.join(" / ") }
  })
}

function EscalaValoracionSection({
  form,
  unidades,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
}) {
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id) || undefined
  const unidadActual = unidades.find((u) => u.id === unidadId)

  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Definición Escala de Valoración</h3>

      <form.Subscribe selector={(state) => state.values.esEvaluativa}>
        {(esEvaluativa) => (
          <form.Field name="escalaValoracion">
            {(field) => {
              const escala = field.state.value as EscalaValoracion

              function updateEscala(patch: Partial<EscalaValoracion>) {
                field.handleChange({ ...escala, ...patch })
              }

              function updateNivel(nIndex: number, patch: Partial<Nivel>) {
                const next = escala.niveles.slice()
                next[nIndex] = { ...next[nIndex]!, ...patch }
                field.handleChange({ ...escala, niveles: next })
              }

              function removeNivel(nIndex: number) {
                const next = escala.niveles.slice()
                next.splice(nIndex, 1)
                field.handleChange({ ...escala, niveles: next })
              }

              return (
                <>
                  <div>
                    <h4 className="mb-3 text-sm font-semibold">Criterios generales</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field variant="outlined">
                        <FieldLabel htmlFor={`${escala.id}-criterios-generales`}>
                          Criterios generales (separados por coma)
                        </FieldLabel>
                        <Input
                          id={`${escala.id}-criterios-generales`}
                          placeholder="Criterio A, Criterio B"
                          value={escala.criteriosGenerales}
                          onChange={(e) => updateEscala({ criteriosGenerales: e.target.value })}
                        />
                      </Field>

                      <Field variant="outlined">
                        <FieldLabel>Escala</FieldLabel>
                        <RadioGroup
                          className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
                          value={escala.tipo}
                          onValueChange={(value) => {
                            const tipo = value as EscalaValoracionTipo
                            // Solo siembra si todavía no hay niveles cargados:
                            // si el usuario ya armó su propia lista (o volvió
                            // de Numérica a Cualitativa con niveles previos),
                            // no se pisa nada.
                            const niveles =
                              tipo === "Cualitativa" && escala.niveles.length === 0
                                ? (
                                    nivelesCualitativosDesdeUnidad(unidadActual) ??
                                    NIVELES_CUALITATIVOS_DEFAULT.map((nombre) => ({
                                      nombre,
                                      descripcion: "",
                                    }))
                                  ).map((nivel) => ({ id: cryptoId(), ...nivel }))
                                : escala.niveles
                            updateEscala({ tipo, niveles })
                          }}
                        >
                          <label className="flex items-center gap-2">
                            <RadioGroupItem value="Numérica" className="data-checked:bg-primary" />
                            Numérica
                          </label>
                          <label className="flex items-center gap-2">
                            <RadioGroupItem
                              value="Cualitativa"
                              className="data-checked:bg-primary"
                            />
                            Cualitativa
                          </label>
                        </RadioGroup>
                      </Field>
                    </div>

                    {escala.tipo === "Numérica" && (
                      <>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <Field variant="outlined">
                            <FieldLabel htmlFor={`${escala.id}-valor-minimo`}>
                              Valor mínimo
                            </FieldLabel>
                            <Input
                              id={`${escala.id}-valor-minimo`}
                              type="number"
                              placeholder="(ej. 1)"
                              value={escala.valorMinimo ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value
                                updateEscala({
                                  valorMinimo: raw === "" ? undefined : Number(raw),
                                })
                              }}
                            />
                          </Field>
                          <Field variant="outlined">
                            <FieldLabel htmlFor={`${escala.id}-valor-maximo`}>
                              Valor máximo
                            </FieldLabel>
                            <Input
                              id={`${escala.id}-valor-maximo`}
                              type="number"
                              placeholder="(ej. 5)"
                              value={escala.valorMaximo ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value
                                updateEscala({
                                  valorMaximo: raw === "" ? undefined : Number(raw),
                                })
                              }}
                            />
                          </Field>
                        </div>

                        <Field variant="outlined" className="mt-4">
                          <FieldLabel htmlFor={`${escala.id}-interpretacion`}>
                            Interpretación de rangos
                          </FieldLabel>
                          <Textarea
                            id={`${escala.id}-interpretacion`}
                            className={TEXTAREA_OUTLINED}
                            rows={3}
                            placeholder="Agregar"
                            value={escala.interpretacionRangos}
                            onChange={(e) =>
                              updateEscala({ interpretacionRangos: e.target.value })
                            }
                          />
                        </Field>
                      </>
                    )}

                    {escala.tipo === "Cualitativa" && (
                      <div className="mt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Definiciones cualitativas</h4>
                          <Button
                            variant="fill"
                            color="primary"
                            size="icon-sm"
                            type="button"
                            aria-label="Agregar definición cualitativa"
                            onClick={() => {
                              // Lista vacía (p. ej. una actividad que ya
                              // traía `tipo: "Cualitativa"` guardado, sin
                              // pasar por el `RadioGroup` de arriba): el "+"
                              // siembra todo el set por defecto de una, no
                              // un único nivel — mismo criterio que cambiar
                              // "Escala" a Cualitativa por primera vez.
                              if (escala.niveles.length === 0) {
                                const niveles = (
                                  nivelesCualitativosDesdeUnidad(unidadActual) ??
                                  NIVELES_CUALITATIVOS_DEFAULT.map((nombre) => ({
                                    nombre,
                                    descripcion: "",
                                  }))
                                ).map((nivel) => ({ id: cryptoId(), ...nivel }))
                                updateEscala({ niveles })
                                return
                              }
                              updateEscala({
                                niveles: [
                                  ...escala.niveles,
                                  {
                                    id: cryptoId(),
                                    nombre: nextNivelCualitativoNombre(escala.niveles.length),
                                    descripcion: "",
                                  },
                                ],
                              })
                            }}
                          >
                            <PlusCircleIcon />
                          </Button>
                        </div>

                        {escala.niveles.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            Esta escala todavía no tiene definiciones cualitativas.
                          </p>
                        ) : (
                          <ul className="flex flex-col gap-3">
                            {escala.niveles.map((nivel, nIndex) => (
                              <li
                                key={nivel.id}
                                className={cn(
                                  "grid items-start gap-3",
                                  esEvaluativa
                                    ? "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_9rem_auto]"
                                    : "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_auto]",
                                )}
                              >
                                {/* A diferencia del nivel de un criterio de
                                    rúbrica (`CriterioItem`, donde el nombre
                                    es texto estático fijado al crear el
                                    nivel), acá "Bajo"/"Medio"/"Alto" son un
                                    punto de partida editable: el docente
                                    puede renombrarlos a la escala que use
                                    su institución. */}
                                <Input
                                  variant="outlined"
                                  value={nivel.nombre}
                                  onChange={(e) => updateNivel(nIndex, { nombre: e.target.value })}
                                />
                                <Input
                                  variant="outlined"
                                  placeholder="Interpretación / descriptor"
                                  value={nivel.descripcion}
                                  onChange={(e) =>
                                    updateNivel(nIndex, { descripcion: e.target.value })
                                  }
                                />
                                {/* Ponderación por nivel — solo si la
                                    actividad es sumativa. Mismo patrón que
                                    los niveles intermedios de un criterio
                                    de rúbrica: cada definición pesa lo
                                    suyo, no la escala como un bloque único. */}
                                {esEvaluativa && (
                                  <Field variant="outlined">
                                    <FieldLabel htmlFor={`${nivel.id}-ponderacion`}>
                                      Puntaje
                                    </FieldLabel>
                                    <Input
                                      id={`${nivel.id}-ponderacion`}
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={nivel.ponderacion ?? ""}
                                      onChange={(e) => {
                                        const raw = e.target.value
                                        updateNivel(nIndex, {
                                          ponderacion: raw === "" ? undefined : Number(raw),
                                        })
                                      }}
                                    />
                                  </Field>
                                )}
                                <Button
                                  variant="ghost"
                                  color="neutral"
                                  size="icon-sm"
                                  type="button"
                                  aria-label={`Quitar nivel ${nivel.nombre}`}
                                  onClick={() => removeNivel(nIndex)}
                                >
                                  <TrashIcon />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )
            }}
          </form.Field>
        )}
      </form.Subscribe>
    </Card>
  )
}

/**
 * Definición de un instrumento personalizado — alternativa a `RubricasSection`
 * / `ListaCotejoSection` / `EscalaValoracionSection` cuando el docente elige
 * "Otro (personalizado)" en "Instrumento de evaluación". A diferencia de esos
 * tres (listas editables de criterios/ítems/niveles), acá es una ficha fija
 * de 5 campos: qué es el instrumento, qué evidencia se espera, cómo se
 * valora, y si exige adjuntar archivo y/o escribir una respuesta —los dos
 * checkboxes son independientes entre sí y del select de arriba.
 *
 * Mismo idioma visual que el resto del form: `Field variant="outlined"`
 * (label flotando sobre el borde) con placeholder adentro del control.
 *
 * "Método de valoración" reusa las mismas 3 opciones que el `instrumento`
 * de arriba (Rúbrica / Lista de cotejo / Escala de valoración) a propósito:
 * un instrumento personalizado igual necesita valorarse con la lógica de
 * uno de esos tres, así que elegir uno acá monta la MISMA sección de
 * definición (`RubricasSection` / `ListaCotejoSection` /
 * `EscalaValoracionSection`) que se vería si ese fuera el `instrumento`
 * elegido directamente — mismos campos, mismas reglas de negocio, el
 * mismo `rubrica`/`listaCotejo`/`escalaValoracion` del form.
 */
function InstrumentoPersonalizadoSection({
  form,
  unidades,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
}) {
  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Definición del instrumento personalizado</h3>

      <form.Field name="instrumentoPersonalizado">
        {(field) => {
          const value = field.state.value as InstrumentoPersonalizado
          function patch(next: Partial<InstrumentoPersonalizado>) {
            field.handleChange({ ...value, ...next })
          }
          return (
            <>
              <Field variant="outlined">
                <FieldLabel htmlFor="instrumentoPersonalizado-descripcion">
                  Descripción del instrumento
                </FieldLabel>
                <Input
                  id="instrumentoPersonalizado-descripcion"
                  placeholder="Agregar descripción breve"
                  value={value.descripcion}
                  onChange={(e) => patch({ descripcion: e.target.value })}
                />
              </Field>

              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <Field variant="outlined">
                  <FieldLabel htmlFor="instrumentoPersonalizado-tipo-evidencia">
                    Tipo de evidencia esperada
                  </FieldLabel>
                  <Select
                    value={value.tipoEvidenciaEsperada}
                    onValueChange={(v) => v && patch({ tipoEvidenciaEsperada: v })}
                  >
                    <SelectTrigger id="instrumentoPersonalizado-tipo-evidencia">
                      <SelectValue placeholder="Seleccione">
                        {(v) => TIPO_EVIDENCIA_ESPERADA_LABELS[v as string] ?? "Seleccione"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Archivo">Archivo (PDF, Word, imagen, otro)</SelectItem>
                      <SelectItem value="Enlace">Enlace (video, blog, presentación)</SelectItem>
                      <SelectItem value="Observación directa">Observación directa</SelectItem>
                      <SelectItem value="Registro en campo">Registro en campo</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field variant="outlined">
                  <FieldLabel htmlFor="instrumentoPersonalizado-metodo-valoracion">
                    Método de valoración
                  </FieldLabel>
                  <Select
                    value={value.metodoValoracion}
                    onValueChange={(v) =>
                      v &&
                      patch({
                        metodoValoracion: v as InstrumentoPersonalizado["metodoValoracion"],
                      })
                    }
                  >
                    <SelectTrigger id="instrumentoPersonalizado-metodo-valoracion">
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rúbrica">Rúbrica</SelectItem>
                      <SelectItem value="Lista de cotejo">Lista de cotejo</SelectItem>
                      <SelectItem value="Escala de valoración">Escala de valoración</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Va entre "Método de valoración" y los checkboxes: el
                  método elegido monta acá mismo su definición completa
                  (misma sección/mismos datos que si fuera el `instrumento`
                  de arriba), antes de las preguntas de entrega. */}
              {value.metodoValoracion === "Rúbrica" ? (
                <RubricasSection form={form} />
              ) : value.metodoValoracion === "Lista de cotejo" ? (
                <ListaCotejoSection form={form} />
              ) : value.metodoValoracion === "Escala de valoración" ? (
                <EscalaValoracionSection form={form} unidades={unidades} />
              ) : null}

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.requiereArchivo}
                    onCheckedChange={(next) => patch({ requiereArchivo: next === true })}
                  />
                  El estudiante debe adjuntar un archivo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.requiereRespuestaTexto}
                    onCheckedChange={(next) => patch({ requiereRespuestaTexto: next === true })}
                  />
                  El estudiante debe escribir una respuesta (texto)
                </label>
              </div>
            </>
          )
        }}
      </form.Field>
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
            const rubrica = form.getFieldValue("rubrica") as { id: number; criterios: Criterio[] }
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

      {/* Leemos `esEvaluativa` del store del form para decidir si los
          criterios muestran el input de ponderación por nivel. Es la
          misma fuente que usa `EvaluacionSection` para mostrar/ocultar
          "Puntaje" — un solo flag gobierna toda la rúbrica. */}
      <form.Subscribe selector={(state) => state.values.esEvaluativa}>
        {(esEvaluativa) => (
          <form.Field name="rubrica">
            {(field) => {
              const rubrica = field.state.value as { id: number; criterios: Criterio[] }
              if (rubrica.criterios.length === 0) {
                return null
              }
              return (
                <ul className="flex flex-col gap-6">
                  {rubrica.criterios.map((criterio, index) => (
                    <CriterioItem
                      key={criterio.id}
                      criterio={criterio}
                      index={index}
                      esEvaluativa={esEvaluativa}
                      onChange={(next) => {
                        const current = field.state.value as { id: number; criterios: Criterio[] }
                        const next_criterios = current.criterios.slice()
                        next_criterios[index] = next
                        field.handleChange({ ...current, criterios: next_criterios })
                      }}
                      onRemove={() => {
                        const current = field.state.value as { id: number; criterios: Criterio[] }
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
        )}
      </form.Subscribe>
    </Card>
  )
}

function CriterioItem({
  criterio,
  index,
  esEvaluativa,
  onChange,
  onRemove,
}: {
  criterio: Criterio
  index: number
  /**
   * Si la actividad es sumativa, cada nivel intermedio renderiza un
   * input numérico de ponderación al lado del textarea de descripción
   * (mockup: "al lado de las descripciones de los subniveles parecera
   * un input para ponderacion"). Para una actividad formativa el input
   * no se muestra — el peso del nivel no aplica si no pondera nota.
   */
  esEvaluativa: boolean
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
          placeholder="Ej: Expresión oral de ideas y experiencias"
          value={criterio.nombre}
          onChange={(e) => onChange({ ...criterio, nombre: e.target.value })}
        />
      </Field>

      {/* `Excelente` va como label estático a la izquierda del textarea:
          la captura lo muestra pegado al borde izquierdo, no flotando
          dentro del outline del textarea. La columna del label va con
          `min-w-28` para que todas las filas del criterio (Excelente +
          niveles) compartan el mismo ancho de label y los textareas
          queden alineados a la derecha.

          "Excelente" es, en los hechos, el nivel más alto del criterio
          —solo que vive como field propio (`criterio.excelente`) y no
          dentro de `niveles[]`— así que cuando la actividad es sumativa
          recibe el mismo campo de ponderación que cada nivel intermedio,
          en la misma 4ª columna. Mismo `cn` condicional que la lista de
          niveles de abajo, para que los dos bloques usen exactamente el
          mismo grid template y las columnas queden alineadas entre sí.

          Solo se muestra con contenido: antes el tachito de la derecha
          solo vaciaba el texto (`excelente: ""`) pero la fila —label +
          textarea vacío + tachito— seguía ahí, así que "eliminar" no se
          sentía como eliminar nada. Un criterio recién creado tampoco
          arranca con este bloque a la vista; para agregar un nivel
          "Excelente" alcanza con escribirlo en "Agregar nivel" de abajo,
          que ya es exactamente la misma fila (label + descripción +
          puntaje + tachito que si borra de verdad). */}
      {(criterio.excelente !== "" || criterio.excelentePonderacion != null) && (
        <div
          className={cn(
            "mt-4 grid items-start gap-3",
            esEvaluativa
              ? "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_9rem_auto]"
              : "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_auto]",
          )}
        >
          <p className="pt-2 text-sm font-semibold">Excelente</p>
          <Textarea
            className={TEXTAREA_OUTLINED}
            rows={2}
            placeholder="Describe el desempeño esperado en este nivel"
            value={criterio.excelente}
            onChange={(e) => onChange({ ...criterio, excelente: e.target.value })}
          />
          {/* Input de ponderación de "Excelente" — mismo campo y mismo
              manejo del `undefined` que el de cada nivel intermedio (ver
              más abajo): string vacío no se guarda como `0`. */}
          {esEvaluativa && (
            <Field variant="outlined">
              <FieldLabel htmlFor={`${criterio.id}-excelente-ponderacion`}>
                Puntaje
              </FieldLabel>
              <Input
                id={`${criterio.id}-excelente-ponderacion`}
                type="number"
                min={0}
                max={100}
                value={criterio.excelentePonderacion ?? ""}
                onChange={(e) => {
                  const raw = e.target.value
                  onChange({
                    ...criterio,
                    excelentePonderacion: raw === "" ? undefined : Number(raw),
                  })
                }}
              />
            </Field>
          )}
          {/* Tachito a la derecha del textarea — quita el bloque entero
              (texto Y puntaje), no solo el texto. */}
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            type="button"
            aria-label="Quitar excelente"
            onClick={() => onChange({ ...criterio, excelente: "", excelentePonderacion: undefined })}
          >
            <TrashIcon />
          </Button>
        </div>
      )}

      {/* Lista de niveles ya creados. Cada nivel sigue el mismo patrón que
          el bloque "Excelente" de arriba: el `nombre` (la etiqueta que el
          usuario tipeó al confirmar con "Agregar nivel") va como label
          estático a la izquierda —estilo "Bueno", "Aceptable"—, y la
          `descripcion` se edita en un `Textarea` al medio. El tachito va
          a la derecha, igual que en el bloque de "Excelente".

          Si la actividad es sumativa, se agrega una 4ª columna entre el
          textarea y el tachito con un input numérico de ponderación
          (mockup: input al lado de las descripciones de los subniveles).
          El grid se construye con `cn` para que el template cambie según
          el flag —así el textarea y el input quedan alineados a la
          derecha con un `gap` consistente. */}
      <ul className="mt-4 flex flex-col gap-3">
        {criterio.niveles.map((nivel, nIndex) => (
          <li
            key={nivel.id}
            className={cn(
              "grid items-start gap-3",
              esEvaluativa
                ? "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_9rem_auto]"
                : "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_auto]",
            )}
          >
            <p className="pt-2 text-sm font-semibold">{nivel.nombre}</p>
            <Textarea
              className={TEXTAREA_OUTLINED}
              rows={2}
              placeholder="Describe el desempeño esperado en este nivel"
              value={nivel.descripcion}
              onChange={(e) => {
                const next = criterio.niveles.slice()
                next[nIndex] = { ...nivel, descripcion: e.target.value }
                onChange({ ...criterio, niveles: next })
              }}
            />
            {/* Input de ponderación por nivel — solo cuando la actividad es
                sumativa. Mismo idioma visual que la ponderación del
                criterio de arriba (size="sm" h-10, número con `min={0}`
                `max={100}`, sufijo "%"). El valor es `nivel.ponderacion`
                (opcional), así que al renderizarlo convertimos `undefined`
                a "" para que el input no muestre "NaN". */}
            {esEvaluativa && (
              <Field variant="outlined">
                <FieldLabel htmlFor={`${nivel.id}-ponderacion`}>
                  Puntaje
                </FieldLabel>
                <Input
                  id={`${nivel.id}-ponderacion`}
                  type="number"
                  min={0}
                  max={100}
                  value={nivel.ponderacion ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value
                    const next = criterio.niveles.slice()
                    next[nIndex] = {
                      ...nivel,
                      // string vacío → `undefined` para mantener el campo
                      // opcional sin valores "fantasma" (0 cuando el
                      // usuario apenas está editando).
                      ponderacion: raw === "" ? undefined : Number(raw),
                    }
                    onChange({ ...criterio, niveles: next })
                  }}
                />
              </Field>
            )}
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
        <FieldLabel>Puntaje</FieldLabel>
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

function AdaptacionesSection({
  form,
  estudiantes,
}: {
  form: FormActividad
  estudiantes: Estudiante[]
}) {
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
                estudiantesIds: [],
              },
            ])
          // Header persistente: el botón "+" vive SIEMPRE acá, mismo lugar
          // y mismo estilo, tenga la actividad cero adaptaciones o diez.
          // Antes había dos botones distintos —uno icon-only arriba cuando
          // la lista estaba vacía, otro de texto "Agregar otra adaptación"
          // al pie una vez que había al menos una— y el primero
          // desaparecía apenas se agregaba la primera adaptación: el
          // control se corría de lugar justo cuando el usuario acababa de
          // tocarlo. Un solo botón, una sola posición.
          return (
            <>
              <div className="flex items-center justify-between rounded-md border bg-card p-3">
                <p className="text-sm font-semibold">
                  {adaptaciones.length === 0
                    ? "Si aplica, registre las adaptaciones"
                    : "Adaptaciones registradas"}
                </p>
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

              {adaptaciones.length > 0 && (
                <ul className="mt-3 flex flex-col gap-3">
                  {adaptaciones.map((adapt, aIndex) => (
                    <AdaptacionItem
                      key={aIndex}
                      index={aIndex}
                      adaptacion={adapt}
                      estudiantes={estudiantes}
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
                </ul>
              )}
            </>
          )
        }}
      </form.Field>
    </Card>
  )
}

/**
 * `nombres`/`apellidos` en el mock viven en MAYÚSCULAS (así arma los
 * documentos oficiales `mocks/db/calificaciones.ts`), pero el checklist
 * de estudiantes se lee como cualquier lista de nombres propios — Título
 * Caso, no gritado. Es un ajuste solo de presentación acá; no toca el
 * dato guardado ni a otros consumidores (la tabla de calificaciones sigue
 * mostrando el nombre tal cual viene).
 */
function toTitleCase(value: string): string {
  return value.toLowerCase().replace(/\p{L}+/gu, (word) => word[0]!.toUpperCase() + word.slice(1))
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
  estudiantes,
  onChange,
  onRemove,
}: {
  index: number
  adaptacion: Adaptacion
  estudiantes: Estudiante[]
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
            <SelectValue placeholder="Seleccione">
              {(value) =>
                value === "__none__"
                  ? "Seleccione"
                  : (ADAPTACION_TIPO_LABELS[value as string] ?? (value as string))
              }
            </SelectValue>
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
            <SelectValue placeholder="Seleccione">
              {(value) => VERSION_MODIFICADA_LABELS[value as string] ?? "Seleccione"}
            </SelectValue>
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
              <SelectValue placeholder="Seleccione">
                {(value) => PLANTILLA_BIBLIOTECA_LABELS[value as string] ?? "Seleccione"}
              </SelectValue>
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
          onValueChange={(value) => {
            const next = (value ?? "") as Adaptacion["aplicaA"]
            onChange({
              ...adaptacion,
              aplicaA: next,
              // Al salir de "Estudiantes específicos" la selección deja
              // de tener sentido —"A todo el grupo" no distingue a
              // nadie— así que se limpia para no arrastrar un subconjunto
              // viejo si el usuario vuelve a elegir "específicos" después.
              estudiantesIds: next === "Estudiantes específicos" ? adaptacion.estudiantesIds : [],
            })
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione">
              {(value) => (value === "__none__" ? "Seleccione" : (value as string))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Seleccione</SelectItem>
            <SelectItem value="A todo el grupo">A todo el grupo</SelectItem>
            <SelectItem value="Estudiantes específicos">Estudiantes específicos</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* Checklist de estudiantes — solo cuando la adaptación aplica a
          "Estudiantes específicos". Mismo idioma que el resto del form:
          `Field variant="outlined"` con el label flotando en el borde
          superior, acá conteniendo una lista vertical de checkboxes en
          vez de un input. Vacío si el grupo todavía no tiene estudiantes
          cargados (actividad recién creada, sin `useCalificacionesQuery`
          resuelto todavía). */}
      {adaptacion.aplicaA === "Estudiantes específicos" && (
        <Field variant="outlined" className="mt-4">
          <FieldLabel>Seleccionar estudiantes (múltiple)</FieldLabel>
          {estudiantes.length === 0 ? (
            <p className="text-muted-foreground px-1 py-2 text-sm">
              Este grupo todavía no tiene estudiantes cargados.
            </p>
          ) : (
            <div className="flex flex-col gap-1 py-1">
              {estudiantes.map((estudiante) => {
                const checked = adaptacion.estudiantesIds.includes(estudiante.id)
                return (
                  <label
                    key={estudiante.id}
                    className="flex items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) =>
                        onChange({
                          ...adaptacion,
                          estudiantesIds: next
                            ? [...adaptacion.estudiantesIds, estudiante.id]
                            : adaptacion.estudiantesIds.filter((id) => id !== estudiante.id),
                        })
                      }
                    />
                    {toTitleCase(`${estudiante.nombres} ${estudiante.apellidos}`)}
                  </label>
                )
              })}
            </div>
          )}
        </Field>
      )}
    </li>
  )
}

/**
 * Seguimiento solo tiene sentido cuando la actividad ya tiene alguna
 * adaptación curricular registrada —"generar evidencias" y "validación del
 * coordinador" son parte del seguimiento DE esas adaptaciones—, así que la
 * sección entera desaparece (no se deshabilita) mientras `adaptaciones` esté
 * vacío, igual que "Ponderación" desaparece cuando la actividad no es
 * sumativa.
 */
function SeguimientoSection({ form }: { form: FormActividad }) {
  return (
    <form.Subscribe selector={(state) => state.values.adaptaciones.length > 0}>
      {(hasAdaptaciones) =>
        !hasAdaptaciones ? null : (
          <Card className="gap-4 p-4">
            <h3 className="text-base font-semibold">Seguimiento</h3>

            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <form.Field name="generaEvidencias">
          {(field) => (
            <>
              <Field variant="outlined">
                <FieldLabel htmlFor={field.name}>¿Genera evidencias?</FieldLabel>
                <Select
                  value={field.state.value ? "si" : "no"}
                  onValueChange={(value) => field.handleChange(value === "si")}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue>{(value) => (value === "si" ? "Sí" : "No")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sí</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {/* Deshabilitado (no oculto) cuando no genera evidencias: a
                  diferencia de "Ponderación" (que no aplica y desaparece),
                  acá el campo sigue siendo parte de la ficha —solo no hay
                  nada que elegir todavía—, así que se ve pero no se puede
                  tocar. */}
              <form.Field name="tipoEvidencia">
                {(tipoField) => (
                  <Field variant="outlined">
                    <FieldLabel htmlFor={tipoField.name}>Tipo de evidencia</FieldLabel>
                    <Select
                      value={tipoField.state.value}
                      onValueChange={(v) => v && tipoField.handleChange(v)}
                      disabled={!field.state.value}
                    >
                      <SelectTrigger id={tipoField.name}>
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
            </>
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
                  <SelectValue>{(value) => (value === "si" ? "Sí" : "No")}</SelectValue>
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
              placeholder="Ej: Reforzar con ejemplos del contexto local, revisar individualmente la participación de los estudiantes con bajo rendimiento…"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      </form.Field>
          </Card>
        )
      }
    </form.Subscribe>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Id numérico aleatorio para items nuevos (recursos/criterios/niveles) que
 *  todavía no pasaron por el backend — que es quien asigna el PK real. */
function cryptoId(): number {
  return Math.floor(Math.random() * 1_000_000_000)
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
  gradoId,
  asignaturaId,
}: {
  onCreate: (data: {
    nombre: string
    contenidos: string[]
    objetivos: string[]
    descripcion: string
    enunciadosDba: { id: number; text: string }[]
    metodoCalculo: MetodoCalculo
  }) => Promise<void>
  /** Se aplica al `Button` del trigger para encadenarlo visualmente con
   * un control adyacente (split-button): típico `rounded-l-none border-l-0`
   * para pegarse a un `Select`/`Input` por la izquierda. */
  className?: string
  /** Grado/Asignatura de la actividad que abre este popover — la unidad
   *  nueva nace con los mismos (una unidad se identifica por esos dos, ver
   *  `IdentificacionSection`), así que acá no se vuelven a pedir. También
   *  gobiernan "Derechos" (`useEnunciadosDbaQuery`) y si se puede guardar:
   *  sin ellos no hay contra qué resolver el referente de la unidad. */
  gradoId: number | undefined
  asignaturaId: number | undefined
}) {
  const [open, setOpen] = React.useState(false)
  const [nombre, setNombre] = React.useState("")
  const [contenidos, setContenidos] = React.useState<string[]>([])
  const [objetivos, setObjetivos] = React.useState<string[]>([])
  const [descripcion, setDescripcion] = React.useState("")
  const [enunciadosDba, setEnunciadosDba] = React.useState<{ id: number; text: string }[]>([])
  const [metodoCalculo, setMetodoCalculo] = React.useState<MetodoCalculo>("Ponderado")
  const [isSaving, setIsSaving] = React.useState(false)

  const { enunciados: enunciadosDisponibles, isPending: isPendingEnunciados } = useEnunciadosDbaQuery(
    gradoId,
    asignaturaId,
  )

  const hasGradoAsignatura = gradoId != null && asignaturaId != null

  const reset = () => {
    setNombre("")
    setContenidos([])
    setObjetivos([])
    setDescripcion("")
    setEnunciadosDba([])
    setMetodoCalculo("Ponderado")
  }

  // Async: `onCreate` pega contra el backend real (`POST /planeador/unidades`).
  // Si falla (el toast global del interceptor ya avisa del error), el
  // popover se queda abierto con lo tipeado — cerrarlo/limpiarlo igual habría
  // hecho parecer que la unidad se creó cuando no.
  const guardar = async () => {
    if (!nombre.trim() || !hasGradoAsignatura || isSaving) return
    setIsSaving(true)
    try {
      await onCreate({ nombre: nombre.trim(), contenidos, objetivos, descripcion, enunciadosDba, metodoCalculo })
      reset()
      setOpen(false)
    } finally {
      setIsSaving(false)
    }
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
        // `gap-0` anula el `gap-4` parejo que trae `PopoverContent` por
        // default: acá el espaciado lo maneja cada bloque a mano (título,
        // scroll, footer), no una grilla uniforme de hijos sueltos —así
        // el título y el botón "Guardar" quedan fijos y solo el cuerpo
        // largo (contenidos/objetivos/DBA) scrollea por dentro en vez de
        // estirar el popover fuera de la pantalla.
        className="w-96 gap-0 p-0"
      >
        <h3 className="border-b px-4 py-3 text-base font-semibold">
          Crear nueva unidad temática
        </h3>

        {!hasGradoAsignatura && (
          <div className="border-blue-stroke bg-blue-22 text-blue m-4 flex items-start gap-2 rounded-md border p-3 text-xs">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            Elegí Grado/Grupo y Asignatura de la actividad primero.
          </div>
        )}

        <div className="scrollbar-slim flex max-h-[60vh] flex-col gap-5 overflow-y-auto p-4">
          <Field variant="outlined">
            <FieldLabel>Nombre de la unidad</FieldLabel>
            <Input
              placeholder="Agregar"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
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

          {/* Objetivos/Contenidos agrupados en una sola sección con
              separador: son las dos listas "libres" de la unidad, antes de
              DBA (que sí depende de un catálogo) y del método de cálculo
              (que es una decisión aparte, de negocio). */}
          <div className="flex flex-col gap-4 border-t pt-4">
            <ListaAgregableField
              label="Objetivos específicos relacionados"
              items={objetivos}
              onChange={setObjetivos}
            />

            <ListaAgregableField
              label="Contenidos temáticos vinculados"
              items={contenidos}
              onChange={setContenidos}
            />
          </div>

          <div className="border-t pt-4">
            <ListaAgregableCajaSelect
              title="Derechos Básicos de Aprendizaje"
              description="Selecciona los enunciados de DBA asociados a esta unidad."
              columnLabel="Enunciados"
              items={enunciadosDba}
              options={enunciadosDisponibles}
              onChange={setEnunciadosDba}
              disabled={!hasGradoAsignatura}
              isPending={isPendingEnunciados}
            />
          </div>

          <Field variant="outlined" className="border-t pt-4">
            <FieldLabel>Método de cálculo</FieldLabel>
            <Select
              value={metodoCalculo}
              onValueChange={(v) => v && setMetodoCalculo(v as MetodoCalculo)}
            >
              <SelectTrigger>
                <SelectValue>{(v) => METODO_CALCULO_INFO[v as MetodoCalculo]?.label ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {METODO_CALCULO_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {METODO_CALCULO_INFO[option].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex justify-end border-t p-4">
          <Button
            variant="fill"
            color="primary"
            size="sm"
            type="button"
            onClick={guardar}
            disabled={!nombre.trim() || isSaving}
          >
            {isSaving && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            {isSaving ? "Guardando..." : "Guardar unidad"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
