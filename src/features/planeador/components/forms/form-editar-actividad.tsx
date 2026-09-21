import { useEffect, useMemo, useRef, useState } from "react"
import * as React from "react"
import { useForm, useSelector } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { useQueries } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/date-picker"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { parseDateValue, formatDateValue } from "@/lib/date-value"
import { toDigitsOrRangeInput, toPositiveDigitsInput } from "@/lib/text-input"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useUnidadDetalleQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUnidadCriteriosQuery } from "@/features/planeador/api/query/use-unidad-criterios-query"
import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import { useActividadDetalleQuery } from "@/features/planeador/api/query/use-actividad-detalle-query"
import {
  instrumentoLabelFromReferente,
  resolveInstrumentoLabel,
  useUnidadesTabsQuery,
} from "@/features/planeador/api/query/use-unidades-tabs-query"
import { UNIDAD_TAB_FALLBACK } from "@/features/planeador/components/planeador-tabs"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import {
  useConfiguracionActividadQuery,
  useConfiguracionContextoActividadQuery,
} from "@/features/planeador/api/query/use-configuracion-actividad-query"
import { useProgramacionActividadQuery } from "@/features/planeador/api/query/use-programacion-actividad-query"
import {
  useReferenteCurricularQuery,
  referenteCurricularQueryOptions,
} from "@/features/planeador/api/query/use-referente-curricular-query"
import { useDocenteGruposQuery } from "@/features/planeador/api/query/use-docente-grupos-query"
import { useDocenteGradoAsignaturaQuery } from "@/features/planeador/api/query/use-docente-grado-asignatura-query"
import { useActividadMatriculasGrupoQuery } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import { EstudiantesMultiSelect } from "@/features/planeador/components/forms/estudiantes-multi-select"
import { ActividadRecuperarCascada } from "@/features/planeador/components/forms/actividad-recuperar-cascada"
import { useStudyPlanSubjectLabel } from "@/features/establishment/academic-period/api/query/use-study-plan-subject-label"
import { useTipoActividadCatalogQuery } from "@/features/planeador/api/query/use-tipo-actividad-catalog"
import {
  useInstrumentoEvaluacionCatalogQuery,
  instrumentoPermitidoLabel,
} from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import {
  ListaAgregableField,
  ListaAgregableCajaSelect,
} from "@/features/planeador/components/forms/field-lista-agregable"
import { useEnunciadosDbaQuery } from "@/features/planeador/api/query/use-enunciados-dba"
import { RECURSO_ARCHIVO_ACCEPT } from "@/features/planeador/lib/recurso-preview"
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
  InstrumentoPermitidoCampos,
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
import {
  consumeActividadFormDraft,
  saveActividadFormDraft,
  type ActividadFormDraftKey,
} from "@/features/planeador/lib/actividad-form-draft"

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

/**
 * Catálogos de respaldo de `InstrumentoPersonalizadoSection` — solo se usan
 * mientras `campos_disponibles.evaluacion.instrumentosPermitidos[valor=OTRO]
 * .campos` no resolvió todavía (foto vieja, endpoint viejo): el backend real
 * ya manda ese catálogo acotado al referente (ver el comentario de
 * `InstrumentoPersonalizadoSection`), este es solo el piso para no dejar los
 * selects sin opciones mientras carga.
 */
const TIPO_EVIDENCIA_ESPERADA_CATALOGO_DEFAULT: { pk: number; valor: string; nombre: string }[] = [
  { pk: -1, valor: "ARCHIVO", nombre: "Archivo" },
  { pk: -2, valor: "ENLACE", nombre: "Enlace" },
  { pk: -3, valor: "OBSERVACION_DIRECTA", nombre: "Observación directa" },
  { pk: -4, valor: "REGISTRO_CAMPO", nombre: "Registro en campo" },
]

const METODO_VALORACION_CATALOGO_DEFAULT: { pk: number; valor: string; nombre: string }[] = [
  { pk: -1, valor: "RUBRICA", nombre: "Rúbrica" },
  { pk: -2, valor: "LISTA_COTEJO", nombre: "Lista de cotejo" },
  { pk: -3, valor: "ESCALA_VALORACION", nombre: "Escala de valoración" },
]

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

  // El alta usa el sentinel "nueva" en vez de `actividad.id`: ese id es un
  // `draftId()` aleatorio que cambia en cada montaje (ver `esNueva` más
  // arriba), así que no sirve para encontrar el borrador guardado antes de
  // navegar a "Ver recurso" — la edición sí puede usar su id real, estable
  // entre navegaciones (`key={actividadParaForm.id}` en la página).
  const draftKey: ActividadFormDraftKey = esNueva ? "nueva" : actividad.id
  // Lazy initializer: corre una sola vez al montar, así que si venimos de
  // "Ver recurso" (`consumeActividadFormDraft` ya borró el borrador para
  // que no se reuse) el form arranca con lo que el docente ya había
  // tipeado en vez de `actividad` a secas.
  const [actividadInicial] = useState(() => consumeActividadFormDraft(draftKey) ?? actividad)

  const form = useForm({
    defaultValues: actividadInicial,
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

  const { camposEfectivos, esFormativa, tipoEvaluacion } = useCamposEvaluacionEfectivos(
    form,
    actividad.camposDisponibles,
    actividad.unidad.id,
  )

  // Grado + Asignatura son el punto de partida de toda la actividad: el
  // resto de los campos (nombre, tipo, unidad asociada, materiales,
  // recursos, programación, evaluación, adaptaciones, seguimiento) no tiene
  // sentido completarlo antes de saber a qué grado/asignatura pertenece la
  // actividad, así que quedan deshabilitados hasta elegir los dos. Se pasa
  // como prop explícita a cada sección (no un `<fieldset disabled>`
  // envolvente): los controles de Base UI (`<Select>`, `<Checkbox>`,
  // `<Switch>`, `<DatePicker>`, …) leen su propio prop `disabled`, no el
  // `:disabled` nativo en cascada de un `<fieldset>` — confirmado en vivo,
  // con el `<fieldset>` puesto todo seguía respondiendo al click.
  const disabled = !useHasGradoAsignatura(form)
  const bloqueadoPorRecuperacion = useRecuperacionBloqueaCampos(form)
  // A diferencia de `bloqueadoPorRecuperacion` (que exige `destino =
  // ACTIVIDAD` + origen elegido, porque ahí es cuando hay un valor real que
  // heredar), esto es la regla de negocio simple de la guía: "una actividad
  // de recuperación siempre es sumativa" — aplica apenas se marca "Es una
  // recuperación", sea cual sea el destino. Unidad, en cambio, sí usa
  // `bloqueadoPorRecuperacion`: mismo criterio que Grado/Asignatura/Nombre,
  // que solo se heredan (y bloquean) una vez elegida la actividad origen.
  const esRecuperacion = useSelector(form.store, (state) => state.values.esRecuperacion)
  useRecuperacionAutoFill(form)

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
      <RecuperacionSection
        // NO el `disabled` de Grado/Asignatura: acá es al revés. Con
        // `destino = ACTIVIDAD` elegir la actividad de origen es lo que
        // TERMINA llenando Grado/Asignatura (`useRecuperacionAutoFill`),
        // así que exigirlos antes sería un candado sin salida.
        form={form}
        disabled={false}
        camposEfectivos={camposEfectivos}
        actividadId={actividad.id}
      />
      {/* Identificación + Asignatura/Grado en UNA sola grilla —antes vivían
          en dos `<Card>` separadas y se veían como dos cajas sueltas, aunque
          las dos son "de dónde depende la actividad" (Grado/Asignatura,
          Unidad, Nombre/Tipo, mismo grid). Cada sección sigue siendo su
          propio componente (hooks/lógica separados), pero acá comparten un
          solo `<Card>` y un solo `grid`. Orden: Grado/Asignatura primero (lo
          primero que hay que elegir), después Unidad temática asociada
          (depende de Grado/Asignatura), recién después Nombre/Tipo — el
          resto del form. */}
      <Card className="gap-4 p-4">
        <h3 className="text-base font-semibold">Identificación de la actividad</h3>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <AsignaturaGradoSection form={form} bloqueadoPorRecuperacion={bloqueadoPorRecuperacion} />
          <UnidadAsociadaSection
            form={form}
            unidades={unidades}
            onCrearUnidad={crearUnidad}
            disabled={disabled || bloqueadoPorRecuperacion}
          />
          <IdentificacionSection
            form={form}
            disabled={disabled}
            bloqueadoPorRecuperacion={bloqueadoPorRecuperacion}
          />
        </div>
      </Card>
      <UnidadSection
        form={form}
        unidades={unidades}
        evidenciasOriginales={esNueva ? [] : actividad.evidenciasIds}
        criteriosUnidadOriginales={esNueva ? [] : actividad.criteriosUnidadIds}
      />
      <MaterialesSection form={form} disabled={disabled} />
      <RecursosSection
        form={form}
        draftKey={draftKey}
        disabled={disabled}
        actividadId={actividad.id}
      />
      <ProgramacionSection form={form} disabled={disabled} />
      <EvaluacionSection
        form={form}
        unidades={unidades}
        camposEfectivos={camposEfectivos}
        esFormativa={esFormativa}
        esRecuperacion={esRecuperacion}
        tipoEvaluacion={tipoEvaluacion}
        disabled={disabled}
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
          <AdaptacionesSection form={form} estudiantes={estudiantes} disabled={disabled} />
          <SeguimientoSection form={form} disabled={disabled} />
        </>
      )}
    </form>
  )
}

/**
 * Grado + Asignatura elegidos (los DOS ids, no los nombres): el resto del
 * form los necesita para saber si ya puede habilitarse. Centralizado acá
 * (mismo `form.store`, ningún selector nuevo pega una query aparte) para que
 * el componente raíz no calcule el mismo booleano de formas distintas en
 * cada sección.
 */
function useHasGradoAsignatura(form: FormActividad): boolean {
  const gradoId = useSelector(form.store, (state) => state.values.gradoId)
  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  return gradoId != null && asignaturaId != null
}

/**
 * `true` cuando la actividad NUEVA toma su identidad de OTRA actividad que
 * está recuperando (`destino = ACTIVIDAD`, con la actividad ya elegida) —
 * Grado/Grupo, Asignatura, Nombre y Estudiantes se llenan solos desde esa
 * actividad original (ver `useRecuperacionAutoFill`) y quedan bloqueados
 * mientras esto sea `true`: no tiene sentido que el docente los reescriba a
 * mano si la actividad de recuperación DEBE coincidir con la que recupera.
 * Con `destino = NOTA_FINAL` (no hay una actividad puntual de origen) o sin
 * actividad elegida todavía, no aplica — el resto del form sigue su regla
 * normal (bloqueado solo por Grado/Asignatura sin elegir, como cualquier
 * actividad nueva).
 */
function useRecuperacionBloqueaCampos(form: FormActividad): boolean {
  const esRecuperacion = useSelector(form.store, (state) => state.values.esRecuperacion)
  const destino = useSelector(form.store, (state) => state.values.recuperacionDestino)
  const recuperacionActividadId = useSelector(form.store, (state) => state.values.recuperacionActividadId)
  return esRecuperacion && destino === "ACTIVIDAD" && recuperacionActividadId != null
}

/**
 * Cuando se elige QUÉ actividad se está recuperando, trae su detalle real
 * (`GET /planeador/actividades/:id`, ya con `matriculasIds` reales desde
 * V452) y copia Grado/Grupo, Asignatura, Nombre (con el sufijo `" (R)"`, la
 * marca visual de que es una recuperación) y la selección de estudiantes —
 * la actividad de recuperación hereda ese contexto de la actividad
 * original, no se vuelve a elegir a mano (ver `useRecuperacionBloqueaCampos`,
 * que bloquea esos mismos campos mientras esto aplica).
 *
 * `aplicadoRef` evita repetir la copia en cada render mientras se sigue
 * mirando la MISMA actividad de origen — sin esto, cualquier render (p. ej.
 * al tipear en otro campo del form) volvería a pisar "Nombre" con el valor
 * recién copiado, incluso si el campo no estuviera bloqueado por algún otro
 * motivo. Sí se vuelve a copiar si el docente cambia a OTRA actividad de
 * origen (`recuperacionActividadId` distinto).
 */
function useRecuperacionAutoFill(form: FormActividad) {
  const esRecuperacion = useSelector(form.store, (state) => state.values.esRecuperacion)
  const destino = useSelector(form.store, (state) => state.values.recuperacionDestino)
  const recuperacionActividadId = useSelector(form.store, (state) => state.values.recuperacionActividadId)
  const activo = esRecuperacion && destino === "ACTIVIDAD" && recuperacionActividadId != null
  const { data: original } = useActividadDetalleQuery(activo ? recuperacionActividadId : undefined)
  const aplicadoRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!activo || !original) return
    if (aplicadoRef.current === recuperacionActividadId) return
    aplicadoRef.current = recuperacionActividadId
    form.setFieldValue("gradoId", original.gradoId)
    form.setFieldValue("grado", original.grado)
    form.setFieldValue("grupoId", original.grupoId)
    form.setFieldValue("grupo", original.grupo)
    form.setFieldValue("asignaturaId", original.asignaturaId)
    form.setFieldValue("asignatura", original.asignatura)
    form.setFieldValue("nombre", `${original.nombre} (R)`)
    // Solo quedan marcados los estudiantes que YA tenían la actividad
    // original — el resto del grupo no participó de lo que se está
    // recuperando, así que no arranca marcado (y queda inactivo mientras
    // el bloqueo siga activo, ver `useRecuperacionBloqueaCampos`).
    form.setFieldValue("matriculasIds", original.matriculasIds)
    form.setFieldValue("asignarTodoElGrupo", false)
  }, [activo, recuperacionActividadId, original, form])
}

/**
 * Toggle "Es una recuperación" + su configuración, arriba de todo el form.
 * Solo tiene sentido para una actividad sumativa —una formativa no pondera
 * nota, así que no hay nada que "recuperar"—, por eso se lee `esEvaluativa`
 * del store (mismo flag que gobierna la ponderación en `EvaluacionSection`
 * y `InstrumentoEvaluacionSection`) y el control desaparece por completo
 * cuando es `false`, en vez de deshabilitarse: no es que falte
 * completar algo, es que la pregunta no aplica.
 *
 * Si el usuario tenía el toggle en `true` y después cambia la actividad
 * a no-sumativa, el valor sigue guardado en el form (no se resetea a
 * `false`): si vuelve a marcar sumativa, reaparece en el estado que
 * dejó. Forzar un reset ahí sería más sorpresa que ayuda.
 *
 * La configuración (destino/actividad a recuperar/tipo de aplicación/tipo
 * de cálculo/% de ponderación) sale de `camposEfectivos.recuperacion` —
 * MISMA fuente de verdad que ya usa `EvaluacionSection`, con sus catálogos
 * `{pk, valor, nombre}` (se decide por `valor`) y las reglas que valida
 * `fn_actividad_recuperacion_configurar` (actividad obligatoria sii
 * `destino = ACTIVIDAD`, % obligatorio y 0-100 sii `tipoCalculo =
 * PONDERADO`) para no descubrirlas a base de 400.
 */
/**
 * Catálogo por default de "¿Esta recuperación aplica para?" — mismos
 * `valor`/`nombre` que ya devuelve el backend real (confirmado contra
 * `campos_disponibles.recuperacion.catalogos.destino`), para cuando
 * TODAVÍA no se puede pedir esa fila (sin Grado/Asignatura ni Unidad, ver
 * `catalogosDisponibles` en `RecuperacionSection`). El texto real del
 * backend termina reemplazando este placeholder apenas
 * `useConfiguracionContextoActividadQuery`/`useConfiguracionActividadQuery`
 * resuelven — no antes de eso el docente ya pudo elegir "Una actividad" y
 * arrancar `useRecuperacionAutoFill`, así que el `valor` (lo único que
 * de verdad importa para la lógica) tiene que coincidir con el real desde
 * el primer render.
 */
const DESTINO_RECUPERACION_FALLBACK = [
  { valor: "ACTIVIDAD", nombre: "Recuperar una actividad" },
  { valor: "NOTA_FINAL", nombre: "Recuperar la nota final" },
]
const TIPO_APLICACION_RECUPERACION_FALLBACK = [
  { valor: "COMPUTAR", nombre: "Computar con la nota anterior" },
  { valor: "REEMPLAZAR", nombre: "Reemplazar la nota actual" },
]
const TIPO_CALCULO_RECUPERACION_FALLBACK = [
  { valor: "PROMEDIADO", nombre: "Promediado" },
  { valor: "PONDERADO", nombre: "Ponderado" },
]

function RecuperacionSection({
  form,
  disabled,
  camposEfectivos,
  actividadId,
}: {
  form: FormActividad
  disabled: boolean
  camposEfectivos: ReturnType<typeof useCamposEvaluacionEfectivos>["camposEfectivos"]
  actividadId: number
}) {
  const recuperacion = camposEfectivos?.recuperacion
  // "¿Esta recuperación aplica para?" tiene que aparecer SIEMPRE primero,
  // apenas se prende el toggle — sin esperar a Grado/Asignatura/Unidad
  // (`campos_disponibles.recuperacion.catalogos` no se puede pedir sin
  // eso, ver `useCamposEvaluacionEfectivos`). Mientras el catálogo real no
  // llegue, se usa el de respaldo (mismos `valor` que el real, así que la
  // lógica — `destino === "ACTIVIDAD"`, etc. — no distingue uno de otro);
  // el real lo reemplaza solo apenas resuelve, sin que el docente note el
  // cambio salvo por el asterisco de "obligatorio" si aplica.
  const destinoOpciones = recuperacion?.catalogos.destino.length
    ? recuperacion.catalogos.destino
    : DESTINO_RECUPERACION_FALLBACK
  const tipoAplicacionOpciones = recuperacion?.catalogos.tipoAplicacion.length
    ? recuperacion.catalogos.tipoAplicacion
    : TIPO_APLICACION_RECUPERACION_FALLBACK
  const tipoCalculoOpciones = recuperacion?.catalogos.tipoCalculo.length
    ? recuperacion.catalogos.tipoCalculo
    : TIPO_CALCULO_RECUPERACION_FALLBACK

  return (
    <form.Subscribe selector={(state) => state.values.esEvaluativa}>
      {(esEvaluativa) =>
        !esEvaluativa ? null : (
          <div className="flex flex-col gap-4">
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
                    disabled={disabled}
                    className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
                  />
                  Es una recuperación
                </label>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values.esRecuperacion}>
              {(esRecuperacionValue) =>
                !esRecuperacionValue ? null : (
                  <div className="grid gap-x-4 gap-y-5 rounded-md border border-input p-3 sm:grid-cols-2">
                    <form.Field name="recuperacionDestino">
                      {(field) => (
                        <Field variant="outlined">
                          <FieldLabel htmlFor={field.name}>
                            ¿Esta recuperación aplica para?{recuperacion?.requerido ? " *" : ""}
                          </FieldLabel>
                          <Select
                            value={field.state.value || "__none__"}
                            onValueChange={(v) => {
                              field.handleChange(!v || v === "__none__" ? "" : v)
                              // Cambiar "¿Esta recuperación aplica para?"
                              // invalida TODO lo que dependía del valor
                              // anterior (la actividad puntual elegida,
                              // cómo se aplica, cómo se calcula, el %) —
                              // sin este reset quedaban valores viejos
                              // guardados pero ocultos, que podían
                              // reaparecer con datos de otra combinación al
                              // volver a elegir la misma opción de antes.
                              form.setFieldValue("recuperacionActividadId", undefined)
                              form.setFieldValue("recuperacionTipoAplicacion", "")
                              form.setFieldValue("recuperacionTipoCalculo", "")
                              form.setFieldValue("recuperacionValorPonderacion", undefined)
                            }}
                            disabled={disabled}
                          >
                            <SelectTrigger id={field.name}>
                              <SelectValue placeholder="Seleccione">
                                {(v) =>
                                  v === "__none__"
                                    ? "Seleccione"
                                    : (destinoOpciones.find((o) => o.valor === v)?.nombre ?? (v as string))
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Seleccione</SelectItem>
                              {destinoOpciones.map((opcion) => (
                                <SelectItem key={opcion.valor} value={opcion.valor}>
                                  {opcion.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    </form.Field>

                    {/* Actividad a recuperar: solo tiene sentido con
                        `destino = ACTIVIDAD` (recuperar la NOTA FINAL no
                        apunta a ninguna actividad puntual) — regla
                        `actividadRecuperarRequeridaSi` de `reglas`. */}
                    <form.Subscribe selector={(state) => state.values.recuperacionDestino}>
                      {(destino) =>
                        destino !== "ACTIVIDAD" ? null : (
                          <form.Field name="recuperacionActividadId">
                            {(field) => (
                              <Field variant="outlined">
                                <FieldLabel>¿Qué actividad deseas recuperar?</FieldLabel>
                                <ActividadRecuperarCascada
                                  value={field.state.value}
                                  onChange={(v) => {
                                    field.handleChange(v)
                                    // Mismo motivo que el reset de
                                    // "¿Esta recuperación aplica para?":
                                    // cambiar LA actividad a recuperar
                                    // invalida cómo se aplica/calcula.
                                    form.setFieldValue("recuperacionTipoAplicacion", "")
                                    form.setFieldValue("recuperacionTipoCalculo", "")
                                    form.setFieldValue("recuperacionValorPonderacion", undefined)
                                  }}
                                  excludeActividadId={actividadId}
                                  disabled={disabled}
                                />
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

                    {/* Igual que "Valor de ponderación" (gateada por
                        `tipoCalculo`): sin elegir "¿Esta recuperación aplica
                        para?" todavía no hay nada que aplicar/calcular, así
                        que el resto de la cascada se oculta en vez de
                        mostrarse vacío. Con `destino = ACTIVIDAD` además hay
                        que esperar a que se elija LA actividad puntual
                        (`recuperacionActividadId`) — mismo criterio que
                        "Actividad a recuperar" arriba: hasta no saber sobre
                        qué actividad se está recuperando, tampoco hay nada
                        que aplicar/calcular todavía. */}
                    <form.Subscribe
                      selector={(state) => ({
                        destino: state.values.recuperacionDestino,
                        actividadId: state.values.recuperacionActividadId,
                      })}
                    >
                      {({ destino, actividadId }) =>
                        !destino || (destino === "ACTIVIDAD" && !actividadId) ? null : (
                          <form.Field name="recuperacionTipoAplicacion">
                            {(field) => (
                              <Field variant="outlined">
                                <FieldLabel>¿Cómo se aplicará la nota de recuperación?</FieldLabel>
                                <RadioGroup
                                  className="flex min-h-11 flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-input px-3 py-2"
                                  value={field.state.value}
                                  disabled={disabled}
                                  onValueChange={(v) => {
                                    field.handleChange(v)
                                    // "Reemplazar" no calcula nada (la nota
                                    // anterior se descarta entera) — si
                                    // había un "Promediado"/"Ponderado" +
                                    // % elegidos con "Computar", quedan sin
                                    // sentido y tienen que limpiarse, no
                                    // solo ocultarse.
                                    form.setFieldValue("recuperacionTipoCalculo", "")
                                    form.setFieldValue("recuperacionValorPonderacion", undefined)
                                  }}
                                >
                                  {tipoAplicacionOpciones.map((opcion) => (
                                    <label key={opcion.valor} className="flex items-center gap-2 text-sm">
                                      <RadioGroupItem value={opcion.valor} className="data-checked:bg-primary" />
                                      {opcion.nombre}
                                    </label>
                                  ))}
                                </RadioGroup>
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

                    {/* "Reemplazar" es lo único que necesita aclaración: la
                        nota anterior se pierde por completo. "Computar con
                        la nota anterior" no lleva banner — su propio nombre
                        ya dice qué hace. */}
                    <form.Subscribe selector={(state) => state.values.recuperacionTipoAplicacion}>
                      {(tipoAplicacion) =>
                        tipoAplicacion !== "REEMPLAZAR" ? null : (
                          <div className="border-blue-stroke bg-blue-22 text-blue col-span-full flex items-start gap-2 rounded-md border p-3 text-sm">
                            <InfoIcon className="mt-0.5 size-4 shrink-0" />
                            La nota de recuperación reemplazará el 100% de la nota final actual.
                          </div>
                        )
                      }
                    </form.Subscribe>

                    {/* Mismo gate que "¿Cómo se aplicará la nota de
                        recuperación?" arriba, más esperar a que se elija esa
                        opción — y oculto con `tipoAplicacion = REEMPLAZAR`
                        (regla `tipoCalculoOcultoSi` de `campos_disponibles.
                        recuperacion.reglas`, confirmada real): "Reemplazar"
                        no calcula nada, la nota anterior se descarta entera.
                        `fn_actividad_recuperacion_configurar` (V224) tolera
                        el campo ausente con REEMPLAZAR — si no viene, guarda
                        PROMEDIADO por default (la columna es NOT NULL), no
                        lo exige. El reset a `""` en el `onValueChange` de
                        arriba ya limpiaba el valor al cambiar a REEMPLAZAR;
                        acá faltaba ocultar el control. */}
                    <form.Subscribe
                      selector={(state) => ({
                        destino: state.values.recuperacionDestino,
                        actividadId: state.values.recuperacionActividadId,
                        tipoAplicacion: state.values.recuperacionTipoAplicacion,
                      })}
                    >
                      {({ destino, actividadId, tipoAplicacion }) =>
                        !destino ||
                        (destino === "ACTIVIDAD" && !actividadId) ||
                        !tipoAplicacion ||
                        tipoAplicacion === "REEMPLAZAR" ? null : (
                          <form.Field name="recuperacionTipoCalculo">
                            {(field) => (
                              <Field variant="outlined">
                                <FieldLabel>
                                  ¿Cómo deseas calcular la nota{" "}
                                  {destino === "NOTA_FINAL" ? "final" : "de la actividad"}?
                                </FieldLabel>
                                <RadioGroup
                                  className="flex min-h-11 flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-input px-3 py-2"
                                  value={field.state.value}
                                  disabled={disabled}
                                  onValueChange={(v) => {
                                    field.handleChange(v)
                                    // Un % de ponderación de otro modo (o
                                    // de "Promediado", que ni lo pide) no
                                    // aplica al elegir de nuevo — mismo
                                    // criterio que los resets de arriba.
                                    form.setFieldValue("recuperacionValorPonderacion", undefined)
                                  }}
                                >
                                  {tipoCalculoOpciones.map((opcion) => (
                                    <label key={opcion.valor} className="flex items-center gap-2 text-sm">
                                      <RadioGroupItem value={opcion.valor} className="data-checked:bg-primary" />
                                      {opcion.nombre}
                                    </label>
                                  ))}
                                </RadioGroup>
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

                    {/* % de ponderación: solo con `tipoCalculo = PONDERADO`
                        — regla `valorPonderacionRequeridoSi`, rango de
                        `valorPonderacionRango` (0-100 por defecto). */}
                    <form.Subscribe selector={(state) => state.values.recuperacionTipoCalculo}>
                      {(tipoCalculo) =>
                        tipoCalculo !== "PONDERADO" ? null : (
                          <form.Field name="recuperacionValorPonderacion">
                            {(field) => (
                              <Field variant="outlined">
                                <FieldLabel htmlFor={field.name}>Valor de ponderación (%)</FieldLabel>
                                <Input
                                  id={field.name}
                                  inputMode="numeric"
                                  placeholder="Ej: 100"
                                  maxLength={3}
                                  value={field.state.value?.toString() ?? ""}
                                  onChange={(e) => {
                                    const digits = toPositiveDigitsInput(e.target.value, 3)
                                    const max = recuperacion?.reglas.valorPonderacionRango.max ?? 100
                                    const parsed = digits === "" ? undefined : Math.min(Number(digits), max)
                                    field.handleChange(parsed)
                                  }}
                                  disabled={disabled}
                                />
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

                    {/* Explica el efecto de la opción elegida arriba —
                        "Ponderado" reparte el % entre recuperación y nota
                        actual, "Promediado" (cualquier valor que no sea
                        PONDERADO) promedia las dos notas sin pedir %. */}
                    <form.Subscribe
                      selector={(state) => ({
                        tipoCalculo: state.values.recuperacionTipoCalculo,
                        valorPonderacion: state.values.recuperacionValorPonderacion,
                      })}
                    >
                      {({ tipoCalculo, valorPonderacion }) => {
                        if (!tipoCalculo) return null
                        const mensaje =
                          tipoCalculo === "PONDERADO"
                            ? valorPonderacion != null
                              ? `Este porcentaje corresponde al valor de la recuperación. El valor restante (${100 - valorPonderacion}%) se aplicará a la nota actual.`
                              : null
                            : "El resultado será el promedio entre la nota actual de la actividad y la nota de recuperación."
                        if (!mensaje) return null
                        return (
                          <div className="border-blue-stroke bg-blue-22 text-blue col-span-full flex items-start gap-2 rounded-md border p-3 text-sm">
                            <InfoIcon className="mt-0.5 size-4 shrink-0" />
                            {mensaje}
                          </div>
                        )
                      }}
                    </form.Subscribe>
                  </div>
                )
              }
            </form.Subscribe>
          </div>
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
  disabled,
  bloqueadoPorRecuperacion,
}: {
  form: FormActividad
  disabled: boolean
  /** Ver `useRecuperacionBloqueaCampos` — "Nombre" queda bloqueado (ya lo
   *  llenó `useRecuperacionAutoFill` con el de la actividad original + el
   *  sufijo " (R)") mientras esto sea `true`. */
  bloqueadoPorRecuperacion: boolean
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
                maxLength={50}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                disabled={disabled || bloqueadoPorRecuperacion}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="tipo">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Tipo de actividad</FieldLabel>
              <Select
                // `__none__` es el sentinel de "sin elegir" — mismo criterio
                // que el resto de los `<Select>` del form (Asignatura,
                // Unidad temática asociada, Modalidad, …): antes "Tipo de
                // actividad" arrancaba en el primer valor del catálogo
                // (`crearActividadVacia`) porque no tenía dónde representar
                // "todavía sin elegir".
                value={field.state.value || "__none__"}
                onValueChange={(value) =>
                  field.handleChange(!value || value === "__none__" ? "" : (value as Actividad["tipo"]))
                }
                disabled={disabled}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Seleccione">
                    {(value) => (value === "__none__" ? "Seleccione" : (value as string))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccione</SelectItem>
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
    </>
  )
}

/**
 * "Unidad temática asociada" / "Proyecto pedagógico" — depende de Grado +
 * Asignatura (`AsignaturaGradoSection`), así que se renderiza DESPUÉS en el
 * grid: mostrarlo antes de esos dos invertía la dependencia real (el select
 * arranca deshabilitado hasta elegir ambos).
 */
function UnidadAsociadaSection({
  form,
  unidades,
  onCrearUnidad,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  disabled: boolean
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
  // El rótulo "Unidad temática asociada" está hardcodeado, pero el
  // instrumento real depende del nivel educativo del Grado elegido — mismo
  // dato que `PlaneadorTabs` usa para las pestañas ("Unidad temática" en
  // Primaria, "Proyecto pedagógico" en Preescolar, …): un docente de
  // Preescolar editando una actividad de Proyecto Pedagógico veía el
  // select seguir diciendo "Unidad temática asociada". Acá el Grado (y su
  // Asignatura) ya están elegidos, así que hay a lo sumo UN instrumento
  // aplicable (a diferencia de las pestañas, que muestran TODOS los que
  // dicta el docente) — se busca por `gradoId` dentro de `unidadTabs`.
  const { data: unidadTabs } = useUnidadesTabsQuery()
  // "¿Es formativa?" de la unidad la decide el referente curricular de
  // GRADO + ASIGNATURA, no `UnidadTematica.enfoquePedagogico`: ese campo
  // SIEMPRE llega "Evaluativo" desde `useUnidadesQuery` (el backend real no
  // guarda un enfoque propio por unidad — ver el comentario de
  // `toUnidadTematica` en `use-unidades-query.ts`), así que comparar contra
  // ese campo (versión anterior de este handler) nunca detectaba una unidad
  // Formativa. Todas las unidades de `unidadesDelGrado` comparten el MISMO
  // grado+asignatura, así que comparten el mismo enfoque — un solo query acá
  // alcanza, no hace falta uno por unidad.
  const gradoIdSel = useSelector(form.store, (state) => state.values.gradoId)
  const asignaturaIdSel = useSelector(form.store, (state) => state.values.asignaturaId)
  const { data: referenteActual } = useReferenteCurricularQuery(gradoIdSel, asignaturaIdSel)

  return (
    <>
        <form.Subscribe
          selector={(state) => `${state.values.grado}/${state.values.asignatura}/${state.values.gradoId}`}
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
            // Misma condición que `CrearUnidadPopover` (gradoId != null &&
            // asignaturaId != null), no `Boolean(grado && asignatura)`. Los
            // labels pueden llegar solos desde el detalle real (que no
            // siempre trae los ids, ver el comentario del `useEffect` en
            // `AsignaturaGradoSection`); chequear con strings habilitaba el
            // select de unidad y dejaba el `+` del popover bloqueado — o al
            // revés, según el orden de la query de catálogos.
            const gradoId = form.getFieldValue("gradoId")
            const asignaturaId = form.getFieldValue("asignaturaId")
            const hasGradoAsignatura = gradoId != null && asignaturaId != null
            // `grado`/`asignatura` y `UnidadTematica.grado`/`.asignatura`
            // salen ahora del mismo origen real (`docentes/grupos`/
            // `docentes/grado-asignatura`), así que se comparan directo —
            // ya no hace falta traducir contra el catálogo genérico.
            const unidadesDelGrado = hasGradoAsignatura
              ? unidades.filter((u) => u.grado === grado && u.asignatura === asignatura)
              : []

            // Instrumento (rótulo real) del Grado ya elegido — ver el
            // comentario sobre `unidadTabs` más arriba. Sin Grado/Asignatura
            // todavía elegidos cae al mismo fallback que `PlaneadorTabs`.
            const instrumentoLabel = resolveInstrumentoLabel(gradoId, unidadTabs, UNIDAD_TAB_FALLBACK)

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
                      <FieldLabel htmlFor={field.name} className="truncate" title={instrumentoLabel}>
                        {instrumentoLabel}
                      </FieldLabel>
                      <Select
                        // `Select` siempre trabaja con `value` string — el id real
                        // es numérico, así que se convierte acá. `0` es el
                        // sentinel de "sin unidad" (ningún PK real es 0).
                        value={field.state.value.id === 0 ? "__none__" : String(field.state.value.id)}
                        disabled={disabled || !hasGradoAsignatura}
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
                          // `referenteActual` (no `next.enfoquePedagogico`, ver
                          // el comentario de arriba) es el enfoque real del
                          // grado+asignatura compartido por toda `unidadesDelGrado`.
                          if (referenteActual?.esFormativo) {
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
                      instrumentoLabel={instrumentoLabel}
                      gradoId={form.getFieldValue("gradoId")}
                      asignaturaId={form.getFieldValue("asignaturaId")}
                      disabled={disabled || !hasGradoAsignatura}
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
 *  `useUnidadDetalleQuery`/`useUnidadReferenteQuery` de forma incondicional
 *  (reglas de hooks) — `UnidadSection` decide arriba si hay unidad elegida
 *  antes de montar esto. */
function UnidadFichaYEvidencias({
  unidadId,
  nombreFallback,
  seleccionadas,
  onToggle,
  disabledIds,
  criteriosSeleccionados,
  onToggleCriterio,
  criteriosDisabledIds,
}: {
  unidadId: number
  nombreFallback: string
  seleccionadas: number[]
  onToggle: (evidenciaId: number) => void
  disabledIds: number[]
  criteriosSeleccionados: number[]
  onToggleCriterio: (criterioId: number) => void
  criteriosDisabledIds: number[]
}) {
  const { data: unidad } = useUnidadDetalleQuery(unidadId)
  // `unidad.criterios` queda siempre vacío contra el backend real —viven en
  // `GET /unidades/:id/criterios`, aparte del detalle— mismo motivo que
  // `useUnidadCriteriosQuery` en `unidad-detalle-panel.tsx`.
  const { data: criterios = [] } = useUnidadCriteriosQuery(unidadId)
  // El árbol de nivel 1 (enunciados) + nivel 2 (evidencias), YA acotado a
  // los enunciados que esta UNIDAD relacionó (`relacionadoConUnidad`,
  // resuelto del lado del backend), sale directo de `GET /planeador/
  // unidades/:id/referente` — confirmado contra una respuesta real: cada
  // fila trae sus propias `evidencias` anidadas y los rótulos
  // `nivel_1_etiqueta`/`nivel_2_etiqueta`. Antes se pedía el referente por
  // GRADO + ASIGNATURA (`useReferenteCurricularQuery`) y se cruzaba a mano
  // contra `unidad.enunciadosDba` — dos queries y un filtro cliente para
  // llegar al mismo árbol que esta ruta ya entrega filtrado.
  const { data: referente } = useUnidadReferenteQuery(unidadId)
  const { data: unidadTabs } = useUnidadesTabsQuery()
  // Por `referente.id` (`pk_referente_curricular`), no por `gradoId` a
  // secas: evita que el título diga un instrumento distinto del que en
  // verdad tienen `nivel1Etiqueta`/`nivel2Etiqueta` de ESTE MISMO referente
  // — ver el comentario de `instrumentoLabelFromReferente`.
  const instrumentoLabel = instrumentoLabelFromReferente(referente?.id ?? undefined, unidadTabs, UNIDAD_TAB_FALLBACK)

  return (
    <div className="flex flex-col gap-4">
      <UnidadFicha
        instrumentoLabel={instrumentoLabel}
        nombre={unidad?.nombre ?? nombreFallback}
        descripcion={unidad?.descripcion ?? ""}
        objetivos={unidad?.objetivos ?? []}
        contenidos={unidad?.contenidos ?? []}
      />
      {referente && referente.enunciados.length > 0 && (
        <EnunciadosEvidenciasChecklist
          instrumentoLabel={instrumentoLabel}
          nivel1Etiqueta={referente.nivel1Etiqueta}
          nivel2Etiqueta={referente.nivel2Etiqueta}
          enunciados={referente.enunciados}
          seleccionadas={seleccionadas}
          onToggle={onToggle}
          disabledIds={disabledIds}
        />
      )}
      {criterios.length > 0 && (
        <CriteriosUnidadChecklist
          criterios={criterios}
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

function AsignaturaGradoSection({
  form,
  bloqueadoPorRecuperacion,
}: {
  form: FormActividad
  /** Ver `useRecuperacionBloqueaCampos` — Grado/Grupo, Asignatura y
   *  Estudiantes quedan bloqueados (ya los llenó `useRecuperacionAutoFill`
   *  con los de la actividad original) mientras esto sea `true`. */
  bloqueadoPorRecuperacion: boolean
}) {
  const { data: docenteGrupos = [] } = useDocenteGruposQuery()
  const { data: docenteGradoAsignatura = [] } = useDocenteGradoAsignaturaQuery()

  // Con `destino = NOTA_FINAL` no hay actividad de origen de la que heredar
  // Grado/Asignatura (a diferencia de `destino = ACTIVIDAD`, donde
  // `useRecuperacionAutoFill` ya los llena y `bloqueadoPorRecuperacion` los
  // bloquea) — el docente los elige a mano acá mismo, así que hace falta
  // achicar las opciones a solo referentes EVALUATIVOS: una recuperación
  // nunca puede caer en un referente formativo (mismo motivo que bloquea
  // "¿Es evaluación sumativa?" en `EvaluacionSection`). No hay un endpoint
  // que devuelva "qué grado/asignatura son evaluativos" de una, así que se
  // sondea cada par (grado, asignatura) del docente EN PARALELO con
  // `useQueries` — mismo patrón que `ActividadRecuperarCascada`.
  const esRecuperacion = useSelector(form.store, (state) => state.values.esRecuperacion)
  const recuperacionDestino = useSelector(form.store, (state) => state.values.recuperacionDestino)
  const filtrarSoloEvaluativas = esRecuperacion && recuperacionDestino === "NOTA_FINAL"

  const referentes = useQueries({
    queries: docenteGradoAsignatura.map((par) => ({
      ...referenteCurricularQueryOptions(par.gradoId, par.asignaturaId),
      enabled: filtrarSoloEvaluativas,
    })),
  })

  // Mientras la sonda de un par no resuelve, se trata como "todavía no se
  // sabe" (no evaluativo) en vez de asumir que sí — la opción aparece apenas
  // se confirma, no antes.
  const paresEvaluativos = useMemo(() => {
    const ids = new Set<number>()
    docenteGradoAsignatura.forEach((par, i) => {
      if (referentes[i]?.data?.esFormativo === false) ids.add(par.gradoId * 1_000_000 + par.asignaturaId)
    })
    return ids
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `referentes` cambia de referencia en cada resolución; `docenteGradoAsignatura` ya la representa indirectamente.
  }, [docenteGradoAsignatura, referentes])

  const gradosEvaluativosIds = useMemo(() => {
    const ids = new Set<number>()
    docenteGradoAsignatura.forEach((par) => {
      if (paresEvaluativos.has(par.gradoId * 1_000_000 + par.asignaturaId)) ids.add(par.gradoId)
    })
    return ids
  }, [docenteGradoAsignatura, paresEvaluativos])

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
  const hasGradoAsignatura = hasGradoGrupo && asignaturaId != null
  const asignarTodoElGrupo = useSelector(form.store, (state) => state.values.asignarTodoElGrupo)
  const { data: matriculas = [], isPending: isPendingMatriculas } = useActividadMatriculasGrupoQuery(
    hasGradoAsignatura ? grupoId : undefined,
  )

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
        return
      }
    }
    // Alta de actividad DESDE una Unidad (`CrearActividadForm` en
    // `planeador-crear-actividad-page.tsx`, `unidadId` de la URL): ahí solo
    // hay `grado`/`asignatura` (los NOMBRES) precargados, sin ningún id —
    // `UnidadTematica.gradoId`/`.asignaturaId` casi nunca vienen del backend
    // real (ver su comentario en `unidad-tematica.ts`). Se cruzan los DOS
    // nombres juntos contra `docentes/grado-asignatura` (un solo match,
    // a diferencia de los cruces de arriba que solo tienen UN dato) y,
    // encontrado el par, se elige de una el PRIMER grupo de ese grado
    // (`docentes/grupos`) para que "Asignatura / materia" quede habilitado
    // (depende de Grado+Grupo, no solo de Grado) — el docente sigue
    // pudiendo cambiar el grupo después, "Unidad temática asociada" no se
    // toca (ya viene elegida) porque esa sí depende solo de grado/asignatura.
    if (grado && asignatura) {
      const par = docenteGradoAsignatura.find(
        (p) => p.gradoNombre === grado && p.asignaturaNombre === asignatura,
      )
      if (par) {
        form.setFieldValue("gradoId", par.gradoId)
        form.setFieldValue("asignaturaId", par.asignaturaId)
        const combo = docenteGrupos.find((g) => g.gradoId === par.gradoId)
        if (combo) {
          form.setFieldValue("grupoId", combo.grupoId)
          form.setFieldValue("grupo", grupoLabel(combo))
        }
      }
    }
  }, [gradoId, grupoId, asignaturaId, grado, asignatura, docenteGrupos, docenteGradoAsignatura, form])

  const asignaturas = docenteGradoAsignatura.filter((par) => par.gradoId === gradoId)
  const subjectLabel = useStudyPlanSubjectLabel(gradoId, false)

  // Ver el comentario de `filtrarSoloEvaluativas` más arriba: sin filtro
  // (el caso normal) estas dos son las mismas listas de siempre.
  const gruposVisibles = filtrarSoloEvaluativas
    ? docenteGrupos.filter((g) => gradosEvaluativosIds.has(g.gradoId))
    : docenteGrupos
  const asignaturasVisibles = filtrarSoloEvaluativas
    ? asignaturas.filter((a) => paresEvaluativos.has(a.gradoId * 1_000_000 + a.asignaturaId))
    : asignaturas

  return (
    <>
        {/* Grado/Grupo primero: Asignatura (y "Unidad temática asociada" en
            `UnidadAsociadaSection`) dependen de él y están deshabilitados
            hasta elegirlo — mostrarlo después invertía la relación de
            dependencia y confundía sobre qué elegir primero. */}
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
                // "Estudiantes" depende del padrón de ESTE grupo+asignatura
                // (`useActividadMatriculasGrupoQuery`) — sin grupo no hay
                // padrón contra el cual siquiera validar los ids ya
                // elegidos, así que se limpian junto con el resto.
                form.setFieldValue("matriculasIds", [])
                form.setFieldValue("asignarTodoElGrupo", true)
                return
              }
              const combo = docenteGrupos.find((g) => String(g.grupoId) === v)
              if (!combo) return
              form.setFieldValue("gradoId", combo.gradoId)
              form.setFieldValue("grado", combo.gradoNombre)
              form.setFieldValue("grupoId", combo.grupoId)
              form.setFieldValue("grupo", grupoLabel(combo))
              // Asignatura, unidad y "Estudiantes" dependen de "Grado /
              // Grupo": cambiarlo invalida lo que había elegido en las tres
              // (los `matriculaIds` seleccionados son PKs del padrón del
              // grupo ANTERIOR — dejarlos pegados los manda al nuevo grupo
              // sin que el docente haya elegido a esos estudiantes ahí).
              form.setFieldValue("asignaturaId", undefined)
              form.setFieldValue("asignatura", "")
              form.setFieldValue("unidad", { id: 0, nombre: "" })
              form.setFieldValue("matriculasIds", [])
              form.setFieldValue("asignarTodoElGrupo", true)
            }}
            disabled={bloqueadoPorRecuperacion}
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
              {gruposVisibles.map((g) => (
                <SelectItem key={g.grupoId} value={String(g.grupoId)}>
                  {g.gradoNombre}/{grupoLabel(g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <form.Field name="asignaturaId">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>{subjectLabel}</FieldLabel>
              <Select
                // `__none__` es el sentinel de "sin elegir" — mismo criterio
                // que Grado/Grupo arriba (y que "Unidad temática asociada").
                // Sin un valor propio para ese estado, no había forma de
                // VOLVER a "sin asignatura" una vez elegida una: y sin
                // asignatura (ni grado) el enfoque no se puede derivar, así
                // que "¿Es evaluación sumativa?" queda libre (ver
                // `EvaluacionSection`) en vez de bloqueado por una unidad/
                // referente que ya no aplica.
                value={field.state.value != null ? String(field.state.value) : "__none__"}
                onValueChange={(v) => {
                  if (!v) return
                  if (v === "__none__") {
                    field.handleChange(undefined)
                    form.setFieldValue("asignatura", "")
                    // "Estudiantes" depende de Grado/Grupo Y Asignatura —
                    // sin asignatura no hay padrón contra el que validar los
                    // `matriculaIds` ya elegidos (mismo criterio que al
                    // limpiar "Grado / Grupo").
                    form.setFieldValue("matriculasIds", [])
                    form.setFieldValue("asignarTodoElGrupo", true)
                    return
                  }
                  const par = asignaturas.find((a) => String(a.asignaturaId) === v)
                  if (!par) return
                  field.handleChange(par.asignaturaId)
                  form.setFieldValue("asignatura", par.asignaturaNombre)
                  // Cambiar de Asignatura cambia el padrón que ofrece
                  // "Estudiantes" (`useActividadMatriculasGrupoQuery` depende
                  // de grupo+asignatura) — los `matriculaIds` ya elegidos
                  // eran de la asignatura ANTERIOR, así que quedan sin
                  // sentido acá y se limpian junto con el resto.
                  form.setFieldValue("matriculasIds", [])
                  form.setFieldValue("asignarTodoElGrupo", true)
                }}
                disabled={!hasGradoGrupo || bloqueadoPorRecuperacion}
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
                  {asignaturasVisibles.map((a) => (
                    <SelectItem key={a.asignaturaId} value={String(a.asignaturaId)}>
                      {a.asignaturaNombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        {/* "Estudiantes": deshabilitado hasta elegir Grado/Grupo Y
            Asignatura — mismo criterio de dependencia que Asignatura arriba
            (depende de Grado/Grupo) y que "Unidad temática asociada" (que
            además depende de Asignatura). Sin elegir nadie a mano queda en
            "todo el grupo", el comportamiento de siempre (ver el comentario
            de `Actividad.matriculasIds`). */}
        <form.Field name="matriculasIds">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Estudiantes</FieldLabel>
              <EstudiantesMultiSelect
                id={field.name}
                estudiantes={matriculas}
                value={field.state.value}
                allSelected={asignarTodoElGrupo}
                onChange={({ matriculaIds, allSelected }) => {
                  field.handleChange(matriculaIds)
                  form.setFieldValue("asignarTodoElGrupo", allSelected)
                }}
                disabled={!hasGradoAsignatura || bloqueadoPorRecuperacion}
                // `isPending` de una query DESHABILITADA (`enabled: false`)
                // queda en `true` para siempre —react-query nunca la corre,
                // así que nunca sale de "pending"—, así que solo cuenta como
                // "cargando" cuando además está habilitada: si no, el
                // trigger mostraba "Cargando…" en vez del placeholder de
                // "elegí grado/asignatura primero" mientras el campo seguía
                // deshabilitado.
                isPending={hasGradoAsignatura && isPendingMatriculas}
                placeholder={hasGradoAsignatura ? "Seleccionar" : "Elegí grado y asignatura primero"}
              />
            </Field>
          )}
        </form.Field>
    </>
  )
}

function MaterialesSection({ form, disabled }: { form: FormActividad; disabled: boolean }) {
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
              maxLength={500}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={4}
              disabled={disabled}
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

function RecursosSection({
  form,
  draftKey,
  disabled,
  actividadId,
}: {
  form: FormActividad
  draftKey: ActividadFormDraftKey
  disabled: boolean
  /** 0 mientras la actividad no se guardo: la biblioteca no se puede
   *  consultar sin una actividad existente (ver el boton mas abajo). */
  actividadId: number
}) {
  // El grupo elegido en el formulario. Es lo que le permite a la biblioteca
  // resolver el alcance del usuario mientras la actividad no existe (al
  // crear); editando manda la actividad y esto queda de respaldo.
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)

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
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  color="primary"
                  size="icon-sm"
                  type="button"
                  onClick={() => setBibliotecaOpen(true)}
                  aria-label="Adjuntar desde biblioteca"
                  // La biblioteca necesita un ancla para resolver el alcance:
                  // la actividad al editar, el grupo al crear (V429). Sin
                  // ninguna de las dos el backend responde 400, así que el
                  // botón espera a que se elija el grupo.
                  disabled={disabled || (actividadId <= 0 && !grupoId)}
                />
              }
            >
              <FolderOpenIcon />
            </TooltipTrigger>
            <TooltipContent>
              {actividadId > 0 || grupoId
                ? "Adjuntar desde biblioteca"
                : "Elegí el grupo para ver los archivos de otras actividades"}
            </TooltipContent>
          </Tooltip>
          {/* Toggle colapsar/expandir. El ícono cambia entre los dos
              estados: `+` outline (expandir) cuando está colapsado, `-`
              fill (colapsar) cuando está expandido. Mismo idioma visual
              que otros accordions del DS, con el `+`/`-` mapeado al
              estado del colapso. Este queda como `fill` + `primary` —
              es la acción primaria de la cabecera, la biblioteca es
              secundaria. */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="fill"
                  color="primary"
                  size="icon-sm"
                  type="button"
                  aria-label={collapsed ? "Expandir sección de recursos" : "Colapsar sección de recursos"}
                  aria-expanded={!collapsed}
                  onClick={() => setCollapsed((v) => !v)}
                  disabled={disabled}
                />
              }
            >
              {collapsed ? <PlusCircleIcon /> : <RemoveCircleOutlineIcon />}
            </TooltipTrigger>
            <TooltipContent>
              {collapsed ? "Expandir sección de recursos" : "Colapsar sección de recursos"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {collapsed ? null : (
        <div className="flex flex-col gap-4">
          {/* Form de alta: SIEMPRE uno solo, vive afuera del `.map()` de la
              lista. Antes había uno por item agregado, lo que duplicaba el
              form N veces y rompía la lectura visual de "estoy agregando
              un nuevo recurso". */}
          {/* `onBlur` en el contenedor (no en cada input): si el foco se
              va de TODO este bloque —no solo entre sus propios campos,
              gracias al chequeo de `relatedTarget`— se agrega el
              borrador solo, igual que ya hace `ListaAgregableField`
              (Objetivos/Contenidos) con `onBlur={agregar}`. Cubre el
              caso de saltar directo al "Guardar" real del form sin
              pasar por "Agregar a la lista": sin esto, ese recurso
              tipeado se perdía en silencio. `handleAddDraft` ya no hace
              nada si el borrador está vacío, así que no agrega filas
              fantasma solo por tabular de un campo a otro. */}
          <div
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) handleAddDraft()
            }}
          >
            <RecursoForm
              draft={draft}
              onChange={updateDraft}
              onAdd={handleAddDraft}
              disabled={disabled}
            />
          </div>

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
                        // "Ver recurso" navega a una ruta aparte, que
                        // desmonta este form entero — se guarda un borrador
                        // con lo que el docente ya tipeó para que "Cerrar"
                        // en la vista previa no lo mande de vuelta a un
                        // form vacío (ver `actividad-form-draft.ts`).
                        onVerRecurso={() =>
                          saveActividadFormDraft(draftKey, form.state.values as Actividad)
                        }
                        disabled={disabled}
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
            actividadId={actividadId}
            grupoId={grupoId ?? 0}
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
  disabled,
}: {
  draft: RecursoDraft
  onChange: (patch: Partial<RecursoDraft>) => void
  onAdd: () => void
  disabled: boolean
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
  // REV: el de "Unidad virtual" pedía un NOMBRE, pero el campo es
  // `type="url"` y lo que escribe va a `draft.url` — el mismo lugar que el
  // tipo "URL". Un ejemplo de enlace de repositorio dice qué se espera de
  // verdad, y de paso es la forma que la vista previa sabe embeber.
  const fuentePlaceholder =
    draft.tipo === "Unidad virtual"
      ? "https://drive.google.com/file/d/..."
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
            disabled={disabled}
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
              // Los cuatro tipos que la vista previa sabe mostrar. Es guía,
              // no validación: el `accept` se puede esquivar y quien decide
              // de verdad es `file-service`.
              {...(draft.tipo === "Archivo" ? { accept: RECURSO_ARCHIVO_ACCEPT } : {})}
              placeholder={fuentePlaceholder}
              maxLength={500}
              // `<input type="file">` no acepta `value` programático (el
              // browser solo permite setearlo a `""` por seguridad —
              // cualquier otro valor tira `InvalidStateError` y revienta
              // el árbol). El archivo se controla vía `e.target.files`
              // dentro de `onChange`, no hace falta pasarle `value`.
              {...(draft.tipo === "Archivo" ? {} : { value: draft.url })}
              onChange={(e) => {
                // `<input type="file">` expone el archivo en
                // `e.target.files[0]`, pero `e.target.value` es el fake
                // path (`C:\fakepath\...`) que el browser pone por
                // seguridad — no sirve para reproducir nada. Hay que
                // armar un blob URL a partir del `File` real para que el
                // preview tenga bytes que mostrarle al `<audio>` /
                // `<video>` / visor de PDF.
                if (draft.tipo === "Archivo") {
                  const file = e.target.files?.[0]
                  // Liberar el blob anterior antes de pisarlo — si el
                  // usuario cambia de archivo no queremos dos blobs
                  // vivos del mismo slot.
                  if (draft.url.startsWith("blob:")) {
                    URL.revokeObjectURL(draft.url)
                  }
                  if (!file) {
                    onChange({ url: "", fuente: "" })
                    return
                  }
                  const blobUrl = URL.createObjectURL(file)
                  // El form guarda el nombre del archivo en `fuente` y se 
                  // lo pasa al resolver, que lo usa como fallback para 
                  // detectar la extensión — los blob URLs no tienen 
                  // extensión en el path y no queríamos meterla en el 
                  // hash (algunos parsers se confunden con el `#`). 
                  onChange({
                    url: blobUrl,
                    fuente: file.name,
                  })
                } else {
                  onChange({ url: e.target.value })
                }
              }}
              className={FuenteIcon ? "pl-9" : undefined}
              disabled={disabled}
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
          maxLength={500}
          value={draft.descripcion}
          onChange={(e) => onChange({ descripcion: e.target.value })}
          disabled={disabled}
        />
      </Field>

      {/* Se oculta (no se deshabilita) mientras el draft no tenga URL ni
          fuente: un item sin referencia no aporta nada en la lista de
          "Recursos agregados", y un botón deshabilitado invita a completar
          el resto de los campos primero cuando en realidad ya alcanza con
          la URL/fuente. */}
      {(draft.url.trim() || draft.fuente.trim()) && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="fill"
            color="primary"
            size="sm"
            type="button"
            onClick={onAdd}
            disabled={disabled}
          >
            <PlusIcon data-icon="inline-start" />
            {/* NO "Guardar" — este botón no guarda la actividad, solo
                agrega el borrador a "Recursos agregados" (ver el
                comentario de `RecursoDraft` más arriba). Con el mismo
                texto que el "Guardar" real del form, el docente lo
                confundía con haber guardado de verdad: llenaba este
                recurso, apretaba el "Guardar" de ABAJO del form entero
                (creyendo que ya había guardado este) y el borrador se
                perdía en silencio — nunca llegó a `form.recursos`. */}
            Agregar a la lista
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
  onVerRecurso,
  disabled,
}: {
  recurso: Recurso
  onRemove: () => void
  onVerRecurso: () => void
  disabled: boolean
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
          title={recurso.fuente || recurso.url}
        >
          {/* Para un archivo manda el nombre; para un enlace, la URL. Antes
              la URL iba primero siempre, y un material de archivo guardado
              —que no tiene URL de este lado— se veía como "(sin URL)". */}
          {recurso.fuente || recurso.url || "(sin URL)"}
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                type="button"
                aria-label="Ver recurso"
                render={
                  // Un material ya guardado no tiene `url` de este lado — su
                  // binario vive en el servidor y se pide por `archivoId`.
                  // Sin esta segunda condición el ojito quedaba apagado justo
                  // para los archivos que sí se pueden previsualizar.
                  recurso.url || recurso.archivoId !== undefined
                    ? (
                      <Link
                        to={paths.app.planeadorRecursoPreview.getHref()}
                        search={{
                          tipo: recurso.tipo,
                          url: recurso.url,
                          fuente: recurso.fuente,
                          titulo: recurso.titulo,
                          descripcion: recurso.descripcion,
                          // Un material ya guardado no tiene bytes de este
                          // lado: la vista previa los pide con este id.
                          archivoId: recurso.archivoId,
                        }}
                        onClick={onVerRecurso}
                      />
                    )
                    : undefined
                }
              />
            }
          >
            <EyeIcon />
          </TooltipTrigger>
          <TooltipContent>Ver recurso</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                type="button"
                aria-label="Quitar de la lista"
                onClick={onRemove}
                disabled={disabled}
              />
            }
          >
            <TrashIcon />
          </TooltipTrigger>
          <TooltipContent>Quitar de la lista</TooltipContent>
        </Tooltip>
      </div>
    </li>
  )
}

/** "Entre 1 y 76", "Al menos 1" o "Hasta 76" según qué extremos trajo el
 *  backend (`ProgramacionActividad.duracionEstimada`/`.semanaCronograma`
 *  pueden traer un solo lado, ver `use-programacion-actividad-query.ts`) —
 *  evita que la descripción del campo asuma que siempre llegan los dos. */
function rangoLabel(min: number | null, max: number | null): string {
  if (min != null && max != null) return `Entre ${min} y ${max}`
  if (min != null) return `Al menos ${min}`
  if (max != null) return `Hasta ${max}`
  return ""
}

/** Ajusta `value` (ya sanitizado a dígitos por `toPositiveDigitsInput`) al
 *  rango `[min, max]` del backend — se llama en `onBlur`, no en cada tecla,
 *  para no trabar al usuario a mitad de tipeo (ver el comentario en el
 *  campo "Duración estimada"). Cadena vacía o límites ausentes: no hay nada
 *  que ajustar. */
function clampDigits(value: string, min: number | undefined | null, max: number | undefined | null): string {
  if (!value) return value
  const n = Number(value)
  if (min != null && n < min) return String(min)
  if (max != null && n > max) return String(max)
  return value
}

/** Mismo criterio que `clampDigits`, pero para el campo "Semana del
 *  cronograma", que además del número simple admite un rango ("10-12") —
 *  cada extremo del rango se ajusta por separado. */
function clampDigitsOrRange(value: string, min: number | undefined | null, max: number | undefined | null): string {
  if (!value) return value
  const partes = value.split("-").map((parte) => clampDigits(parte, min, max))
  return partes.join("-")
}

function ProgramacionSection({ form, disabled }: { form: FormActividad; disabled: boolean }) {
  // Topes reales de esta sección (ventana del periodo académico, días
  // hábiles del horario, duración y semana admitidas) — sin esto, el único
  // aviso de una fecha/duración fuera de rango era el 22023 de
  // `fn_actividad_crear`/`_actualizar` al guardar (`fn_actividad_
  // programacion_assert`, V422). `grupoId`/`asignaturaId` ya viven en el
  // form (ver `AsignaturaGradoSection`), de ahí sale la ventana.
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id)
  const { data: programacion } = useProgramacionActividadQuery(grupoId, asignaturaId, unidadId)
  // Mismo criterio que "Inicio/Fin del período académico" en
  // `form-academic-period.tsx` (Establecimiento): el error solo se muestra
  // tras tocar el campo O tras un intento de guardar (`submissionAttempts`,
  // estado nativo de TanStack Form) — no apenas se monta el form, que sería
  // mostrar "obligatorio" en un campo que el docente ni llegó a mirar
  // todavía.
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  const requerido = (value: string) => (value ? undefined : "Este campo es obligatorio.")

  // Contexto informativo de la ventana de arriba — el backend ya lo manda
  // (`periodoAcademico`/`intensidadHoraria`) pero antes se descartaba sin
  // mostrarlo: el docente veía los topes de fecha aplicados sin saber DE
  // DÓNDE salían ("¿por qué no me deja elegir un martes?").
  const periodoLabel = programacion?.periodoAcademico
    ? `${programacion.periodoAcademico.nombre} (${programacion.periodoAcademico.fechaInicio?.toLocaleDateString("es-CO") ?? "…"} – ${programacion.periodoAcademico.fechaFin?.toLocaleDateString("es-CO") ?? "…"})`
    : null
  const intensidadLabel = programacion?.intensidadHoraria
    ? `Se dicta ${programacion.intensidadHoraria.diasHabiles.map((d) => d.nombre).join(", ")} · ${programacion.intensidadHoraria.bloquesPorSemana} bloque${programacion.intensidadHoraria.bloquesPorSemana === 1 ? "" : "s"} por semana`
    : null

  return (
    <Card className="gap-4 p-4">
      <div>
        <h3 className="text-base font-semibold">Programación</h3>
        {(periodoLabel || intensidadLabel) && (
          <p className="text-muted-foreground mt-1 text-xs">
            {[periodoLabel, intensidadLabel].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <form.Field name="fechaInicio" validators={{ onChange: ({ value }) => requerido(value) }}>
          {(field) => {
            const isInvalid = (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Fecha inicio*</FieldLabel>
                <DatePicker
                  mode="date"
                  id={field.name}
                  value={parseDateValue(field.state.value)}
                  onChange={(date) => {
                    field.handleChange(formatDateValue(date))
                    field.handleBlur()
                  }}
                  minDate={programacion?.fechaInicio.min ?? undefined}
                  maxDate={programacion?.fechaInicio.max ?? undefined}
                  enabledDaysOfWeek={programacion?.fechaInicio.diasHabiles ?? undefined}
                  disabled={disabled}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                {programacion?.fechaInicio.motivo && (
                  <FieldDescription>{programacion.fechaInicio.motivo}</FieldDescription>
                )}
              </Field>
            )
          }}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.fechaInicio}>
          {(fechaInicio) => (
            <form.Field name="fechaCierre" validators={{ onChange: ({ value }) => requerido(value) }}>
              {(field) => {
                const isInvalid =
                  (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
                return (
                  <Field variant="outlined" data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Fecha de entrega o cierre*</FieldLabel>
                    <DatePicker
                      mode="date"
                      id={field.name}
                      value={parseDateValue(field.state.value)}
                      onChange={(date) => {
                        field.handleChange(formatDateValue(date))
                        field.handleBlur()
                      }}
                      // La fecha ya elegida en "Fecha inicio" manda sobre el
                      // mínimo del backend: no tiene sentido ofrecer un cierre
                      // anterior a un inicio que el propio docente ya puso.
                      minDate={
                        parseDateValue(fechaInicio) ?? programacion?.fechaCierre.min ?? undefined
                      }
                      maxDate={programacion?.fechaCierre.max ?? undefined}
                      enabledDaysOfWeek={programacion?.fechaCierre.diasHabiles ?? undefined}
                      disabled={disabled}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    {programacion?.fechaCierre.motivo && (
                      <FieldDescription>{programacion.fechaCierre.motivo}</FieldDescription>
                    )}
                  </Field>
                )
              }}
            </form.Field>
          )}
        </form.Subscribe>

        <form.Field name="duracionEstimada">
          {(field) => (
            <Field variant="outlined">
              {/* Pedido explícito: el campo se captura y se lee en MINUTOS,
                  aunque `programacion.duracionEstimada.unidad`/`.motivo`
                  (`FieldDescription` de abajo) venga en "bloques" — esos son
                  los topes de validación que expone ese otro endpoint, no la
                  unidad en la que el docente carga el dato acá. */}
              <FieldLabel htmlFor={field.name}>Duración estimada (minutos)</FieldLabel>
              {/* `type="text"` + `inputMode="numeric"` y no `type="number"`:
                  mismo criterio que el resto de la app (ver `text-input.ts`)
                  — un `number` acepta notación como `1e5` y no sirve para
                  un conteo simple. Solo dígitos, sin la unidad mezclada en
                  el valor, a lo sumo 3 (hasta 999) y sin `0`
                  (`toPositiveDigitsInput`): "0 minutos" no es una duración
                  válida. */}
              <Input
                id={field.name}
                inputMode="numeric"
                placeholder="Ej: 20"
                maxLength={3}
                value={field.state.value}
                onChange={(e) => field.handleChange(toPositiveDigitsInput(e.target.value, 3))}
                // A diferencia de Fecha inicio/cierre (bloqueadas en el propio
                // picker), acá no hay forma de impedir tipear un número fuera
                // de rango mientras se escribe sin trabar al usuario a mitad
                // de tipeo (escribir "3" cuando el mínimo es "30" clampearía
                // antes de poder completar "35"). Se ajusta recién al perder
                // el foco, mismo criterio no intrusivo que el resto de la
                // app usa para validar rangos numéricos libres.
                onBlur={(e) => {
                  field.handleBlur()
                  field.handleChange(
                    clampDigits(
                      e.target.value,
                      programacion?.duracionEstimada.min,
                      programacion?.duracionEstimada.max,
                    ),
                  )
                }}
                disabled={disabled}
              />
              {programacion?.duracionEstimada &&
                (programacion.duracionEstimada.min != null || programacion.duracionEstimada.max != null) && (
                  <FieldDescription>
                    {rangoLabel(programacion.duracionEstimada.min, programacion.duracionEstimada.max)}{" "}
                    {(programacion.duracionEstimada.unidad ?? "bloques").toLowerCase()}.
                  </FieldDescription>
                )}
              {programacion?.duracionEstimada.motivo && (
                <FieldDescription>{programacion.duracionEstimada.motivo}</FieldDescription>
              )}
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
                maxLength={5}
                value={field.state.value}
                onChange={(e) => field.handleChange(toDigitsOrRangeInput(e.target.value))}
                // Mismo criterio que "Duración estimada": clampea cada
                // extremo del rango recién al perder el foco, no en cada
                // tecla.
                onBlur={(e) => {
                  field.handleBlur()
                  field.handleChange(
                    clampDigitsOrRange(
                      e.target.value,
                      programacion?.semanaCronograma.min,
                      programacion?.semanaCronograma.max,
                    ),
                  )
                }}
                disabled={disabled}
              />
              {programacion?.semanaCronograma &&
                (programacion.semanaCronograma.min != null || programacion.semanaCronograma.max != null) && (
                  <FieldDescription>
                    Entre la semana{" "}
                    {rangoLabel(programacion.semanaCronograma.min, programacion.semanaCronograma.max)} del periodo
                    académico.
                  </FieldDescription>
                )}
              {programacion?.semanaCronograma.motivo && (
                <FieldDescription>{programacion.semanaCronograma.motivo}</FieldDescription>
              )}
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
                disabled={disabled}
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
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
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
  // Señal PURA de "¿el referente de la unidad es Evaluativo?", sin mezclar
  // el `esEvaluativa` que el usuario tenga elegido AHORA en el toggle: se
  // pide siempre con `ES_EVALUATIVA=S`, que en la fórmula del backend
  // (`visible = referente_evaluativo AND ES_EVALUATIVA <> 'N'`) deja
  // `visible` igual a "es evaluativo". Sin esto, una actividad que arranca
  // (o quedó guardada) con `esEvaluativa: false` bloqueaba su propio
  // selector "¿Es evaluación sumativa?" — nunca se podía poner en "Sí" —
  // aunque el referente de la unidad fuera Evaluativo: `camposEfectivos`
  // abajo ya viene calculado CON ese `false`, así que usarlo también para
  // decidir si el referente es formativo era un candado, no una detección.
  const { data: configuracionReferente } = useConfiguracionActividadQuery(unidadId, true)
  const { data: referenteDeGradoAsignatura } = useReferenteCurricularQuery(
    sinUnidadNiDetalle ? gradoId : undefined,
    sinUnidadNiDetalle ? asignaturaId : undefined,
  )
  // `campos_disponibles` (con `recuperacion`, el bloque que `RecuperacionSection`
  // necesita para ofrecer destino/tipoAplicación/tipoCalculo) para una
  // actividad SIN unidad — `useConfiguracionActividadQuery` de arriba exige
  // `unidadId` y acá no hay. Sin esto, una actividad huérfana (o una
  // recuperación recién autocompletada por `useRecuperacionAutoFill`, que
  // no toca "Unidad temática asociada") se quedaba sin `camposEfectivos`
  // para siempre, así que el bloque de recuperación nunca terminaba de
  // aparecer aunque Grado/Grupo/Asignatura ya estuvieran resueltos.
  const { data: configuracionContexto } = useConfiguracionContextoActividadQuery(
    sinUnidadNiDetalle ? grupoId : undefined,
    sinUnidadNiDetalle ? asignaturaId : undefined,
    esEvaluativaValue,
  )

  // `TIPO_EVALUACION` del referente (CUANTITATIVA / CUALITATIVA /
  // CUANTITATIVA_CUALITATIVA) — con unidad elegida sale de su referente
  // (`useUnidadReferenteQuery`, mismo dato que ya trae `esFormativo`);
  // huérfana o de alta, del referente en vivo por grado/asignatura, igual
  // que `esFormativa` arriba. Determina qué tipos de "Escala de
  // valoración" puede elegir el docente (ver `EscalaValoracionSection`).
  const { data: unidadReferente } = useUnidadReferenteQuery(unidadId)
  const tipoEvaluacion =
    unidadId != null ? (unidadReferente?.tipoEvaluacion ?? null) : (referenteDeGradoAsignatura?.tipoEvaluacion ?? null)

  // Fuente de verdad efectiva para "qué mostrar/exigir": la foto fija del
  // detalle si sigue aplicando, si no la configuración en vivo por unidad
  // (alta, o huérfana recién vinculada) — la usa tanto `esFormativa` como
  // los asteriscos de "obligatorio" y el catálogo de instrumentos permitidos.
  const camposEfectivos = camposDisponiblesAplica
    ? camposDisponibles
    : unidadId != null
      ? configuracionEnVivo
      : configuracionContexto

  // Con unidad, `esFormativa` sale de `configuracionReferente` (fijo en
  // `ES_EVALUATIVA=S`, ver arriba) — NUNCA de `camposEfectivos`, que sí
  // varía con el `esEvaluativa` actual del form y por eso no sirve para
  // decidir si el referente ADMITE ponerlo en "Sí". Sin unidad (huérfana o
  // alta sin unidad todavía), `referenteDeGradoAsignatura?.esFormativo` ya
  // es independiente del toggle.
  const esFormativa =
    unidadId != null
      ? configuracionReferente != null && configuracionReferente.evaluacion.visible === false
      : !sinGradoNiAsignatura && (referenteDeGradoAsignatura?.esFormativo ?? false)

  return { camposEfectivos, esFormativa, tipoEvaluacion }
}

function EvaluacionSection({
  form,
  unidades,
  camposEfectivos,
  esFormativa,
  esRecuperacion,
  tipoEvaluacion,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  /** Ver `useCamposEvaluacionEfectivos`, calculado una sola vez en
   *  `EditarActividadForm`. */
  camposEfectivos: ReturnType<typeof useCamposEvaluacionEfectivos>["camposEfectivos"]
  esFormativa: boolean
  /** Regla de la guía de recuperación: una actividad de recuperación
   *  siempre es sumativa — bloquea el select y fuerza el valor a "Sí",
   *  igual que `esFormativa` hace lo opuesto. */
  esRecuperacion: boolean
  /** `TIPO_EVALUACION` del referente — ver `EscalaValoracionSection`. */
  tipoEvaluacion: ReturnType<typeof useCamposEvaluacionEfectivos>["tipoEvaluacion"]
  disabled: boolean
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

  // Mismo criterio, regla inversa: "recuperación siempre sumativa". No
  // compiten entre sí — `RecuperacionSection` ya oculta "Es una
  // recuperación" cuando el referente es formativo (mismo `campos_
  // disponibles.recuperacion.visible` de la guía), así que las dos nunca
  // están en `true` a la vez.
  useEffect(() => {
    if (esRecuperacion) form.setFieldValue("esEvaluativa", true)
  }, [esRecuperacion, form])

  // Catálogo `INSTRUMENTO_EVALUACION` (`TLISTA_VALOR`) — antes hardcodeado
  // acá mismo. Filtrado por `camposEfectivos.evaluacion.instrumentosPermitidos`
  // (regla confirmada: un referente EVALUATIVO solo permite ciertos
  // instrumentos, no el catálogo completo) — sin foto/config resuelta
  // todavía, o con la lista vacía, se muestra el catálogo completo en vez
  // de dejar el select sin opciones.
  const { data: instrumentos = [] } = useInstrumentoEvaluacionCatalogQuery()
  const instrumentosPermitidos = camposEfectivos?.evaluacion.instrumentosPermitidos
  const instrumentosPermitidosLabels = instrumentosPermitidos?.map(instrumentoPermitidoLabel)
  const instrumentosDisponibles =
    instrumentosPermitidosLabels && instrumentosPermitidosLabels.length > 0
      ? instrumentos.filter((instrumento) => instrumentosPermitidosLabels.includes(instrumento))
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
                disabled={esFormativa || esRecuperacion || disabled}
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
                <Select
                  value={field.state.value}
                  onValueChange={(v) => v && field.handleChange(v)}
                  disabled={disabled}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Seleccione">
                      {(value) =>
                        !value ? "Seleccione" : value === "Otro" ? "Otro (personalizado)" : (value as string)
                      }
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
          <InstrumentoEvaluacionSection
            form={form}
            unidades={unidades}
            tipoEvaluacion={tipoEvaluacion}
            camposEfectivos={camposEfectivos}
            disabled={disabled}
          />

          {/* Ponderación/Puntaje va AL FINAL, después de la definición del
              instrumento (Rúbrica/Lista de cotejo). La lectura del form es:
                1. ¿Es sumativa?  →  2. ¿Con qué instrumento?  →
                3. definición del instrumento  →  4. ¿Cuánto pesa?
              Si la respuesta a (1) es "No", (4) desaparece (no aplica).

              (4) sale de `camposEfectivos.ponderacion` — la MISMA fuente de
              verdad que ya resuelve el backend (`visible`/`modo`/`motivo`),
              no de re-derivar el `metodoCalculo` de la unidad en el cliente
              (versión anterior de esta sección): `modo` ya viene resuelto
              como "PORCENTAJE" (→ `ponderacion`, unidad "Ponderado") o
              "PUNTAJE" (→ `notaMaxima`, unidad "Suma de puntos"); sin
              `visible` (p. ej. "Promedio simple", donde nada de esto
              aplica) se muestra el `motivo` que ya trae la respuesta, en
              vez de un texto fijo adivinando por qué. */}
          <form.Subscribe selector={(state) => state.values.esEvaluativa}>
            {(esEvaluativa) => {
              if (!esEvaluativa) return null
              const ponderacionInfo = camposEfectivos?.ponderacion
              if (!ponderacionInfo?.visible) {
                return ponderacionInfo?.motivo ? (
                  <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-2 rounded-md border p-3 text-sm">
                    <InfoIcon className="mt-0.5 size-4 shrink-0" />
                    {ponderacionInfo.motivo}
                  </div>
                ) : null
              }
              if (ponderacionInfo.modo === "PUNTAJE") {
                return (
                  <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <form.Field name="notaMaxima">
                      {(notaMaximaField) => (
                        <Field variant="outlined">
                          <FieldLabel htmlFor={notaMaximaField.name}>
                            Puntaje{ponderacionInfo.requerido ? " *" : ""}
                          </FieldLabel>
                          <Input
                            id={notaMaximaField.name}
                            type="number"
                            min={0}
                            value={notaMaximaField.state.value ?? ""}
                            onChange={(e) =>
                              notaMaximaField.handleChange(e.target.value === "" ? undefined : Number(e.target.value))
                            }
                            disabled={disabled}
                          />
                        </Field>
                      )}
                    </form.Field>
                  </div>
                )
              }
              // `modo === "PORCENTAJE"`, o `visible` sin `modo` todavía
              // resuelto: cae al campo de siempre en vez de no mostrar nada.
              return (
                <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  <form.Field name="ponderacion">
                    {(ponderacionField) => (
                      <Field variant="outlined">
                        <FieldLabel htmlFor={ponderacionField.name}>
                          Ponderación (%){ponderacionInfo.requerido ? " *" : ""}
                        </FieldLabel>
                        <Input
                          id={ponderacionField.name}
                          type="number"
                          min={0}
                          max={100}
                          value={ponderacionField.state.value}
                          onChange={(e) => ponderacionField.handleChange(Number(e.target.value))}
                          disabled={disabled}
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>
              )
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
  tipoEvaluacion,
  camposEfectivos,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  tipoEvaluacion: string | null
  /** Ver `useCamposEvaluacionEfectivos` — solo se usa acá para llegarle a
   *  `InstrumentoPersonalizadoSection` la ficha dinámica de "Otro"
   *  (`evaluacion.instrumentosPermitidos[].campos`). */
  camposEfectivos: ReturnType<typeof useCamposEvaluacionEfectivos>["camposEfectivos"]
  disabled: boolean
}) {
  return (
    <form.Subscribe selector={(state) => state.values.instrumento}>
      {(instrumento) =>
        // Sin instrumento elegido no hay nada que definir todavía — antes
        // caía al mismo `else` que "Rúbrica" y mostraba de arranque la
        // sección de Criterios sin que el docente hubiera elegido nada en
        // "Instrumento de evaluación".
        !instrumento ? null : instrumento === "Lista de cotejo" ? (
          <ListaCotejoSection form={form} disabled={disabled} />
        ) : instrumento === "Escala de valoración" ? (
          <EscalaValoracionSection
            form={form}
            unidades={unidades}
            tipoEvaluacion={tipoEvaluacion}
            disabled={disabled}
          />
        ) : instrumento === "Otro" ? (
          <InstrumentoPersonalizadoSection
            form={form}
            unidades={unidades}
            tipoEvaluacion={tipoEvaluacion}
            camposOtro={
              camposEfectivos?.evaluacion.instrumentosPermitidos.find((item) => item.valor === "OTRO")?.campos ??
              null
            }
            disabled={disabled}
          />
        ) : (
          <RubricasSection form={form} disabled={disabled} />
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
function ListaCotejoSection({ form, disabled }: { form: FormActividad; disabled: boolean }) {
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Definición Lista de Cotejo</h3>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="fill"
                color="primary"
                size="icon-sm"
                type="button"
                aria-label="Agregar ítem"
                disabled={disabled}
                onClick={() => {
                  const listaCotejo = form.getFieldValue("listaCotejo") as ListaCotejo
                  form.setFieldValue("listaCotejo", {
                    ...listaCotejo,
                    items: [...listaCotejo.items, { id: cryptoId(), descripcion: "" }],
                  })
                }}
              />
            }
          >
            <PlusCircleIcon />
          </TooltipTrigger>
          <TooltipContent>Agregar ítem</TooltipContent>
        </Tooltip>
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
                      disabled={disabled}
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
  disabled,
  onChange,
  onRemove,
}: {
  item: ListaCotejoItem
  index: number
  esEvaluativa: boolean
  disabled: boolean
  onChange: (next: ListaCotejoItem) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Ítem {index + 1}</h4>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                type="button"
                aria-label={`Quitar ítem ${index + 1}`}
                disabled={disabled}
                onClick={onRemove}
              />
            }
          >
            <TrashIcon />
          </TooltipTrigger>
          <TooltipContent>{`Quitar ítem ${index + 1}`}</TooltipContent>
        </Tooltip>
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
            maxLength={500}
            value={item.descripcion}
            onChange={(e) => onChange({ ...item, descripcion: e.target.value })}
            disabled={disabled}
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
              disabled={disabled}
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
  tipoEvaluacion,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  /** `TIPO_EVALUACION` del referente de la unidad/grado-asignatura
   *  ("CUANTITATIVA" | "CUALITATIVA" | "CUANTITATIVA_CUALITATIVA"). `null`
   *  (todavía sin resolver, o referente sin este dato) se trata como
   *  "ambas": no restringe nada, mismo comportamiento que antes de este
   *  campo existir. */
  tipoEvaluacion: string | null
  disabled: boolean
}) {
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id) || undefined
  const unidadActual = unidades.find((u) => u.id === unidadId)

  // Con "CUANTITATIVA" el referente solo admite escala Numérica; con
  // "CUALITATIVA" solo Cualitativa. "CUANTITATIVA_CUALITATIVA" (o sin dato
  // todavía) admite las dos, igual que siempre.
  const permiteNumerica = tipoEvaluacion !== "CUALITATIVA"
  const permiteCualitativa = tipoEvaluacion !== "CUANTITATIVA"

  // Si el docente ya tenía elegida la escala que el referente acaba de
  // dejar de admitir (cambió de unidad/grado a una con TIPO_EVALUACION más
  // restrictivo), se corrige acá al único tipo que queda permitido — el
  // radio de esa opción ya ni se muestra (ver abajo), así que sin esto el
  // VALOR guardado quedaría en un tipo que el usuario no puede ni ver para
  // volver a elegir (mismo criterio que `esFormativa` más arriba).
  const escalaTipoActual = useSelector(form.store, (state) => state.values.escalaValoracion.tipo)
  useEffect(() => {
    if (escalaTipoActual === "Numérica" && !permiteNumerica) {
      form.setFieldValue("escalaValoracion", (prev) => ({ ...prev, tipo: "Cualitativa" }))
    } else if (escalaTipoActual === "Cualitativa" && !permiteCualitativa) {
      form.setFieldValue("escalaValoracion", (prev) => ({ ...prev, tipo: "Numérica" }))
    }
  }, [escalaTipoActual, permiteNumerica, permiteCualitativa, form])

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
                          maxLength={50}
                          value={escala.criteriosGenerales}
                          onChange={(e) => updateEscala({ criteriosGenerales: e.target.value })}
                          disabled={disabled}
                        />
                      </Field>

                      <Field variant="outlined">
                        <FieldLabel>Escala</FieldLabel>
                        <RadioGroup
                          className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
                          value={escala.tipo}
                          disabled={disabled}
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
                          {/* El referente puede restringir a un solo tipo
                              (TIPO_EVALUACION CUANTITATIVA/CUALITATIVA): la
                              opción que no admite ni se muestra, no solo se
                              deshabilita — no tiene sentido ofrecer una
                              escala que el referente no permite. */}
                          {permiteNumerica && (
                            <label className="flex items-center gap-2">
                              <RadioGroupItem value="Numérica" className="data-checked:bg-primary" />
                              Numérica
                            </label>
                          )}
                          {permiteCualitativa && (
                            <label className="flex items-center gap-2">
                              <RadioGroupItem
                                value="Cualitativa"
                                className="data-checked:bg-primary"
                              />
                              Cualitativa
                            </label>
                          )}
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
                              disabled={disabled}
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
                              disabled={disabled}
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
                            maxLength={500}
                            value={escala.interpretacionRangos}
                            onChange={(e) =>
                              updateEscala({ interpretacionRangos: e.target.value })
                            }
                            disabled={disabled}
                          />
                        </Field>
                      </>
                    )}

                    {escala.tipo === "Cualitativa" && (
                      <div className="mt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Definiciones cualitativas</h4>
                          <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="fill"
                                color="primary"
                                size="icon-sm"
                                type="button"
                                aria-label="Agregar definición cualitativa"
                                disabled={disabled}
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
                              />
                            }
                          >
                            <PlusCircleIcon />
                          </TooltipTrigger>
                          <TooltipContent>Agregar definición cualitativa</TooltipContent>
                          </Tooltip>
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
                                  maxLength={50}
                                  value={nivel.nombre}
                                  onChange={(e) => updateNivel(nIndex, { nombre: e.target.value })}
                                  disabled={disabled}
                                />
                                <Input
                                  variant="outlined"
                                  placeholder="Interpretación / descriptor"
                                  maxLength={50}
                                  value={nivel.descripcion}
                                  onChange={(e) =>
                                    updateNivel(nIndex, { descripcion: e.target.value })
                                  }
                                  disabled={disabled}
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
                                      disabled={disabled}
                                    />
                                  </Field>
                                )}
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        color="neutral"
                                        size="icon-sm"
                                        type="button"
                                        aria-label={`Quitar nivel ${nivel.nombre}`}
                                        disabled={disabled}
                                        onClick={() => removeNivel(nIndex)}
                                      />
                                    }
                                  >
                                    <TrashIcon />
                                  </TooltipTrigger>
                                  <TooltipContent>{`Quitar nivel ${nivel.nombre}`}</TooltipContent>
                                </Tooltip>
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
  tipoEvaluacion,
  camposOtro,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  tipoEvaluacion: string | null
  /** Ficha dinámica de "Otro (personalizado)" (`campos_disponibles.
   *  evaluacion.instrumentosPermitidos[valor=OTRO].campos`, confirmado
   *  real) — trae los catálogos de "Tipo de evidencia esperada"/"Método de
   *  valoración" que admite el referente puntual, en vez de las mismas 4/3
   *  opciones fijas para cualquier grado/asignatura/tipo de evaluación.
   *  `null` mientras no resuelve (foto vieja, endpoint viejo): cae a un
   *  catálogo fijo para no dejar el form sin nada que elegir. */
  camposOtro: InstrumentoPermitidoCampos | null
  disabled: boolean
}) {
  const tipoEvidenciaCatalogo =
    camposOtro?.tipoEvidencia.catalogo && camposOtro.tipoEvidencia.catalogo.length > 0
      ? camposOtro.tipoEvidencia.catalogo
      : TIPO_EVIDENCIA_ESPERADA_CATALOGO_DEFAULT
  const metodoValoracionCatalogo =
    camposOtro?.metodoValoracion.catalogo && camposOtro.metodoValoracion.catalogo.length > 0
      ? camposOtro.metodoValoracion.catalogo
      : METODO_VALORACION_CATALOGO_DEFAULT
  const descripcionMaxLength = camposOtro?.descripcionInstrumento.maxLength ?? 4000

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
                  maxLength={descripcionMaxLength}
                  value={value.descripcion}
                  onChange={(e) => patch({ descripcion: e.target.value })}
                  disabled={disabled}
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
                    disabled={disabled}
                  >
                    <SelectTrigger id="instrumentoPersonalizado-tipo-evidencia">
                      <SelectValue placeholder="Seleccione">
                        {(v) => TIPO_EVIDENCIA_ESPERADA_LABELS[v as string] ?? (v as string) ?? "Seleccione"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {tipoEvidenciaCatalogo.map((opcion) => (
                        <SelectItem key={opcion.pk} value={opcion.nombre}>
                          {TIPO_EVIDENCIA_ESPERADA_LABELS[opcion.nombre] ?? opcion.nombre}
                        </SelectItem>
                      ))}
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
                    disabled={disabled}
                  >
                    <SelectTrigger id="instrumentoPersonalizado-metodo-valoracion">
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      {metodoValoracionCatalogo.map((opcion) => (
                        <SelectItem key={opcion.pk} value={opcion.nombre}>
                          {opcion.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Va entre "Método de valoración" y los checkboxes: el
                  método elegido monta acá mismo su definición completa
                  (misma sección/mismos datos que si fuera el `instrumento`
                  de arriba), antes de las preguntas de entrega. */}
              {value.metodoValoracion === "Rúbrica" ? (
                <RubricasSection form={form} disabled={disabled} />
              ) : value.metodoValoracion === "Lista de cotejo" ? (
                <ListaCotejoSection form={form} disabled={disabled} />
              ) : value.metodoValoracion === "Escala de valoración" ? (
                <EscalaValoracionSection
                  form={form}
                  unidades={unidades}
                  tipoEvaluacion={tipoEvaluacion}
                  disabled={disabled}
                />
              ) : null}

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.requiereArchivo}
                    onCheckedChange={(next) => patch({ requiereArchivo: next === true })}
                    disabled={disabled}
                  />
                  El estudiante debe adjuntar un archivo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.requiereRespuestaTexto}
                    onCheckedChange={(next) => patch({ requiereRespuestaTexto: next === true })}
                    disabled={disabled}
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

function RubricasSection({ form, disabled }: { form: FormActividad; disabled: boolean }) {
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Definición de Rúbricas</h3>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="fill"
                color="primary"
                size="icon-sm"
                type="button"
                aria-label="Agregar criterio"
                disabled={disabled}
                onClick={() => {
                  const rubrica = form.getFieldValue("rubrica") as {
                    id: number
                    criterios: Criterio[]
                  }
                  form.setFieldValue("rubrica", {
                    ...rubrica,
                    criterios: [
                      ...rubrica.criterios,
                      { id: cryptoId(), nombre: "", excelente: "", niveles: [], ponderacion: 0 },
                    ],
                  })
                }}
              />
            }
          >
            <PlusCircleIcon />
          </TooltipTrigger>
          <TooltipContent>Agregar criterio</TooltipContent>
        </Tooltip>
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
                      disabled={disabled}
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
  disabled,
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
  disabled: boolean
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                type="button"
                aria-label={`Quitar criterio ${index + 1}`}
                disabled={disabled}
                onClick={onRemove}
              />
            }
          >
            <TrashIcon />
          </TooltipTrigger>
          <TooltipContent>{`Quitar criterio ${index + 1}`}</TooltipContent>
        </Tooltip>
      </div>

      {/* Cada control usa `Field variant="outlined"` con `FieldLabel`
          adentro: el label queda flotando sobre el borde (estilo MUI
          TextField). `text-sm font-semibold` del `Criterio N` y de
          `Excelente` son títulos estáticos, no labels de campo. */}
      <Field variant="outlined" className="mt-3">
        <FieldLabel>Nombre del criterio</FieldLabel>
        <Input
          placeholder="Ej: Expresión oral de ideas y experiencias"
          maxLength={50}
          value={criterio.nombre}
          onChange={(e) => onChange({ ...criterio, nombre: e.target.value })}
          disabled={disabled}
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
            maxLength={500}
            value={criterio.excelente}
            onChange={(e) => onChange({ ...criterio, excelente: e.target.value })}
            disabled={disabled}
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
                disabled={disabled}
              />
            </Field>
          )}
          {/* Tachito a la derecha del textarea — quita el bloque entero
              (texto Y puntaje), no solo el texto. */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  type="button"
                  aria-label="Quitar excelente"
                  disabled={disabled}
                  onClick={() =>
                    onChange({ ...criterio, excelente: "", excelentePonderacion: undefined })
                  }
                />
              }
            >
              <TrashIcon />
            </TooltipTrigger>
            <TooltipContent>Quitar excelente</TooltipContent>
          </Tooltip>
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
              maxLength={500}
              value={nivel.descripcion}
              onChange={(e) => {
                const next = criterio.niveles.slice()
                next[nIndex] = { ...nivel, descripcion: e.target.value }
                onChange({ ...criterio, niveles: next })
              }}
              disabled={disabled}
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
                  disabled={disabled}
                />
              </Field>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    type="button"
                    aria-label={`Quitar nivel ${nivel.nombre}`}
                    disabled={disabled}
                    onClick={() => {
                      const next = criterio.niveles.slice()
                      next.splice(nIndex, 1)
                      onChange({ ...criterio, niveles: next })
                    }}
                  />
                }
              >
                <TrashIcon />
              </TooltipTrigger>
              <TooltipContent>{`Quitar nivel ${nivel.nombre}`}</TooltipContent>
            </Tooltip>
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
            maxLength={50}
            value={nivelInput}
            onChange={(e) => setNivelInput(e.target.value)}
            disabled={disabled}
          />
          <Button
            variant="fill"
            color="primary"
            size="default"
            className="rounded-l-none border-l-0"
            type="button"
            disabled={disabled}
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
          disabled={disabled}
        />
      </Field>
    </li>
  )
}

function AdaptacionesSection({
  form,
  estudiantes,
  disabled,
}: {
  form: FormActividad
  estudiantes: Estudiante[]
  disabled: boolean
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
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="fill"
                        color="primary"
                        size="icon-sm"
                        type="button"
                        aria-label="Agregar adaptación"
                        disabled={disabled}
                        onClick={add}
                      />
                    }
                  >
                    <PlusCircleIcon />
                  </TooltipTrigger>
                  <TooltipContent>Agregar adaptación</TooltipContent>
                </Tooltip>
              </div>

              {adaptaciones.length > 0 && (
                <ul className="mt-3 flex flex-col gap-3">
                  {adaptaciones.map((adapt, aIndex) => (
                    <AdaptacionItem
                      key={aIndex}
                      index={aIndex}
                      adaptacion={adapt}
                      estudiantes={estudiantes}
                      disabled={disabled}
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
  disabled,
  onChange,
  onRemove,
}: {
  index: number
  adaptacion: Adaptacion
  estudiantes: Estudiante[]
  disabled: boolean
  onChange: (next: Adaptacion) => void
  onRemove: () => void
}) {
  return (
    <li className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Adaptación {index + 1}</h4>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                type="button"
                aria-label={`Quitar adaptación ${index + 1}`}
                disabled={disabled}
                onClick={onRemove}
              />
            }
          >
            <TrashIcon />
          </TooltipTrigger>
          <TooltipContent>{`Quitar adaptación ${index + 1}`}</TooltipContent>
        </Tooltip>
      </div>

      <Field variant="outlined" className="mt-3">
        <FieldLabel>¿Qué tipo de adaptación requiere esta actividad?</FieldLabel>
        <Select
          value={adaptacion.tipo as never}
          onValueChange={(value) =>
            onChange({ ...adaptacion, tipo: (value ?? "") as Adaptacion["tipo"] })
          }
          disabled={disabled}
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
          disabled={disabled}
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
          disabled={disabled}
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
              disabled={disabled}
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
            maxLength={500}
            value={adaptacion.versionModificadaRef}
            onChange={(e) =>
              onChange({ ...adaptacion, versionModificadaRef: e.target.value })
            }
            disabled={disabled}
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
            disabled={disabled}
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
          disabled={disabled}
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
                      disabled={disabled}
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
function SeguimientoSection({ form, disabled }: { form: FormActividad; disabled: boolean }) {
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
                  disabled={disabled}
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
                      disabled={!field.state.value || disabled}
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
                disabled={disabled}
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
              maxLength={500}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              disabled={disabled}
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
  instrumentoLabel = UNIDAD_TAB_FALLBACK,
  gradoId,
  asignaturaId,
  disabled = false,
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
  /** Rótulo real del instrumento ("Proyecto pedagógico" en Preescolar,
   *  "Unidad temática" en el resto) — mismo dato que ya resuelve
   *  `UnidadAsociadaSection` para el `<Select>` de al lado. Sin esto el
   *  título/tooltip/botón de este popover decían "unidad temática" fijo
   *  incluso creando un proyecto pedagógico. */
  instrumentoLabel?: string
  /** Grado/Asignatura de la actividad que abre este popover — la unidad
   *  nueva nace con los mismos (una unidad se identifica por esos dos, ver
   *  `IdentificacionSection`), así que acá no se vuelven a pedir. También
   *  gobiernan "Derechos" (`useEnunciadosDbaQuery`) y si se puede guardar:
   *  sin ellos no hay contra qué resolver el referente de la unidad. */
  gradoId: number | undefined
  asignaturaId: number | undefined
  /** `true` mientras Grado/Asignatura de la actividad (no del popover, que no
   *  pide ninguno de los dos) todavía no se eligieron — ver `disabled` en
   *  `EditarActividadForm`. */
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [nombre, setNombre] = React.useState("")
  const [contenidos, setContenidos] = React.useState<string[]>([])
  const [objetivos, setObjetivos] = React.useState<string[]>([])
  const [descripcion, setDescripcion] = React.useState("")
  const [enunciadosDba, setEnunciadosDba] = React.useState<{ id: number; text: string }[]>([])
  const [metodoCalculo, setMetodoCalculo] = React.useState<MetodoCalculo>("Ponderado")
  const [isSaving, setIsSaving] = React.useState(false)
  const { notify } = useNotify()
  // Sin "nuevo/nueva": el rótulo del instrumento lo define el referente
  // curricular y concordar el artículo con él obligaba a una regla de género
  // que ya venía dando "Crear nuevoa unidad temática".
  const crearLabel = `Crear ${instrumentoLabel.toLowerCase()}`

  const {
    enunciados: enunciadosDisponibles,
    nombre: referenteNombre,
    descripcion: referenteDescripcion,
    nivel1Etiqueta,
    isPending: isPendingEnunciados,
  } = useEnunciadosDbaQuery(gradoId, asignaturaId)

  // Mismo criterio que `UnidadInfoGeneralFields`: una unidad de enfoque
  // Formativo no tiene "Método de cálculo" (esa unidad no admite actividades
  // sumativas, ver el comentario de `UnidadAsociadaSection` más arriba), así
  // que el campo no tiene sentido mostrarlo acá tampoco.
  const { data: referenteDeGradoAsignatura } = useReferenteCurricularQuery(gradoId, asignaturaId)
  const esFormativa = referenteDeGradoAsignatura?.esFormativo ?? false

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
  // Si falla, se avisa con `notify` acá mismo (no hay interceptor global que
  // lo haga por este camino) y el popover se queda abierto con lo tipeado —
  // cerrarlo/limpiarlo igual habría hecho parecer que la unidad se creó
  // cuando no, dejando al usuario sin saber por qué "Guardar" no hizo nada.
  const guardar = async () => {
    if (!nombre.trim() || !hasGradoAsignatura || isSaving) return
    setIsSaving(true)
    try {
      await onCreate({ nombre: nombre.trim(), contenidos, objetivos, descripcion, enunciadosDba, metodoCalculo })
      reset()
      setOpen(false)
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={(next) => {
      setOpen(next)
      if (!next) reset()
    }}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="fill"
                  color="primary"
                  size="icon-sm"
                  aria-label={crearLabel}
                  // Sin Grado/Asignatura elegidos, adentro no se puede
                  // guardar nada (`guardar` corta en seco sin
                  // `hasGradoAsignatura`) — antes el botón abría igual el
                  // popover, y adentro aparecía un banner azul explicando
                  // por qué no se podía usar. Deshabilitarlo acá evita
                  // abrir un popover que no sirve para nada todavía.
                  disabled={disabled || !hasGradoAsignatura}
                  // `size-11` para igualar la altura del `SelectTrigger` (h-11);
                  // `shrink-0` para que el flex del call site no lo aplaste.
                  // Si el call site pasa `className` (típico `rounded-l-none
                  // border-l-0` para split-button), gana sobre el `rounded-md`
                  // base porque va al final.
                  className={cn("size-11 shrink-0 rounded-md", className)}
                />
              }
            />
          }
        >
          <PlusCircleIcon />
        </TooltipTrigger>
        <TooltipContent>
          {hasGradoAsignatura ? crearLabel : "Elegí Grado/Grupo y Asignatura de la actividad primero."}
        </TooltipContent>
      </Tooltip>
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
        {/* `line-clamp-2` + `title`: el rótulo sale del referente curricular y
          admite 400 caracteres, que dentro de un popover de ancho fijo se
          convertían en un título de quince líneas empujando el formulario. */}
        <h3 className="line-clamp-2 border-b px-4 py-3 text-base font-semibold" title={crearLabel}>
          {crearLabel}
        </h3>

        {/* El banner de "Elegí Grado/Grupo y Asignatura primero" que vivía
            acá ya no hace falta: el trigger de este popover está
            deshabilitado (con tooltip que explica por qué) mientras falten,
            así que no hay forma de llegar a ver este contenido sin
            `hasGradoAsignatura`. */}

        <div className="scrollbar-slim flex max-h-[60vh] flex-col gap-5 overflow-y-auto p-4">
          <Field variant="outlined">
            <FieldLabel>Nombre</FieldLabel>
            <Input
              placeholder="Agregar"
              maxLength={50}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Field>

          <Field variant="outlined">
            <FieldLabel>Descripción breve</FieldLabel>
            <Textarea
              rows={3}
              placeholder="Propósito pedagógico y dinámica general"
              maxLength={500}
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
              title={referenteNombre ?? "Derechos Básicos de Aprendizaje"}
              description={referenteDescripcion ?? "Selecciona los enunciados asociados."}
              // Mismo motivo que en `UnidadInfoGeneralFields`: nunca el
              // literal fijo "Enunciados" — este popover también crea
              // unidades de Preescolar, donde el nivel 1 real es "Propósito".
              columnLabel={`${nivel1Etiqueta}s`}
              items={enunciadosDba}
              options={enunciadosDisponibles}
              onChange={setEnunciadosDba}
              disabled={!hasGradoAsignatura}
              isPending={isPendingEnunciados}
            />
          </div>

          {!esFormativa && (
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
          )}
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
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
