import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react"
import * as React from "react"
import { useForm, useSelector } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { useQueries } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/date-picker"
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { CharacterCounter } from "@/components/ui/character-counter"
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
import { usePlaneadorPeriodosEvaluacionQuery } from "@/features/planeador/api/query/use-planeador-periodos-evaluacion-query"
import { periodosCerrados, rangosDePeriodos } from "@/features/planeador/lib/periodo-cerrado"
import {
  useReferenteCurricularQuery,
  referenteCurricularQueryOptions,
} from "@/features/planeador/api/query/use-referente-curricular-query"
import {
  ROTULO_ACTIVIDAD_FALLBACK,
  rotuloEnMinuscula,
  useRotuloActividadQuery,
} from "@/features/planeador/api/query/use-rotulo-actividad-query"
import type { ActividadTab } from "@/features/planeador/api/query/use-actividades-tabs-query"
import { useDocenteGruposQuery } from "@/features/planeador/api/query/use-docente-grupos-query"
import { useGradoGruposQuery } from "@/features/planeador/api/query/use-grado-grupos-query"
import { useDocenteGradoAsignaturaQuery } from "@/features/planeador/api/query/use-docente-grado-asignatura-query"
import { useActividadMatriculasGrupoQuery } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import { EstudiantesMultiSelect } from "@/features/planeador/components/forms/estudiantes-multi-select"
import { esEstudianteDeLaActividad } from "@/features/planeador/lib/adaptacion-estudiantes"
import { ActividadRecuperarCascada } from "@/features/planeador/components/forms/actividad-recuperar-cascada"
import { useStudyPlanSubjectLabel } from "@/features/establishment/academic-period/api/query/use-study-plan-subject-label"
import { useTipoActividadCatalogQuery } from "@/features/planeador/api/query/use-tipo-actividad-catalog"
import { useAsistenteActividad } from "@/features/planeador/hooks/use-asistente-actividad"
import {
  useInstrumentoEvaluacionCatalogQuery,
  instrumentoPermitidoLabel,
} from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import {
  ListaAgregableField,
  ListaAgregableCajaSelect,
} from "@/features/planeador/components/forms/field-lista-agregable"
import { useEnunciadosDbaQuery } from "@/features/planeador/api/query/use-enunciados-dba"
import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
  ComboboxEmpty,
} from "@/components/ui/combobox"
import {
  useAdaptacionesReutilizablesQuery,
  type AdaptacionReutilizable,
} from "@/features/planeador/api/query/use-adaptaciones-reutilizables-query"
import { useTipoAdaptacionCatalogQuery } from "@/features/planeador/api/query/use-tipo-adaptacion-catalog"
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
  CheckCircleFillIcon,
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
  XCircleIcon,
} from "@/components/ui/icons"
import { paths } from "@/config/paths"
import {
  esDominioPermitido,
  useDominioMaterialCatalog,
} from "@/features/planeador/api/query/use-dominio-material-catalog"

import type {
  Actividad,
  Adaptacion,
  AdaptacionArchivo,
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
import type { MatriculaGrupo } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useCreateUnidad } from "@/features/planeador/api/mutations/create-unidad"

import { DialogBibliotecaRecursos } from "@/features/planeador/components/dialogs/dialog-biblioteca-recursos"
import {
  consumeActividadFormDraft,
  saveActividadFormDraft,
  type ActividadFormDraftKey,
} from "@/features/planeador/lib/actividad-form-draft"
import { type CampoRecuperacion, erroresRecuperacion } from "@/features/planeador/lib/recuperacion-faltantes"
import {
  avisoCamposObligatorios,
  camposObligatoriosFaltantes,
  faltaTipoEvidencia,
  faltanEstudiantes,
} from "@/features/planeador/lib/campos-obligatorios-faltantes"
import { faltantesInstrumento } from "@/features/planeador/lib/instrumento-faltantes"

/**
 * `<Textarea>` no hereda la variante `outlined` del `Field`: se aplica a mano
 * con las mismas clases de `inputVariants({variant: "outlined"})`.
 */
const TEXTAREA_OUTLINED =
  "rounded-md border border-input px-3 py-2 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red aria-invalid:focus-visible:border-red aria-invalid:focus-visible:ring-red/20"

// Labels de los `<Select>` cuyo `value` (id, abreviatura) no es el texto visible.

/** Presentación (ícono, label, color) de cada `RecursoTipo`, única fuente para todos los consumidores. */
type RecursoPresentacion = {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  bg: string
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

const TIPO_EVIDENCIA_ESPERADA_LABELS: Record<string, string> = {
  Archivo: "Archivo (PDF, Word, imagen, otro)",
  Enlace: "Enlace (video, blog, presentación)",
  "Observación directa": "Observación directa",
  "Registro en campo": "Registro en campo",
}

/**
 * Opción de entrega que se marca por defecto según el tipo de evidencia (pedido de QA).
 * Solo prende la suya, nunca apaga la otra: siguen siendo independientes.
 */
const TIPO_EVIDENCIA_CHECKBOX_DEFAULT: Record<string, "archivo" | "texto"> = {
  Archivo: "archivo",
  Enlace: "texto",
  "Observación directa": "texto",
  "Registro en campo": "texto",
}

/**
 * Respaldo de los catálogos de "Otro" mientras `instrumentosPermitidos[OTRO].campos`
 * no resuelve; el backend real los manda acotados al referente.
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
  onDirtyChange?: (isDirty: boolean) => void
  formId: string
  /** Submit real. Opcional: sin él el submit no hace nada. */
  onSubmit?: (values: Actividad) => void
  /**
   * `true` en el alta: `actividad.id` es un `draftId()` inexistente en el backend,
   * así que no se piden calificaciones con él.
   */
  esNueva?: boolean
  /**
   * Pestaña de Rótulo de Ejecución (`?rotulo=`) que acota Grado/Asignatura.
   * `undefined` en edición o con un solo rótulo.
   */
  tab?: ActividadTab
  /**
   * Solo lectura: deshabilita cada sección con `disabled` explícito (Base UI ignora
   * `<fieldset disabled>`) y el submit no hace nada.
   */
  readOnly?: boolean
}

/**
 * Form de una actividad, compartido por edición y alta (`crearActividadVacia`).
 * Reporta el estado "dirty" hacia arriba.
 */
export function EditarActividadForm({
  actividad,
  onDirtyChange,
  formId,
  onSubmit,
  esNueva = false,
  tab,
  readOnly = false,
}: EditarActividadFormProps) {
  const { data: unidadesResult } = useUnidadesQuery()
  const unidadesQuery = unidadesResult?.rows ?? []

  // Unidades creadas al vuelo (ya persistidas, con id real): se guardan acá para
  // que aparezcan en el `<Select>` sin esperar el refetch.
  const [unidadesCreadas, setUnidadesCreadas] = useState<UnidadTematica[]>([])
  // Dedupe por `id`: si el query ya trae la unidad creada, se descarta la copia local.
  const unidadesCreadasPendientes = unidadesCreadas.filter(
    (creada) => !unidadesQuery.some((real) => real.id === creada.id),
  )
  const unidades = [...unidadesQuery, ...unidadesCreadasPendientes]
  const createUnidadMutation = useCreateUnidad()

  // El alta usa el sentinel "nueva": `actividad.id` es un `draftId()` que cambia en cada montaje.
  const draftKey: ActividadFormDraftKey = esNueva ? "nueva" : actividad.id
  // `defaultValues` SIEMPRE es la actividad del servidor, nunca el borrador: si no,
  // al volver de "Ver recurso" el form se vería limpio con cambios sin guardar.
  const [actividadOriginal] = useState(() => actividad)
  // El borrador se aplica aparte como valores actuales, sin tocar los defaults.
  const [draftInicial] = useState(() => consumeActividadFormDraft(draftKey))

  const { notify } = useNotify()
  const form = useForm({
    defaultValues: actividadOriginal,
    onSubmit: ({ value }) => {
      if (readOnly) return
      if (camposObligatoriosFaltantes(value, camposEfectivosRef.current).length > 0) return
      // El instrumento se guarda en un PUT aparte tras la actividad: se frena acá si
      // está incompleto para no dejar la actividad guardada sin él.
      if (faltantesDelInstrumento(value).length > 0) return
      return onSubmit?.(value)
    },
  })

  // `keepDefaultValues: true`: `isDirty` sigue comparando contra la actividad del servidor.
  useEffect(() => {
    if (draftInicial) {
      form.reset(draftInicial, { keepDefaultValues: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isDirty = useSelector(form.store, (state) => !state.isDefaultValue)
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // Crea la unidad en el backend y la devuelve con su id real para asignarla de una.
  // Acá solo va "Información general"; el resto se completa editando la unidad.
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
      // El popover no ofrece título por sección: se guardan sin título.
      contenidos: data.contenidos.map((descripcion) => ({ descripcion })),
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
  // `grupoTieneEstudiantes` se completa más abajo, con el padrón del grupo.
  const camposEfectivosRef = useRef({ camposEfectivos, esFormativa, grupoTieneEstudiantes: false, subjectLabel: "Asignatura" })
  const unidadesRef = useRef(unidades)
  unidadesRef.current = unidades

  /**
   * Faltantes del instrumento (Bloque 5). El puntaje es obligatorio si la unidad calcula
   * por Ponderado o Suma de puntos; un referente formativo no tiene instrumento.
   */
  function faltantesDelInstrumento(values: Actividad): string[] {
    if (camposEfectivosRef.current.esFormativa) return []
    const unidad = unidadesRef.current.find((u) => u.id === values.unidad.id)
    return faltantesInstrumento(values, {
      puntajeObligatorio: unidad != null && unidad.metodoCalculo !== "Promedio simple",
    })
  }

  // Todo depende de Grado + Asignatura: hasta elegirlos las secciones quedan deshabilitadas.
  // Se pasa `disabled` explícito: Base UI ignora `<fieldset disabled>`.
  const sinGradoAsignatura = !useHasGradoAsignatura(form)
  const disabled = readOnly || sinGradoAsignatura
  // Padrón del grupo para el checklist de cada adaptación: sus ids son `pk_tmatricula`
  // (lo que espera el backend) y está disponible desde el alta.
  const grupoIdActual = useSelector(form.store, (state) => state.values.grupoId)
  const gradoIdActual = useSelector(form.store, (state) => state.values.gradoId)
  const subjectLabel = useStudyPlanSubjectLabel(gradoIdActual ?? undefined, false)
  const { data: matriculas = [] } = useActividadMatriculasGrupoQuery(disabled ? undefined : grupoIdActual)
  camposEfectivosRef.current = {
    camposEfectivos,
    esFormativa,
    grupoTieneEstudiantes: matriculas.length > 0,
    subjectLabel,
  }

  const { data: tiposActividadAsistente = [] } = useTipoActividadCatalogQuery()
  const { data: instrumentosAsistente = [] } = useInstrumentoEvaluacionCatalogQuery()
  const instrumentosPermitidosAsistente = camposEfectivos?.evaluacion.instrumentosPermitidos?.map(instrumentoPermitidoLabel)
  useAsistenteActividad({
    form,
    actividadId: esNueva ? null : actividad.id,
    readOnly,
    esFormativa,
    seccionVisible: (seccion) => camposEfectivos?.[seccion]?.visible !== false,
    tiposActividad: tiposActividadAsistente,
    instrumentos:
      instrumentosPermitidosAsistente && instrumentosPermitidosAsistente.length > 0
        ? instrumentosAsistente.filter((i) => instrumentosPermitidosAsistente.includes(i))
        : instrumentosAsistente,
  })
  const bloqueadoPorRecuperacion = useRecuperacionBloqueaCampos(form)
  // Alta desde una Unidad ya elegida: esa unidad fija Grado, Asignatura y Unidad.
  // Se detecta con `actividadOriginal` (capturada al montar).
  const unidadBloqueada = esNueva && actividadOriginal.unidad.id !== 0
  // Regla: una recuperación siempre es sumativa, sea cual sea el destino.
  const esRecuperacion = useSelector(form.store, (state) => state.values.esRecuperacion)
  useRecuperacionAutoFill(form)

  const { data: unidadTabs } = useUnidadesTabsQuery()
  const rotuloUnidad = resolveInstrumentoLabel(gradoIdActual, unidadTabs, UNIDAD_TAB_FALLBACK)

  return (
    <SoloLecturaActividadContext.Provider value={readOnly}>
    <form
      id={formId}
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        if (readOnly) return
        // Se captura antes del `.then()`: el evento puede no sobrevivir al handler, el nodo sí.
        const formEl = e.currentTarget
        const values = form.state.values
        // Un solo aviso: campos generales y faltantes del instrumento van en el mismo mensaje.
        const aviso = avisoCamposObligatorios(camposObligatoriosFaltantes(values, camposEfectivosRef.current), {
          nombre: values.instrumento,
          faltantes: faltantesDelInstrumento(values),
        })
        if (aviso) notify(aviso, { variant: "error" })
        // Se espera a `handleSubmit()` (sube `submissionAttempts`) antes de llevar la vista
        // al primer campo inválido.
        void form.handleSubmit().then(() => scrollToFirstInvalidField(formEl))
      }}
    >
      {/* Va primero: reclasifica la actividad entera, así que se responde antes que el resto. */}
      <RecuperacionSection
        // No usa el `disabled` de Grado/Asignatura: con `destino = ACTIVIDAD` elegir el origen
        // es lo que llena Grado/Asignatura, exigirlos antes sería un candado sin salida.
        form={form}
        disabled={readOnly}
        // Una recuperación ya guardada no deja cambiar si lo es ni el origen: revertirla deshace
        // las notas aplicadas y cambiar el origen rompe la herencia. El resto sigue editable.
        recuperacionFijada={!esNueva && actividadOriginal.esRecuperacion}
        camposEfectivos={camposEfectivos}
        actividadId={actividad.id}
      />
      <Card className="gap-4 p-4">
        <h3 className="text-base font-semibold">Contexto Académico y Estudiantes</h3>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <AsignaturaGradoSection
            form={form}
            // En solo lectura se reusa el candado de la recuperación.
            bloqueadoPorRecuperacion={bloqueadoPorRecuperacion || readOnly}
            unidadBloqueada={unidadBloqueada}
            tab={tab}
            unidadSlot={
              <UnidadAsociadaSection
                form={form}
                unidades={unidades}
                onCrearUnidad={crearUnidad}
                disabled={disabled || bloqueadoPorRecuperacion || unidadBloqueada}
              />
            }
          />
        </div>
      </Card>
      <Card className="gap-4 p-4">
        <h3 className="text-base font-semibold">Identificación y Estructura de Datos de la {rotuloUnidad}</h3>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <IdentificacionSection
            form={form}
            disabled={disabled}
            bloqueadoPorRecuperacion={bloqueadoPorRecuperacion}
            tab={tab}
          />
        </div>
        <UnidadSection form={form} unidades={unidades} readOnly={readOnly} />
      </Card>
      <Card className="gap-6 p-4">
        <h3 className="text-base font-semibold">Recursos y Materiales</h3>
        <MaterialesSection form={form} disabled={disabled} />
        <RecursosSection
          form={form}
          draftKey={draftKey}
          disabled={disabled}
          actividadId={actividad.id}
        />
      </Card>
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
      {/* Adaptaciones siempre visible (Regla 49): el Decreto 1421/PIAR exige documentar ajustes
      razonables también en referentes formativos. */}
      <AdaptacionesSection form={form} matriculas={matriculas} disabled={disabled} actividadId={actividad.id} />
      {!esFormativa && <SeguimientoSection form={form} disabled={disabled} />}
    </form>
    </SoloLecturaActividadContext.Provider>
  )
}

/**
 * Tras un guardado fallido lleva la vista y el foco al primer campo inválido de este form.
 * Doble `requestAnimationFrame`: `submissionAttempts` se actualiza async y hay que esperar el re-render.
 */
function scrollToFirstInvalidField(formEl: HTMLFormElement) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const invalido = formEl.querySelector<HTMLElement>('[data-invalid="true"], [aria-invalid="true"]')
      if (!invalido) return
      invalido.scrollIntoView({ behavior: "smooth", block: "center" })
      // Si lo marcado no es enfocable (el `<Field>`), se enfoca el primer control de adentro.
      const foco = invalido.matches("input, select, textarea, button, [tabindex]")
        ? invalido
        : invalido.querySelector<HTMLElement>("input, select, textarea, button, [tabindex]")
      foco?.focus({ preventScroll: true })
    })
  })
}

function useErrorObligatorio(form: FormActividad, vacio: boolean): boolean {
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  return submissionAttempts > 0 && vacio
}

const ERROR_OBLIGATORIO = [{ message: "Este campo es obligatorio." }]

function useErrorRecuperacion(form: FormActividad, campo: CampoRecuperacion): string | undefined {
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  const rotuloLower = useSelector(form.store, (state) =>
    rotuloEnMinuscula(state.values.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK),
  )
  const error = useSelector(form.store, (state) => erroresRecuperacion(state.values, rotuloLower)[campo])
  return submissionAttempts > 0 ? error : undefined
}

/**
 * Solo lectura: los campos se ven deshabilitados y los botones que solo modifican
 * van envueltos en `<SoloEdicion>`.
 */
const SoloLecturaActividadContext = createContext(false)

function useSoloLecturaActividad(): boolean {
  return useContext(SoloLecturaActividadContext)
}

function SoloEdicion({ children }: { children: ReactNode }) {
  return useSoloLecturaActividad() ? null : <>{children}</>
}

/** Grado + Asignatura elegidos (por id): habilita el resto del form. */
function useHasGradoAsignatura(form: FormActividad): boolean {
  const gradoId = useSelector(form.store, (state) => state.values.gradoId)
  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  return gradoId != null && asignaturaId != null
}

/**
 * `true` cuando la recuperación hereda de otra actividad (`destino = ACTIVIDAD` con origen
 * elegido): Grado/Grupo, Asignatura, Nombre y Estudiantes quedan bloqueados.
 */
function useRecuperacionBloqueaCampos(form: FormActividad): boolean {
  const esRecuperacion = useSelector(form.store, (state) => state.values.esRecuperacion)
  const destino = useSelector(form.store, (state) => state.values.recuperacionDestino)
  const recuperacionActividadId = useSelector(form.store, (state) => state.values.recuperacionActividadId)
  return esRecuperacion && destino === "ACTIVIDAD" && recuperacionActividadId != null
}

/**
 * Al elegir la actividad a recuperar copia Grado/Grupo, Asignatura, Nombre (+ " (R)") y
 * estudiantes. `aplicadoRef` evita volver a pisarlos en cada render con el mismo origen.
 */
function useRecuperacionAutoFill(form: FormActividad) {
  const esRecuperacion = useSelector(form.store, (state) => state.values.esRecuperacion)
  const destino = useSelector(form.store, (state) => state.values.recuperacionDestino)
  const recuperacionActividadId = useSelector(form.store, (state) => state.values.recuperacionActividadId)
  const activo = esRecuperacion && destino === "ACTIVIDAD" && recuperacionActividadId != null
  const { data: original } = useActividadDetalleQuery(activo ? recuperacionActividadId : undefined)
  // Con el origen ya guardado no se copia al abrir: pisaría lo editado y ensuciaría el form.
  const aplicadoRef = useRef<number | undefined>(form.options.defaultValues?.recuperacionActividadId)

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
    // Solo quedan marcados los estudiantes que ya tenía la actividad original.
    form.setFieldValue("matriculasIds", original.matriculasIds)
    form.setFieldValue("asignarTodoElGrupo", false)
  }, [activo, recuperacionActividadId, original, form])
}

/**
 * Toggle "Es una recuperación" + su configuración. Solo aplica a actividades sumativas
 * (desaparece, no se deshabilita); el valor no se resetea al dejar de serlo.
 */
/**
 * Catálogo de respaldo de "¿Esta recuperación aplica para?" mientras no hay
 * `campos_disponibles`: su `valor` debe coincidir con el real desde el primer render.
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
  recuperacionFijada = false,
  camposEfectivos,
  actividadId,
}: {
  form: FormActividad
  disabled: boolean
  recuperacionFijada?: boolean
  camposEfectivos: ReturnType<typeof useCamposEvaluacionEfectivos>["camposEfectivos"]
  actividadId: number
}) {
  const recuperacion = camposEfectivos?.recuperacion
  // Todos obligatorios; cada error solo se ve si su campo está visible.
  const errorDestino = useErrorRecuperacion(form, "recuperacionDestino")
  const errorActividad = useErrorRecuperacion(form, "recuperacionActividadId")
  const errorAplicacion = useErrorRecuperacion(form, "recuperacionTipoAplicacion")
  const errorCalculo = useErrorRecuperacion(form, "recuperacionTipoCalculo")
  const errorPonderacion = useErrorRecuperacion(form, "recuperacionValorPonderacion")
  // Aparece apenas se prende el toggle, sin esperar Grado/Asignatura/Unidad: mientras
  // tanto usa el catálogo de respaldo (mismos `valor` que el real).
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
                    disabled={disabled || recuperacionFijada}
                    className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
                  />
                  Es una recuperación
                  {recuperacionFijada && (
                    <span className="text-muted-foreground ml-auto text-xs">
                      No se puede cambiar en una recuperación ya creada
                    </span>
                  )}
                </label>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values.esRecuperacion}>
              {(esRecuperacionValue) =>
                !esRecuperacionValue ? null : (
                  <div className="grid gap-x-4 gap-y-5 rounded-md border border-input p-3 sm:grid-cols-2">
                    <form.Field name="recuperacionDestino">
                      {(field) => (
                        <Field variant="outlined" data-invalid={!!errorDestino}>
                          <FieldLabel htmlFor={field.name}>
                            ¿Esta recuperación aplica para? *
                          </FieldLabel>
                          <Select
                            value={field.state.value || "__none__"}
                            onValueChange={(v) => {
                              field.handleChange(!v || v === "__none__" ? "" : v)
                              // Cambiar el destino invalida todo lo que dependía de él:
                              // sin reset quedaban valores ocultos que podían reaparecer.
                              form.setFieldValue("recuperacionActividadId", undefined)
                              form.setFieldValue("recuperacionTipoAplicacion", "")
                              form.setFieldValue("recuperacionTipoCalculo", "")
                              form.setFieldValue("recuperacionValorPonderacion", undefined)
                            }}
                            disabled={disabled || recuperacionFijada}
                          >
                            <SelectTrigger id={field.name} aria-invalid={!!errorDestino}>
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
                          {errorDestino && <FieldError errors={[{ message: errorDestino }]} />}
                        </Field>
                      )}
                    </form.Field>

                    {/* Solo con `destino = ACTIVIDAD`. */}
                    <form.Subscribe selector={(state) => state.values.recuperacionDestino}>
                      {(destino) =>
                        destino !== "ACTIVIDAD" ? null : (
                          <form.Field name="recuperacionActividadId">
                            {(field) => (
                              <Field variant="outlined" data-invalid={!!errorActividad}>
                                <FieldLabel>¿Qué actividad deseas recuperar? *</FieldLabel>
                                <ActividadRecuperarCascada
                                  value={field.state.value}
                                  onChange={(v) => {
                                    field.handleChange(v)
                                    // Cambiar la actividad a recuperar invalida cómo se aplica/calcula.
                                    form.setFieldValue("recuperacionTipoAplicacion", "")
                                    form.setFieldValue("recuperacionTipoCalculo", "")
                                    form.setFieldValue("recuperacionValorPonderacion", undefined)
                                  }}
                                  excludeActividadId={actividadId}
                                  disabled={disabled || recuperacionFijada}
                                />
                                {errorActividad && <FieldError errors={[{ message: errorActividad }]} />}
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

                    {/* Oculto hasta elegir destino (y, con `ACTIVIDAD`, la actividad puntual). */}
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
                              <Field variant="outlined" data-invalid={!!errorAplicacion}>
                                <FieldLabel>¿Cómo se aplicará la nota de recuperación? *</FieldLabel>
                                <RadioGroup
                                  className="flex min-h-11 flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-input px-3 py-2"
                                  value={field.state.value}
                                  disabled={disabled}
                                  onValueChange={(v) => {
                                    field.handleChange(v)
                                    // "Reemplazar" no calcula nada: hay que limpiar cálculo y %, no solo ocultarlos.
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
                                {errorAplicacion && <FieldError errors={[{ message: errorAplicacion }]} />}
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

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

                    {/* Oculto con `tipoAplicacion = REEMPLAZAR` (regla `tipoCalculoOcultoSi`):
                    el backend tolera el campo ausente y guarda PROMEDIADO por default. */}
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
                              <Field variant="outlined" data-invalid={!!errorCalculo}>
                                <FieldLabel>
                                  ¿Cómo deseas calcular la nota{" "}
                                  {destino === "NOTA_FINAL" ? "final" : "de la actividad"}? *
                                </FieldLabel>
                                <RadioGroup
                                  className="flex min-h-11 flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-input px-3 py-2"
                                  value={field.state.value}
                                  disabled={disabled}
                                  onValueChange={(v) => {
                                    field.handleChange(v)
                                    // Un % previo no aplica al cambiar el tipo de cálculo.
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
                                {errorCalculo && <FieldError errors={[{ message: errorCalculo }]} />}
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

                    {/* Solo con `tipoCalculo = PONDERADO` (rango `valorPonderacionRango`). */}
                    <form.Subscribe selector={(state) => state.values.recuperacionTipoCalculo}>
                      {(tipoCalculo) =>
                        tipoCalculo !== "PONDERADO" ? null : (
                          <form.Field name="recuperacionValorPonderacion">
                            {(field) => (
                              <Field variant="outlined" data-invalid={!!errorPonderacion}>
                                <FieldLabel htmlFor={field.name}>Valor de ponderación (%) *</FieldLabel>
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
                                  aria-invalid={!!errorPonderacion}
                                />
                                {errorPonderacion && <FieldError errors={[{ message: errorPonderacion }]} />}
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

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
// ────────────────────────────────────────────────────────────────────────────

// Alias de `useForm` con `Actividad` como `TFormData`; los `TOn…` quedan en `any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormActividad = ReturnType<typeof useForm<Actividad, any, any, any, any, any, any, any, any, any, any, any>>

function IdentificacionSection({
  form,
  disabled,
  bloqueadoPorRecuperacion,
  tab,
}: {
  form: FormActividad
  disabled: boolean
  /** Ver `useRecuperacionBloqueaCampos`: "Nombre" queda bloqueado mientras sea `true`. */
  bloqueadoPorRecuperacion: boolean
  tab?: ActividadTab
}) {
  const { data: tiposActividad = [] } = useTipoActividadCatalogQuery()
  const nombreInvalido = useErrorObligatorio(form, !useSelector(form.store, (state) => state.values.nombre?.trim()))
  const tipoInvalido = useErrorObligatorio(form, !useSelector(form.store, (state) => state.values.tipo))
  // Rótulo real (Regla 13): nunca "actividad" fijo.
  const gradoIdSel = useSelector(form.store, (state) => state.values.gradoId)
  const asignaturaIdSel = useSelector(form.store, (state) => state.values.asignaturaId)
  const { data: rotuloActividad } = useRotuloActividadQuery(gradoIdSel, asignaturaIdSel)
  const rotuloLower = rotuloEnMinuscula(rotuloActividad?.rotulo ?? tab?.rotulo ?? ROTULO_ACTIVIDAD_FALLBACK)

  return (
    <>
        <form.Field name="nombre">
          {(field) => (
            <Field variant="outlined" data-invalid={nombreInvalido}>
              <FieldLabel htmlFor={field.name}>Nombre de la {rotuloLower} *</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                placeholder="Agregar"
                maxLength={150}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                disabled={disabled || bloqueadoPorRecuperacion}
                aria-invalid={nombreInvalido}
              />
              {nombreInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
          )}
        </form.Field>

        <form.Field name="tipo">
          {(field) => (
            <Field variant="outlined" data-invalid={tipoInvalido}>
              <FieldLabel htmlFor={field.name}>Tipo de {rotuloLower} *</FieldLabel>
              <Select
                // `__none__` es el sentinel de "sin elegir".
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
              {tipoInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
          )}
        </form.Field>

        <form.Field name="descripcion">
          {(field) => (
            <Field variant="outlined" className="sm:col-span-2">
              <FieldLabel htmlFor={field.name}>Descripción</FieldLabel>
              <Textarea className={TEXTAREA_OUTLINED}
                id={field.name}
                name={field.name}
                placeholder="Agregar"
                maxLength={500}
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                rows={3}
                disabled={disabled}
              />
              <CharacterCounter value={field.state.value ?? ""} max={500} />
            </Field>
          )}
        </form.Field>

        {/* "Requiere validación del coordinador" es de la actividad entera, por eso va acá
        y no en "Seguimiento". */}
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
    </>
  )
}

/** "Unidad temática asociada" depende de Grado + Asignatura: va después en el grid. */
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
  const soloLectura = useSoloLecturaActividad()
  // El rótulo depende del nivel educativo del Grado elegido ("Proyecto pedagógico" en
  // Preescolar); con Grado elegido hay a lo sumo un instrumento en `unidadTabs`.
  const { data: unidadTabs } = useUnidadesTabsQuery()
  // El enfoque formativo lo decide el referente de Grado + Asignatura, no
  // `UnidadTematica.enfoquePedagogico` (siempre llega "Evaluativo").
  const gradoIdSel = useSelector(form.store, (state) => state.values.gradoId)
  const asignaturaIdSel = useSelector(form.store, (state) => state.values.asignaturaId)
  const { data: referenteActual } = useReferenteCurricularQuery(gradoIdSel, asignaturaIdSel)

  return (
    <>
        <form.Subscribe
          selector={(state) => `${state.values.grado}/${state.values.asignatura}/${state.values.gradoId}`}
        >
          {() => {
            // Depende de Grado + Asignatura, no del grupo: una unidad se identifica por (asignatura, grado).
            const grado = form.getFieldValue("grado")
            const asignatura = form.getFieldValue("asignatura")
            // Se chequean los ids (como `CrearUnidadPopover`), no los labels: el detalle real
            // puede traer labels sin ids.
            const gradoId = form.getFieldValue("gradoId")
            const asignaturaId = form.getFieldValue("asignaturaId")
            const hasGradoAsignatura = gradoId != null && asignaturaId != null
            const unidadesDelGrado = hasGradoAsignatura
              ? unidades.filter((u) => u.grado === grado && u.asignatura === asignatura)
              : []

            const instrumentoLabel = resolveInstrumentoLabel(gradoId, unidadTabs, UNIDAD_TAB_FALLBACK)

            return (
              <form.Field name="unidad">
                {(field) => (
                  // `gap-0` y bordes/redondeados anulados: select + botón se leen como un split-button.
                  <div className="flex items-end gap-0">
                    <Field
                      variant="outlined"
                      // En solo lectura el "+" no se renderiza y el select recupera sus esquinas.
                      className={cn(
                        "min-w-0 flex-1",
                        !soloLectura && "[&_[data-slot=select-trigger]]:rounded-r-none [&_[data-slot=select-trigger]]:border-r-0",
                      )}
                    >
                      <FieldLabel htmlFor={field.name} className="truncate" title={instrumentoLabel}>
                        {instrumentoLabel}
                      </FieldLabel>
                      <Select
                        // `0` es el sentinel de "sin unidad" (ningún PK real es 0).
                        value={field.state.value.id === 0 ? "__none__" : String(field.state.value.id)}
                        disabled={disabled || !hasGradoAsignatura}
                        onValueChange={(value) => {
                          // `__none__` ("Seleccione") se maneja aparte para poder vaciar el campo;
                          // se guarda `0` como "sin unidad".
                          if (value === "__none__") {
                            field.handleChange({ id: 0, nombre: "" })
                            form.setFieldValue("ponderacion", 0)
                            form.setFieldValue("notaMaxima", undefined)
                            return
                          }
                          const next = unidadesDelGrado.find((u) => String(u.id) === value)
                          if (!next) return
                          field.handleChange({ id: next.id, nombre: next.nombre })
                          // Regla: una unidad de enfoque formativo no admite actividades sumativas, así que se
                          // apaga `esEvaluativa` de inmediato. Usa `referenteActual`, no `next.enfoquePedagogico`.
                          if (referenteActual?.esFormativo) {
                            form.setFieldValue("esEvaluativa", false)
                          }
                          // `ponderacion`/`notaMaxima` dependen del `metodoCalculo` de la unidad: se limpian
                          // para no mandar un valor de la unidad anterior.
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
                    <SoloEdicion>
                    <CrearUnidadPopover
                      className="rounded-l-none border-l-0"
                      instrumentoLabel={instrumentoLabel}
                      gradoId={form.getFieldValue("gradoId")}
                      asignaturaId={form.getFieldValue("asignaturaId")}
                      disabled={disabled || !hasGradoAsignatura}
                      onCreate={async (data) => {
                        // La unidad ya existe con id real cuando se asigna; hereda Grado/Asignatura de la actividad.
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
                    </SoloEdicion>
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
 * Ficha de la unidad elegida + checkboxes de evidencias de sus enunciados. Lee la unidad
 * vía `form.Subscribe`; objetivos/contenidos salen del detalle (el listado puede no traerlos).
 */
function UnidadSection({
  form,
  unidades,
  readOnly = false,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  readOnly?: boolean
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
                      if (readOnly) return
                      const actual = evidenciasField.state.value
                      evidenciasField.handleChange(
                        actual.includes(evidenciaId)
                          ? actual.filter((id) => id !== evidenciaId)
                          : [...actual, evidenciaId],
                      )
                    }}
                    disabled={readOnly}
                    criteriosSeleccionados={criteriosField.state.value}
                    onToggleCriterio={(criterioId) => {
                      if (readOnly) return
                      const actual = criteriosField.state.value
                      criteriosField.handleChange(
                        actual.includes(criterioId)
                          ? actual.filter((id) => id !== criterioId)
                          : [...actual, criterioId],
                      )
                    }}
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

/** Separado de `UnidadSection` para llamar sus hooks de forma incondicional. */
function UnidadFichaYEvidencias({
  unidadId,
  nombreFallback,
  seleccionadas,
  onToggle,
  criteriosSeleccionados,
  onToggleCriterio,
  disabled = false,
}: {
  disabled?: boolean
  unidadId: number
  nombreFallback: string
  seleccionadas: number[]
  onToggle: (evidenciaId: number) => void
  criteriosSeleccionados: number[]
  onToggleCriterio: (criterioId: number) => void
}) {
  const { data: unidad } = useUnidadDetalleQuery(unidadId)
  // `unidad.criterios` llega vacío del backend real: se piden aparte.
  const { data: criterios = [] } = useUnidadCriteriosQuery(unidadId)
  // Árbol de enunciados + evidencias ya acotado a los relacionados con esta unidad.
  const { data: referente } = useUnidadReferenteQuery(unidadId)
  const { data: unidadTabs } = useUnidadesTabsQuery()
  // Por `referente.id`, no por `gradoId`: el título debe coincidir con las etiquetas de este referente.
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
          disabled={disabled}
        />
      )}
      {criterios.length > 0 && (
        <CriteriosUnidadChecklist
          criterios={criterios}
          seleccionados={criteriosSeleccionados}
          onToggle={onToggleCriterio}
          disabled={disabled}
        />
      )}
    </div>
  )
}

/**
 * "Grado / Grupo" es un solo `<Select>` con los combos reales del docente; Asignatura
 * sale del mismo catálogo filtrada por `gradoId`.
 */
/** `grupo_codigo` viene `null` en los datos reales: se prioriza `grupo_nombre`. */
function grupoLabel(grupo: { grupoCodigo: string; grupoNombre: string }): string {
  return grupo.grupoCodigo || grupo.grupoNombre
}

function AsignaturaGradoSection({
  form,
  bloqueadoPorRecuperacion,
  unidadBloqueada = false,
  unidadSlot,
  tab,
}: {
  form: FormActividad
  /** Ver `useRecuperacionBloqueaCampos`. */
  bloqueadoPorRecuperacion: boolean
  /**
   * `true` en el alta desde una Unidad: Grado/Grupo y Asignatura quedan deshabilitados
   * (se toma el primer grupo del grado; otro grupo se cambia editando la actividad).
   */
  unidadBloqueada?: boolean
  unidadSlot?: ReactNode
  /**
   * Pestaña activa (`?rotulo=`): acota Grado/Grupo y Asignatura a `tab.pares`.
   * `unidadBloqueada` sigue ganando; el filtro es por par (grado, asignatura).
   */
  tab?: ActividadTab
}) {
  const { data: docenteGrupos = [], isPending: isPendingDocenteGrupos } = useDocenteGruposQuery()
  const { data: docenteGradoAsignatura = [] } = useDocenteGradoAsignaturaQuery()

  // Con `destino = NOTA_FINAL` Grado/Asignatura se eligen a mano y deben ser de un referente
  // EVALUATIVO: se sondea cada par en paralelo (no hay endpoint que lo diga de una).
  const esRecuperacion = useSelector(form.store, (state) => state.values.esRecuperacion)
  const recuperacionDestino = useSelector(form.store, (state) => state.values.recuperacionDestino)
  const filtrarSoloEvaluativas = esRecuperacion && recuperacionDestino === "NOTA_FINAL"

  const referentes = useQueries({
    queries: docenteGradoAsignatura.map((par) => ({
      ...referenteCurricularQueryOptions(par.gradoId, par.asignaturaId),
      enabled: filtrarSoloEvaluativas,
    })),
  })

  // Mientras la sonda no resuelve, el par se trata como no evaluativo.
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
  // El id guardado puede no estar en el catálogo del docente: los labels del detalle
  // sirven de respaldo para el `<SelectValue>`.
  const grado = useSelector(form.store, (state) => state.values.grado)
  const grupo = useSelector(form.store, (state) => state.values.grupo)
  const asignatura = useSelector(form.store, (state) => state.values.asignatura)
  const hasGradoGrupo = gradoId != null && grupoId != null

  // La unidad puede ser de un grado fuera de `docentes/grupos`; se espera a que cargue
  // antes de decidir que no hay match y caer al fallback.
  const necesitaFallbackGrupo =
    gradoId != null && grupoId == null && !isPendingDocenteGrupos && !docenteGrupos.some((g) => g.gradoId === gradoId)
  const { data: gradoGrupos = [] } = useGradoGruposQuery(necesitaFallbackGrupo ? gradoId : undefined)

  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  const hasGradoAsignatura = hasGradoGrupo && asignaturaId != null
  // Rótulo real (Regla 13): nunca "actividad" fijo.
  const { data: rotuloActividad } = useRotuloActividadQuery(gradoId, asignaturaId)
  const rotuloLower = rotuloEnMinuscula(rotuloActividad?.rotulo ?? tab?.rotulo ?? ROTULO_ACTIVIDAD_FALLBACK)
  const asignarTodoElGrupo = useSelector(form.store, (state) => state.values.asignarTodoElGrupo)
  const { data: matriculas = [], isPending: isPendingMatriculas } = useActividadMatriculasGrupoQuery(
    hasGradoAsignatura ? grupoId : undefined,
  )
  // Misma regla que `faltanEstudiantes`: "Ningún estudiante" con un grupo que sí tiene estudiantes.
  const estudiantesInvalido = useErrorObligatorio(
    form,
    useSelector(form.store, (state) => faltanEstudiantes(state.values, matriculas.length > 0)),
  )

  // El detalle real no trae `fk_tgrado`: se resuelve cruzando `grupoId` con `docentes/grupos`,
  // o si no, por asignatura con `docentes/grado-asignatura`. Comparación tolerante (trim + mayúsculas).
  function mismoNombre(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
  }

  useEffect(() => {
    // `gradoId` ya resuelto: solo falta `grupoId`, se toma el primer grupo de ese grado.
    if (gradoId != null) {
      if (grupoId == null) {
        const combo = docenteGrupos.find((g) => g.gradoId === gradoId)
        if (combo) {
          form.setFieldValue("grupoId", combo.grupoId)
          form.setFieldValue("grupo", grupoLabel(combo))
        } else if (gradoGrupos.length > 0) {
          // Sin grupos del docente en este grado: se toma el primero del establecimiento.
          const [fallback] = gradoGrupos
          form.setFieldValue("grupoId", fallback.grupoId)
          form.setFieldValue("grupo", fallback.grupoCodigo)
        }
      }
      return
    }
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
    // Alta desde una Unidad sin ids reales: se cruzan los nombres de grado y asignatura y se
    // elige el primer grupo del grado, para habilitar Asignatura.
    if (grado && asignatura) {
      const par = docenteGradoAsignatura.find(
        (p) => mismoNombre(p.gradoNombre, grado) && mismoNombre(p.asignaturaNombre, asignatura),
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
  }, [gradoId, grupoId, asignaturaId, grado, asignatura, docenteGrupos, gradoGrupos, docenteGradoAsignatura, form])

  const asignaturas = docenteGradoAsignatura.filter((par) => par.gradoId === gradoId)
  const subjectLabel = useStudyPlanSubjectLabel(gradoId, false)
  const grupoInvalido = useErrorObligatorio(form, useSelector(form.store, (state) => state.values.grupoId == null))
  const asignaturaInvalida = useErrorObligatorio(
    form,
    useSelector(form.store, (state) => state.values.asignaturaId == null),
  )

  // Se filtra por `tab.pares`: un grado puede repartir asignaturas en dos pestañas.
  const tienePar = (gradoId: number | undefined, asignaturaId: number | undefined) =>
    !tab || tab.pares.some((p) => p.gradoId === gradoId && (p.asignaturaId == null || p.asignaturaId === asignaturaId))

  // `unidadBloqueada` acota a los grupos del grado de la unidad; `tab` compone con él.
  const gruposVisibles = (
    filtrarSoloEvaluativas ? docenteGrupos.filter((g) => gradosEvaluativosIds.has(g.gradoId)) : docenteGrupos
  )
    .filter((g) => !unidadBloqueada || gradoId == null || g.gradoId === gradoId)
    .filter((g) => !tab || tab.gradoIds.includes(g.gradoId))
  const asignaturasVisibles = (
    filtrarSoloEvaluativas
      ? asignaturas.filter((a) => paresEvaluativos.has(a.gradoId * 1_000_000 + a.asignaturaId))
      : asignaturas
  ).filter((a) => tienePar(a.gradoId, a.asignaturaId))

  return (
    <>
        {/* Grado/Grupo primero: Asignatura y Unidad dependen de él. */}
        <Field variant="outlined" data-invalid={grupoInvalido}>
          <FieldLabel htmlFor="grado-grupo">Grado / Grupo *</FieldLabel>
          <Select
            // `__none__` permite volver a "sin grado/grupo".
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
                // Sin grupo no hay padrón: los estudiantes se limpian.
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
              // Cambiar Grado/Grupo invalida asignatura, unidad y estudiantes (las matrículas son del grupo anterior).
              form.setFieldValue("asignaturaId", undefined)
              form.setFieldValue("asignatura", "")
              form.setFieldValue("unidad", { id: 0, nombre: "" })
              form.setFieldValue("matriculasIds", [])
              form.setFieldValue("asignarTodoElGrupo", true)
            }}
            disabled={bloqueadoPorRecuperacion || unidadBloqueada}
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
          {grupoInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
        </Field>

        <form.Field name="asignaturaId">
          {(field) => (
            <Field variant="outlined" data-invalid={asignaturaInvalida}>
              <FieldLabel htmlFor={field.name}>{subjectLabel} *</FieldLabel>
              <Select
                // `__none__` permite volver a "sin asignatura" (y desbloquear "¿Es evaluación sumativa?").
                value={field.state.value != null ? String(field.state.value) : "__none__"}
                onValueChange={(v) => {
                  if (!v) return
                  if (v === "__none__") {
                    field.handleChange(undefined)
                    form.setFieldValue("asignatura", "")
                    // Sin asignatura no hay padrón: se limpian los estudiantes.
                    form.setFieldValue("matriculasIds", [])
                    form.setFieldValue("asignarTodoElGrupo", true)
                    return
                  }
                  const par = asignaturas.find((a) => String(a.asignaturaId) === v)
                  if (!par) return
                  field.handleChange(par.asignaturaId)
                  form.setFieldValue("asignatura", par.asignaturaNombre)
                  // El padrón depende de grupo + asignatura: las matrículas elegidas se limpian.
                  form.setFieldValue("matriculasIds", [])
                  form.setFieldValue("asignarTodoElGrupo", true)
                }}
                disabled={!hasGradoGrupo || bloqueadoPorRecuperacion || unidadBloqueada}
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
              {asignaturaInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
          )}
        </form.Field>

        {unidadSlot}

        {/* "Estudiantes" depende de Grado/Grupo y Asignatura. Sin elegir a nadie queda en "todo el grupo". */}
        <form.Field name="matriculasIds">
          {(field) => (
            <Field variant="outlined" data-invalid={estudiantesInvalido}>
              <FieldLabel htmlFor={field.name}>Estudiantes de la {rotuloLower} *</FieldLabel>
              <EstudiantesMultiSelect
                id={field.name}
                invalid={estudiantesInvalido}
                estudiantes={matriculas}
                value={field.state.value}
                allSelected={asignarTodoElGrupo}
                onChange={({ matriculaIds, allSelected }) => {
                  field.handleChange(matriculaIds)
                  form.setFieldValue("asignarTodoElGrupo", allSelected)
                }}
                disabled={!hasGradoAsignatura || bloqueadoPorRecuperacion}
                // `isPending` de una query deshabilitada queda `true` para siempre: solo cuenta si está habilitada.
                isPending={hasGradoAsignatura && isPendingMatriculas}
                placeholder={hasGradoAsignatura ? "Seleccionar" : "Elegí grado y asignatura primero"}
              />
              {estudiantesInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
          )}
        </form.Field>
    </>
  )
}

/** "Materiales requeridos": primera mitad del Bloque 3 (la otra es `RecursosSection`). */
function MaterialesSection({ form, disabled }: { form: FormActividad; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-sm font-semibold">Materiales requeridos</h4>
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
            <CharacterCounter value={field.state.value} max={500} />
          </Field>
        )}
      </form.Field>
    </div>
  )
}

/**
 * Borrador del recurso en estado local: recién se commitea a `recursos` con
 * "Agregar a la lista".
 */
type RecursoDraft = Omit<Recurso, "id">

const RECURSO_DRAFT_VACIO: RecursoDraft = {
  titulo: "",
  fuente: "",
  tipo: "URL",
  url: "",
  descripcion: "",
}

const RECURSO_MAX_ITEMS = 10

/**
 * Formatos permitidos en "Archivo en PC" (Regla 82): los ejecutables quedan fuera por
 * no estar en la lista. Se valida en el cliente (pedido de QA).
 */
const RECURSO_ARCHIVO_EXTENSIONES_PERMITIDAS = [
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "jpg", "jpeg", "png", "gif", "mp3", "mp4", "webm", "txt",
]
const RECURSO_ARCHIVO_ACCEPT_VALIDADO = RECURSO_ARCHIVO_EXTENSIONES_PERMITIDAS.map((ext) => `.${ext}`).join(",")
const RECURSO_ARCHIVO_MAX_BYTES = 20 * 1024 * 1024

const ESQUEMAS_URL_PELIGROSOS = ["javascript:", "data:"]

function extensionDe(nombre: string): string {
  return nombre.split(".").pop()?.toLowerCase() ?? ""
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const unidades = ["B", "KB", "MB", "GB"]
  const indice = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1)
  return `${(bytes / 1024 ** indice).toFixed(indice === 0 ? 0 : 1)} ${unidades[indice]}`
}

/** `esquemaPeligroso` va primero: `new URL("javascript:...")` no tira. */
function esUrlDeRecursoValida(value: string): boolean {
  const lower = value.trim().toLowerCase()
  if (ESQUEMAS_URL_PELIGROSOS.some((esquema) => lower.startsWith(esquema))) return false
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
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
  /** 0 mientras la actividad no se guardó: la biblioteca exige una actividad existente. */
  actividadId: number
}) {
  // Grupo del form: ancla de la biblioteca al crear, cuando la actividad aún no existe.
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  // Regla 82: máximo 10 materiales por actividad (tope del backend).
  const recursosCount = useSelector(
    form.store,
    (state) => (state.values.recursos as Recurso[]).length,
  )
  const limiteAlcanzado = recursosCount >= RECURSO_MAX_ITEMS

  // Mismo catálogo de dominios del backend (Regla 82). `undefined` mientras carga: no bloquea.
  const { data: dominiosUrl } = useDominioMaterialCatalog("DOMINIO_MATERIAL_URL")
  const { data: dominiosRepositorio } = useDominioMaterialCatalog("DOMINIO_MATERIAL_REPOSITORIO")

  function draftUrlInvalida(d: RecursoDraft): boolean {
    if (d.tipo === "Archivo" || !d.url.trim()) return false
    if (!esUrlDeRecursoValida(d.url)) return true
    const dominios = d.tipo === "Unidad virtual" ? dominiosRepositorio : dominiosUrl
    if (!dominios) return false
    return !esDominioPermitido(d.url, dominios)
  }

  const [collapsed, setCollapsed] = useState(false)
  const [bibliotecaOpen, setBibliotecaOpen] = useState(false)
  // Fuera del form field para que editar el borrador no ensucie el form.
  const [draft, setDraft] = useState<RecursoDraft>(RECURSO_DRAFT_VACIO)

  function updateDraft(patch: Partial<RecursoDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function handleAddDraft() {
    // Un item sin URL/fuente no aporta nada.
    if (!draft.url.trim() && !draft.fuente.trim()) return
    if (draftUrlInvalida(draft)) return
    const list = form.getFieldValue("recursos") as Recurso[]
    if (list.length >= RECURSO_MAX_ITEMS) return
    form.setFieldValue("recursos", [
      ...list,
      { id: cryptoId(), ...draft },
    ])
    setDraft(RECURSO_DRAFT_VACIO)
  }

  // Id nuevo: reusar el del recurso original podría colisionar en la key del `<ul>`.
  const soloLectura = useSoloLecturaActividad()
  function handlePickFromBiblioteca(recurso: Omit<Recurso, "id">) {
    const list = form.getFieldValue("recursos") as Recurso[]
    if (list.length >= RECURSO_MAX_ITEMS) return
    form.setFieldValue("recursos", [...list, { id: cryptoId(), ...recurso }])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Materiales de apoyo (agrega varios recursos)</h4>
        <div className="flex gap-2">
          <SoloEdicion>
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
                  // La biblioteca necesita la actividad (edición) o el grupo (alta); sin ninguno el backend da 400.
                  disabled={disabled || limiteAlcanzado || (actividadId <= 0 && !grupoId)}
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
          </SoloEdicion>
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
                  // Solo muestra/oculta la lista: en solo lectura sigue activo.
                  disabled={soloLectura ? false : disabled}
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
          {/* `onBlur` del contenedor: si el foco sale del bloque se agrega el borrador solo, para no
          perderlo al ir directo al "Guardar" del form. */}
          {soloLectura ? null : limiteAlcanzado ? (
            <p className="text-muted-foreground text-sm">
              Alcanzaste el máximo de {RECURSO_MAX_ITEMS} materiales de apoyo por actividad. Quitá
              alguno de la lista para agregar otro.
            </p>
          ) : (
            <div
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) handleAddDraft()
              }}
            >
              <RecursoForm
                draft={draft}
                onChange={updateDraft}
                onAdd={handleAddDraft}
                urlInvalida={draftUrlInvalida(draft)}
                disabled={disabled}
              />
            </div>
          )}

          <form.Field name="recursos">
            {(field) => {
              const recursos = field.state.value as Recurso[]
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
                        // "Ver recurso" desmonta el form: se guarda un borrador para restaurarlo al volver.
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

      {/* Se le pasan los recursos actuales para excluir duplicados. */}
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
    </div>
  )
}

/** Form de alta de un recurso; "Agregar a la lista" dispara el commit en el padre. */
function RecursoForm({
  draft,
  onChange,
  onAdd,
  urlInvalida,
  disabled,
}: {
  draft: RecursoDraft
  onChange: (patch: Partial<RecursoDraft>) => void
  onAdd: () => void
  /** Calculado por `RecursosSection` (formato + dominio permitido); `false` con la URL vacía. */
  urlInvalida: boolean
  disabled: boolean
}) {
  // Rechazado en el picker (formato/tamaño): no llega al `draft`.
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  // Tamaño solo para el preview: no viaja al backend.
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<{ nombre: string; size: number } | null>(
    null,
  )

  const FuenteIcon =
    draft.tipo === "Unidad virtual"
      ? ImageIcon
      : draft.tipo === "Archivo"
        ? FileUploadOutlinedIcon
        : null

  // "Unidad virtual" escribe en `draft.url` (`type="url"`): su ejemplo es un enlace.
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

      <Field variant="outlined" className="mt-3">
        <FieldLabel>Nombre</FieldLabel>
        <Input
          maxLength={100}
          placeholder="Nombre con el que se identifica este recurso…"
          value={draft.titulo}
          onChange={(e) => onChange({ titulo: e.target.value })}
          disabled={disabled}
        />
        <CharacterCounter value={draft.titulo} max={100} />
      </Field>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Field variant="outlined">
          <FieldLabel>Tipo</FieldLabel>
          <Select
            value={draft.tipo}
            onValueChange={(v) => {
              setErrorArchivo(null)
              setArchivoSeleccionado(null)
              onChange({
                tipo: (v ?? "URL") as Recurso["tipo"],
                // Al pasar a "Archivo" la URL se limpia (`<input type="file">` solo acepta "").
                url: v === "Archivo" ? "" : draft.url,
              })
            }}
            disabled={disabled}
          >
            <SelectTrigger>
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
              // Acá el `accept` sí va con chequeo real en `onChange` (Regla 82).
              {...(draft.tipo === "Archivo" ? { accept: RECURSO_ARCHIVO_ACCEPT_VALIDADO } : {})}
              placeholder={fuentePlaceholder}
              maxLength={500}
              // `<input type="file">` no acepta `value` programático (tira `InvalidStateError`).
              {...(draft.tipo === "Archivo" ? {} : { value: draft.url })}
              onChange={(e) => {
                // `e.target.value` es un fakepath: el preview necesita un blob URL del `File`.
                if (draft.tipo === "Archivo") {
                  const file = e.target.files?.[0]
                  // Se libera el blob anterior antes de pisarlo.
                  if (draft.url.startsWith("blob:")) {
                    URL.revokeObjectURL(draft.url)
                  }
                  if (!file) {
                    setErrorArchivo(null)
                    setArchivoSeleccionado(null)
                    onChange({ url: "", fuente: "" })
                    return
                  }
                  const extension = extensionDe(file.name)
                  if (!RECURSO_ARCHIVO_EXTENSIONES_PERMITIDAS.includes(extension)) {
                    setErrorArchivo(
                      `Formato ".${extension || "desconocido"}" no permitido. Usá: ${RECURSO_ARCHIVO_EXTENSIONES_PERMITIDAS.join(", ")}.`,
                    )
                    setArchivoSeleccionado(null)
                    onChange({ url: "", fuente: "" })
                    e.target.value = ""
                    return
                  }
                  if (file.size > RECURSO_ARCHIVO_MAX_BYTES) {
                    setErrorArchivo("El archivo supera el tamaño máximo permitido (20 MB).")
                    setArchivoSeleccionado(null)
                    onChange({ url: "", fuente: "" })
                    e.target.value = ""
                    return
                  }
                  setErrorArchivo(null)
                  setArchivoSeleccionado({ nombre: file.name, size: file.size })
                  const blobUrl = URL.createObjectURL(file)
                  // `fuente` guarda el nombre: el resolver lo usa para la extensión (los blob URLs no la tienen).
                  onChange({
                    url: blobUrl,
                    fuente: file.name,
                  })
                } else {
                  onChange({ url: e.target.value })
                }
              }}
              className={FuenteIcon ? "pl-9" : undefined}
              aria-invalid={Boolean(errorArchivo) || urlInvalida}
              disabled={disabled}
            />
          </div>
          {/* Preview "nombre · peso" con estado de validación (pedido de QA). */}
          {draft.tipo === "Archivo" && archivoSeleccionado && !errorArchivo && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <CheckCircleFillIcon className="text-green size-3.5 shrink-0" />
              {archivoSeleccionado.nombre} · {formatBytes(archivoSeleccionado.size)}
            </p>
          )}
          {errorArchivo && (
            <p className="text-red flex items-center gap-1.5 text-xs">
              <XCircleIcon className="size-3.5 shrink-0" />
              {errorArchivo}
            </p>
          )}
          {draft.tipo !== "Archivo" && urlInvalida && (
            <FieldError
              errors={[
                {
                  message:
                    "El enlace no es una URL válida o su dominio no está en la lista de sitios admitidos.",
                },
              ]}
            />
          )}
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

      {/* Se oculta (no se deshabilita) sin URL ni fuente. */}
      {(draft.url.trim() || draft.fuente.trim()) && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="fill"
            color="primary"
            size="sm"
            type="button"
            onClick={onAdd}
            disabled={disabled || Boolean(errorArchivo) || urlInvalida}
          >
            <PlusIcon data-icon="inline-start" />
            {/* No dice "Guardar": solo agrega el borrador a la lista y se confundía con guardar la actividad. */}
            Agregar a la lista
          </Button>
        </div>
      )}
    </div>
  )
}

/** Recurso ya agregado, de solo lectura; las acciones aparecen al hover/foco. */
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
  const { label, Icon, bg, text } = RECURSO_PRESENTACION[recurso.tipo]

  return (
    // `relative` ancla el overlay de acciones; mismo hover que las filas de `DataTable`.
    <li className="group/recuro relative flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-muted-22">
      <span
        aria-hidden
        className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", bg, text)}
      >
        <Icon className="size-6" />
      </span>

      {/* `pr-*` reserva el ancho del overlay de acciones. */}
      <div className="min-w-0 flex-1 pr-24">
        <p
          className="truncate text-sm font-semibold"
          title={recurso.fuente || recurso.url}
        >
          {/* Archivo: muestra el nombre (no tiene URL de este lado); enlace: la URL. */}
          {recurso.fuente || recurso.url || "(sin URL)"}
        </p>
        {recurso.descripcion && (
          <p className="text-muted-foreground truncate text-xs" title={recurso.descripcion}>
            {recurso.descripcion}
          </p>
        )}
      </div>

      <Badge variant="soft" className={cn("shrink-0 text-xs", bg, text)}>
        <Icon data-icon="inline-start" />
        {label}
      </Badge>

      {/* Overlay absoluto (no mueve el contenido al hover). Fondo con `color-mix` opaco:
      `muted-22` lleva alfa y se transparentaba sobre el badge. */}
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
                  // Un material guardado no tiene `url`: se previsualiza por `archivoId`.
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
        <SoloEdicion>
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
        </SoloEdicion>
      </div>
    </li>
  )
}

/** "Entre/Al menos/Hasta" según los extremos que trajo el backend. */
function rangoLabel(min: number | null, max: number | null): string {
  if (min != null && max != null) return `Entre ${min} y ${max}`
  if (min != null) return `Al menos ${min}`
  if (max != null) return `Hasta ${max}`
  return ""
}

/** Ajusta `value` al rango `[min, max]`; se usa en `onBlur` para no trabar el tipeo. */
function clampDigits(value: string, min: number | undefined | null, max: number | undefined | null): string {
  if (!value) return value
  const n = Number(value)
  if (min != null && n < min) return String(min)
  if (max != null && n > max) return String(max)
  return value
}

/** Como `clampDigits`, pero admite un rango ("10-12") y ajusta cada extremo. */
function clampDigitsOrRange(value: string, min: number | undefined | null, max: number | undefined | null): string {
  if (!value) return value
  const partes = value.split("-").map((parte) => clampDigits(parte, min, max))
  return partes.join("-")
}

function ProgramacionSection({ form, disabled }: { form: FormActividad; disabled: boolean }) {
  // Topes reales de la sección (ventana del periodo, días hábiles, duración, semana).
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id)
  const { data: programacion } = useProgramacionActividadQuery(grupoId, asignaturaId, unidadId)
  // Periodos de evaluación cerrados: el backend rechaza actividades ahí, se deshabilitan esos días.
  const { data: periodosEvaluacion = [] } = usePlaneadorPeriodosEvaluacionQuery()
  const periodoAcademicoId = programacion?.periodoAcademico?.id
  const cerrados =
    periodoAcademicoId == null
      ? []
      : periodosCerrados(periodosEvaluacion.filter((p) => p.periodoAcademicoId === periodoAcademicoId))
  const rangosCerrados = rangosDePeriodos(cerrados)
  const avisoCerrados =
    cerrados.length > 0
      ? `Periodo cerrado: ${cerrados
          .map((p) => `${p.nombre} (${formatDiaCorto(p.startDate)} – ${formatDiaCorto(p.endDate)})`)
          .join(", ")}. No se pueden programar actividades en esas fechas.`
      : null
  // El error solo se muestra tras tocar el campo o tras un intento de guardar.
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  const requerido = (value: string) => (value ? undefined : "Este campo es obligatorio.")

  // Contexto de la ventana de fechas, para que el docente sepa de dónde salen los topes.
  const periodoLabel = programacion?.periodoAcademico
    ? `${programacion.periodoAcademico.nombre} (${programacion.periodoAcademico.fechaInicio?.toLocaleDateString("es-CO") ?? "…"} – ${programacion.periodoAcademico.fechaFin?.toLocaleDateString("es-CO") ?? "…"})`
    : null
  const intensidadLabel = programacion?.intensidadHoraria
    ? `Se dicta ${programacion.intensidadHoraria.diasHabiles.map((d) => d.nombre).join(", ")} · ${programacion.intensidadHoraria.bloquesPorSemana} bloque${programacion.intensidadHoraria.bloquesPorSemana === 1 ? "" : "s"} por semana`
    : null

  // Dígitos necesarios para tipear el `max` real (3 como piso mientras carga).
  const duracionEstimadaMaxDigitos = Math.max(
    String(programacion?.duracionEstimada.max ?? 999).length,
    3,
  )

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
                <FieldLabel htmlFor={field.name}>Fecha inicio *</FieldLabel>
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
                  disabledRanges={rangosCerrados}
                  disabled={disabled}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                {programacion?.fechaInicio.motivo && (
                  <FieldDescription>{programacion.fechaInicio.motivo}</FieldDescription>
                )}
                {avisoCerrados && <FieldDescription>{avisoCerrados}</FieldDescription>}
              </Field>
            )
          }}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.fechaInicio}>
          {(fechaInicio) => (
            <form.Field
              name="fechaCierre"
              validators={{
                // `onChangeListenTo` revalida el cierre cuando cambia el inicio.
                onChangeListenTo: ["fechaInicio"],
                onChange: ({ value, fieldApi }) => {
                  const faltante = requerido(value)
                  if (faltante) return faltante
                  const inicio = fieldApi.form.getFieldValue("fechaInicio")
                  if (inicio && value < inicio) {
                    return "La fecha de cierre no puede ser anterior a la fecha de inicio."
                  }
                  return undefined
                },
              }}
            >
              {(field) => {
                const isInvalid =
                  (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
                return (
                  <Field variant="outlined" data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Fecha de entrega o cierre *</FieldLabel>
                    <DatePicker
                      mode="date"
                      id={field.name}
                      value={parseDateValue(field.state.value)}
                      onChange={(date) => {
                        field.handleChange(formatDateValue(date))
                        field.handleBlur()
                      }}
                      // La fecha de inicio elegida manda sobre el mínimo del backend.
                      minDate={
                        parseDateValue(fechaInicio) ?? programacion?.fechaCierre.min ?? undefined
                      }
                      maxDate={programacion?.fechaCierre.max ?? undefined}
                      enabledDaysOfWeek={programacion?.fechaCierre.diasHabiles ?? undefined}
                      disabledRanges={rangosCerrados}
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
              {/* Se captura en MINUTOS aunque la descripción de abajo hable de "bloques" (pedido explícito). */}
              <FieldLabel htmlFor={field.name}>Duración estimada (minutos)</FieldLabel>
              {/* `type="text"` + `inputMode="numeric"` (no `number`, acepta `1e5`), sin `0`.
              El tope de dígitos sale del `max` real del backend. */}
              <Input
                id={field.name}
                inputMode="numeric"
                placeholder="Ej: 20"
                maxLength={duracionEstimadaMaxDigitos}
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(toPositiveDigitsInput(e.target.value, duracionEstimadaMaxDigitos))
                }
                // Se ajusta al rango en `onBlur`: clampear al tipear impediría completar "35" con mínimo 30.
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
              {/* Solo un número o un rango simple ("10-12"). */}
              <Input
                id={field.name}
                inputMode="numeric"
                placeholder="Ej: 10-12"
                maxLength={5}
                value={field.state.value}
                onChange={(e) => field.handleChange(toDigitsOrRangeInput(e.target.value))}
                // Clampea cada extremo al perder el foco.
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
                  {/* Sin esta función "__none__" se pintaba crudo en el trigger. */}
                  <SelectValue placeholder="Seleccione">
                    {(value) => (value === "__none__" ? "Seleccione" : (value as string))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccione</SelectItem>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Virtual">Virtual</SelectItem>
                  <SelectItem value="Híbrida">Híbrida</SelectItem>
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
 * `campos_disponibles.evaluacion` ya viene resuelto por el backend y manda sobre cualquier
 * derivación en el cliente. Se calcula una vez porque `esFormativa` también apaga Adaptaciones y Seguimiento.
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

  // La foto solo aplica mientras la unidad sea la misma con la que se tomó.
  const camposDisponiblesAplica = camposDisponibles != null && (unidadId ?? 0) === actividadUnidadId

  // Con Grado/Asignatura vaciados la foto ya no aplica.
  const sinGradoNiAsignatura = gradoId == null && asignaturaId == null
  // Sin unidad ni foto vigente se resuelve en vivo por grado/asignatura.
  const sinUnidadNiDetalle = unidadId == null && !camposDisponiblesAplica
  // Con unidad se resuelve en vivo por `useConfiguracionActividadQuery`.
  const { data: configuracionEnVivo } = useConfiguracionActividadQuery(
    !camposDisponiblesAplica && unidadId != null ? unidadId : undefined,
    esEvaluativaValue,
  )
  // Se pide siempre con `ES_EVALUATIVA=S` para obtener "¿el referente es evaluativo?" puro:
  // con el `false` actual del toggle, nunca se podría volver a "Sí".
  const { data: configuracionReferente } = useConfiguracionActividadQuery(unidadId, true)
  const { data: referenteDeGradoAsignatura } = useReferenteCurricularQuery(
    sinUnidadNiDetalle ? gradoId : undefined,
    sinUnidadNiDetalle ? asignaturaId : undefined,
  )
  // `campos_disponibles` para una actividad sin unidad (huérfana o recuperación autocompletada).
  const { data: configuracionContexto } = useConfiguracionContextoActividadQuery(
    sinUnidadNiDetalle ? grupoId : undefined,
    sinUnidadNiDetalle ? asignaturaId : undefined,
    esEvaluativaValue,
  )

  // `TIPO_EVALUACION` del referente: decide qué tipos de escala admite `EscalaValoracionSection`.
  const { data: unidadReferente } = useUnidadReferenteQuery(unidadId)
  const tipoEvaluacion =
    unidadId != null ? (unidadReferente?.tipoEvaluacion ?? null) : (referenteDeGradoAsignatura?.tipoEvaluacion ?? null)

  // Fuente efectiva: la foto si sigue aplicando, si no la configuración en vivo.
  const camposEfectivos = camposDisponiblesAplica
    ? camposDisponibles
    : unidadId != null
      ? configuracionEnVivo
      : configuracionContexto

  // `esFormativa` nunca sale de `camposEfectivos`: varía con el toggle actual.
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
  camposEfectivos: ReturnType<typeof useCamposEvaluacionEfectivos>["camposEfectivos"]
  esFormativa: boolean
  /** Una recuperación siempre es sumativa: bloquea el select en "Sí". */
  esRecuperacion: boolean
  tipoEvaluacion: ReturnType<typeof useCamposEvaluacionEfectivos>["tipoEvaluacion"]
  disabled: boolean
}) {
  // `disabled` no corrige el valor: se fuerza `esEvaluativa: false` con referente formativo.
  useEffect(() => {
    if (esFormativa) form.setFieldValue("esEvaluativa", false)
  }, [esFormativa, form])

  // Regla inversa: recuperación siempre sumativa. Nunca chocan con la de arriba.
  useEffect(() => {
    if (esRecuperacion) form.setFieldValue("esEvaluativa", true)
  }, [esRecuperacion, form])

  // Filtrado por `instrumentosPermitidos`; sin config o lista vacía se muestra el catálogo completo.
  const { data: instrumentos = [] } = useInstrumentoEvaluacionCatalogQuery()
  const instrumentosPermitidos = camposEfectivos?.evaluacion.instrumentosPermitidos
  const instrumentosPermitidosLabels = instrumentosPermitidos?.map(instrumentoPermitidoLabel)
  const instrumentosDisponibles =
    instrumentosPermitidosLabels && instrumentosPermitidosLabels.length > 0
      ? instrumentos.filter((instrumento) => instrumentosPermitidosLabels.includes(instrumento))
      : instrumentos

  // Con referente formativo la tarjeta entera no tiene nada que mostrar.
  // El `return null` va después de los hooks.
  if (esFormativa) return null

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
                disabled={esRecuperacion || disabled}
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

        {/* Regla: un referente formativo nunca tiene instrumento de evaluación. */}
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
          <InstrumentoEvaluacionSection
            form={form}
            unidades={unidades}
            tipoEvaluacion={tipoEvaluacion}
            camposEfectivos={camposEfectivos}
            disabled={disabled}
          />

          {/* Orden: ¿sumativa? → instrumento → definición → ponderación. La ponderación sale de
          `camposEfectivos.ponderacion` (`modo`/`motivo` del backend), sin re-derivar el método de la unidad. */}
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
                    <form.Field
                      name="notaMaxima"
                      validators={{
                        onChange: ({ value }) => {
                          if (value == null || Number.isNaN(value)) return undefined
                          if (value <= 0) return { message: "El puntaje debe ser mayor a 0." }
                          return undefined
                        },
                      }}
                    >
                      {(notaMaximaField) => {
                        const isInvalid = notaMaximaField.state.meta.isTouched && !notaMaximaField.state.meta.isValid
                        return (
                          <Field variant="outlined" data-invalid={isInvalid}>
                            <FieldLabel htmlFor={notaMaximaField.name}>
                              Puntaje{ponderacionInfo.requerido ? " *" : ""}
                            </FieldLabel>
                            <Input
                              id={notaMaximaField.name}
                              type="number"
                              min={0}
                              value={notaMaximaField.state.value ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value
                                notaMaximaField.handleChange(raw === "" ? undefined : Number(raw))
                              }}
                              disabled={disabled}
                              aria-invalid={isInvalid}
                            />
                            {isInvalid && <FieldError errors={notaMaximaField.state.meta.errors} />}
                          </Field>
                        )
                      }}
                    </form.Field>
                  </div>
                )
              }
              // Con `visible` sin `modo` todavía cae al campo de porcentaje.
              return (
                <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  <form.Field
                    name="ponderacion"
                    validators={{
                      onChange: ({ value }) => {
                        if (Number.isNaN(value)) return undefined
                        if (value < 0 || value > 100) {
                          return { message: "La ponderación debe estar entre 0 y 100%." }
                        }
                        return undefined
                      },
                    }}
                  >
                    {(ponderacionField) => {
                      const isInvalid = ponderacionField.state.meta.isTouched && !ponderacionField.state.meta.isValid
                      return (
                        <Field variant="outlined" data-invalid={isInvalid}>
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
                            aria-invalid={isInvalid}
                          />
                          {isInvalid && <FieldError errors={ponderacionField.state.meta.errors} />}
                        </Field>
                      )
                    }}
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
 * El instrumento decide el editor (cotejo, escala o rúbrica por defecto). Cada uno tiene
 * su propio field, así que cambiar de instrumento no pierde lo cargado.
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
  camposEfectivos: ReturnType<typeof useCamposEvaluacionEfectivos>["camposEfectivos"]
  disabled: boolean
}) {
  return (
    <form.Subscribe selector={(state) => state.values.instrumento}>
      {(instrumento) =>
        // Sin instrumento elegido no hay nada que definir.
        !instrumento ? null : instrumento === "Lista de cotejo" ? (
          <ListaCotejoSection form={form} unidades={unidades} disabled={disabled} />
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
          <RubricasSection form={form} unidades={unidades} disabled={disabled} />
        )
      }
    </form.Subscribe>
  )
}

/** Editor de la lista de cotejo; el puntaje de cada ítem solo aparece si es sumativa. */
function ListaCotejoSection({
  form,
  unidades,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  disabled: boolean
}) {
  // Tras un intento de guardar, los ítems marcan sus obligatorios aunque no se hayan tocado.
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  // El puntaje es obligatorio solo si la unidad calcula por Ponderado o Suma de puntos.
  // `esEvaluativa` decide si se muestra; esto, si además es obligatorio.
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id) || undefined
  const unidadActual = unidades.find((u) => u.id === unidadId)
  const puntajeObligatorio = unidadActual != null && unidadActual.metodoCalculo !== "Promedio simple"
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Definición Lista de Cotejo</h3>
        <SoloEdicion>
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
        </SoloEdicion>
      </div>

      <form.Subscribe selector={(state) => state.values.esEvaluativa}>
        {(esEvaluativa) => (
          <form.Field
            name="listaCotejo"
            validators={{
              onChange: ({ value }) => {
                const listaCotejo = value as ListaCotejo
                return listaCotejo.items.length === 0
                  ? { message: "Agrega al menos un ítem de la lista de cotejo." }
                  : undefined
              },
            }}
          >
            {(field) => {
              const listaCotejo = field.state.value as ListaCotejo
              const isInvalid = (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
              if (listaCotejo.items.length === 0) {
                return (
                  <div className="rounded-md border border-dashed p-3" data-invalid={isInvalid}>
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Agrega al menos un ítem con el botón de arriba.
                      </p>
                    )}
                  </div>
                )
              }
              const totalPosible = listaCotejo.items.reduce(
                (acc, it) => acc + (Number.isFinite(it.ponderacion) ? (it.ponderacion as number) : 0),
                0,
              )
              return (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                  {listaCotejo.items.map((item, index) => (
                    <ListaCotejoItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      esEvaluativa={esEvaluativa}
                      puntajeObligatorio={puntajeObligatorio}
                      disabled={disabled}
                      submissionAttempts={submissionAttempts}
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
                  {esEvaluativa && (
                    <div className="flex justify-end">
                      <Field variant="outlined" className="w-44">
                        <FieldLabel htmlFor="lista-cotejo-total-posible">Total posible</FieldLabel>
                        <Input id="lista-cotejo-total-posible" type="number" value={totalPosible} readOnly disabled />
                      </Field>
                    </div>
                  )}
                  {/* Botón repetido al pie para no tener que volver arriba (QA Bloque 5, criterio #3). */}
                  <SoloEdicion>
                  <div className="flex justify-end">
                    <Button
                      variant="fill"
                      color="primary"
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const current = field.state.value as ListaCotejo
                        field.handleChange({
                          ...current,
                          items: [...current.items, { id: cryptoId(), descripcion: "" }],
                        })
                      }}
                    >
                      <PlusCircleIcon data-icon="inline-start" />
                      Agregar ítem
                    </Button>
                  </div>
                  </SoloEdicion>
                </>
              )
            }}
          </form.Field>
        )}
      </form.Subscribe>
    </Card>
  )
}

function ListaCotejoItemCard({
  item,
  index,
  esEvaluativa,
  puntajeObligatorio,
  disabled,
  submissionAttempts,
  onChange,
  onRemove,
}: {
  item: ListaCotejoItem
  index: number
  esEvaluativa: boolean
  /**
   * Descripción obligatoria siempre; puntaje solo si `puntajeObligatorio` (si no, pesa 1).
   * Con valor, entre 0 y 100.
   */
  puntajeObligatorio: boolean
  disabled: boolean
  submissionAttempts: number
  onChange: (next: ListaCotejoItem) => void
  onRemove: () => void
}) {
  const [tocoDescripcion, setTocoDescripcion] = useState(false)
  const [tocoPonderacion, setTocoPonderacion] = useState(false)

  const descripcionInvalida = (tocoDescripcion || submissionAttempts > 0) && !item.descripcion.trim()
  const tocoOIntento = tocoPonderacion || submissionAttempts > 0
  const ponderacionAusente = puntajeObligatorio && tocoOIntento && item.ponderacion == null
  const ponderacionFueraDeRango =
    tocoOIntento && item.ponderacion != null && (item.ponderacion < 0 || item.ponderacion > 100)
  const ponderacionInvalida = ponderacionAusente || ponderacionFueraDeRango

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Ítem {index + 1}</h4>
        <SoloEdicion>
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
        </SoloEdicion>
      </div>

      {/* Sin `esEvaluativa` el campo de puntaje no se monta. */}
      <div className="mt-3 flex items-start gap-3">
        <Field variant="outlined" className="min-w-0 flex-1" data-invalid={descripcionInvalida}>
          <FieldLabel htmlFor={`${item.id}-descripcion`}>Descripción del elemento</FieldLabel>
          <Textarea
            id={`${item.id}-descripcion`}
            className={TEXTAREA_OUTLINED}
            rows={2}
            maxLength={500}
            value={item.descripcion}
            onChange={(e) => onChange({ ...item, descripcion: e.target.value })}
            onBlur={() => setTocoDescripcion(true)}
            aria-invalid={descripcionInvalida}
            disabled={disabled}
          />
          {descripcionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
        </Field>

        {esEvaluativa && (
          <Field variant="outlined" className="w-44 shrink-0" data-invalid={ponderacionInvalida}>
            <FieldLabel htmlFor={`${item.id}-ponderacion`}>Puntaje del elemento</FieldLabel>
            <Input
              id={`${item.id}-ponderacion`}
              type="number"
              min={0}
              max={100}
              value={item.ponderacion ?? ""}
              onChange={(e) => {
                const raw = e.target.value
                // Vacío → `undefined`, no `0`.
                onChange({ ...item, ponderacion: raw === "" ? undefined : Number(raw) })
              }}
              onBlur={() => setTocoPonderacion(true)}
              aria-invalid={ponderacionInvalida}
              disabled={disabled}
            />
            {ponderacionInvalida && (
              <FieldError
                errors={ponderacionAusente ? ERROR_OBLIGATORIO : [{ message: "El puntaje debe estar entre 0 y 100." }]}
              />
            )}
          </Field>
        )}
      </div>
    </div>
  )
}

/**
 * Editor de la escala de valoración: Numérica (rango + interpretación) o Cualitativa
 * (niveles editables). Al pasar a Cualitativa sin niveles se siembran los por defecto.
 */
const NIVELES_CUALITATIVOS_DEFAULT = ["Bajo", "Medio", "Alto"]

/** Elige el default por nombre ya usado, no por posición: evita nombres repetidos al borrar. */
function nextNivelCualitativoNombre(nivelesActuales: { nombre: string }[]): string {
  const nombresUsados = new Set(nivelesActuales.map((nivel) => nivel.nombre))
  const siguienteDefault = NIVELES_CUALITATIVOS_DEFAULT.find((nombre) => !nombresUsados.has(nombre))
  return siguienteDefault ?? `Nivel ${nivelesActuales.length + 1}`
}

/**
 * Niveles iniciales de la escala cualitativa: los de la rúbrica de la unidad (con sus
 * descripciones) como borrador independiente; sin ellos, `NIVELES_CUALITATIVOS_DEFAULT`.
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
  /** `TIPO_EVALUACION` del referente; `null` no restringe. */
  tipoEvaluacion: string | null
  disabled: boolean
}) {
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id) || undefined
  const unidadActual = unidades.find((u) => u.id === unidadId)
  // Errores inline; quien frena el guardado es `faltantesEscala`.
  const intentoGuardar = useSelector(form.store, (state) => state.submissionAttempts) > 0

  // CUANTITATIVA solo admite Numérica, CUALITATIVA solo Cualitativa; mixto o sin dato, ambas.
  const permiteNumerica = tipoEvaluacion !== "CUALITATIVA"
  const permiteCualitativa = tipoEvaluacion !== "CUANTITATIVA"

  // Si la escala elegida dejó de estar permitida se corrige al único tipo admitido.
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

              const minimoAusente = intentoGuardar && escala.valorMinimo == null
              const maximoAusente = intentoGuardar && escala.valorMaximo == null
              const rangoInvertido =
                intentoGuardar &&
                escala.valorMinimo != null &&
                escala.valorMaximo != null &&
                escala.valorMinimo >= escala.valorMaximo
              const sinNiveles = intentoGuardar && escala.niveles.length === 0

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
                            // Solo siembra si no hay niveles cargados.
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
                          {/* La opción que el referente no admite ni se muestra. */}
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
                          <Field variant="outlined" data-invalid={minimoAusente}>
                            <FieldLabel htmlFor={`${escala.id}-valor-minimo`}>
                              Valor mínimo *
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
                              aria-invalid={minimoAusente}
                              disabled={disabled}
                            />
                            {minimoAusente && <FieldError errors={ERROR_OBLIGATORIO} />}
                          </Field>
                          <Field variant="outlined" data-invalid={maximoAusente || rangoInvertido}>
                            <FieldLabel htmlFor={`${escala.id}-valor-maximo`}>
                              Valor máximo *
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
                              aria-invalid={maximoAusente || rangoInvertido}
                              disabled={disabled}
                            />
                            {maximoAusente && <FieldError errors={ERROR_OBLIGATORIO} />}
                            {rangoInvertido && (
                              <FieldError errors={[{ message: "Debe ser mayor que el valor mínimo." }]} />
                            )}
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
                          <SoloEdicion>
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
                              // Lista vacía: el "+" siembra todo el set por defecto.
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
                                    nombre: nextNivelCualitativoNombre(escala.niveles),
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
                          </SoloEdicion>
                        </div>

                        {escala.niveles.length === 0 ? (
                          <div data-invalid={sinNiveles}>
                            {sinNiveles ? (
                              <FieldError errors={[{ message: "Agrega al menos una definición cualitativa." }]} />
                            ) : (
                              <p className="text-muted-foreground text-sm">
                                Esta escala todavía no tiene definiciones cualitativas.
                              </p>
                            )}
                          </div>
                        ) : (
                          <ul className="flex flex-col gap-3">
                            {escala.niveles.map((nivel, nIndex) => {
                              const descripcionInvalida = intentoGuardar && !nivel.descripcion.trim()
                              // El backend exige siempre el puntaje de cada nivel (0-100).
                              const puntajeInvalido =
                                intentoGuardar &&
                                (nivel.ponderacion == null || nivel.ponderacion < 0 || nivel.ponderacion > 100)
                              return (
                              <li
                                key={nivel.id}
                                className={cn(
                                  "grid items-start gap-3",
                                  esEvaluativa
                                    ? "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_9rem_auto]"
                                    : "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_auto]",
                                )}
                              >
                                {/* El nombre del nivel es editable (a diferencia de la rúbrica). */}
                                <Input
                                  variant="outlined"
                                  maxLength={50}
                                  value={nivel.nombre}
                                  onChange={(e) => updateNivel(nIndex, { nombre: e.target.value })}
                                  disabled={disabled}
                                />
                                <Field data-invalid={descripcionInvalida}>
                                  <Input
                                    variant="outlined"
                                    placeholder="Interpretación / descriptor"
                                    maxLength={50}
                                    value={nivel.descripcion}
                                    onChange={(e) =>
                                      updateNivel(nIndex, { descripcion: e.target.value })
                                    }
                                    aria-invalid={descripcionInvalida}
                                    disabled={disabled}
                                  />
                                  {descripcionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
                                </Field>
                                {esEvaluativa && (
                                  <Field variant="outlined" data-invalid={puntajeInvalido}>
                                    <FieldLabel htmlFor={`${nivel.id}-ponderacion`}>
                                      Puntaje *
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
                                      aria-invalid={puntajeInvalido}
                                      disabled={disabled}
                                    />
                                    {puntajeInvalido && (
                                      <FieldError
                                        errors={
                                          nivel.ponderacion == null
                                            ? ERROR_OBLIGATORIO
                                            : [{ message: "El puntaje debe estar entre 0 y 100." }]
                                        }
                                      />
                                    )}
                                  </Field>
                                )}
                                <SoloEdicion>
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
                                </SoloEdicion>
                              </li>
                              )
                            })}
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
 * Instrumento "Otro (personalizado)": ficha fija con evidencia, método y opciones de entrega.
 * El método monta la misma sección de definición que ese instrumento elegido directamente.
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
  /**
   * Ficha dinámica de "Otro" (`instrumentosPermitidos[OTRO].campos`). `null` mientras no
   * resuelve: cae a un catálogo fijo.
   */
  camposOtro: InstrumentoPermitidoCampos | null
  disabled: boolean
}) {
  // Tras un intento de guardar, tipo de evidencia y método marcan en rojo aunque no se hayan
  // tocado: son los obligatorios de "Otro".
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  const tipoEvidenciaCatalogo =
    camposOtro?.tipoEvidencia.catalogo && camposOtro.tipoEvidencia.catalogo.length > 0
      ? camposOtro.tipoEvidencia.catalogo
      : TIPO_EVIDENCIA_ESPERADA_CATALOGO_DEFAULT
  const metodoValoracionCatalogo =
    camposOtro?.metodoValoracion.catalogo && camposOtro.metodoValoracion.catalogo.length > 0
      ? camposOtro.metodoValoracion.catalogo
      : METODO_VALORACION_CATALOGO_DEFAULT
  // Regla 41: tope de 200 (el endpoint reporta 4000), se acota con `min`.
  const descripcionMaxLength = Math.min(camposOtro?.descripcionInstrumento.maxLength ?? 200, 200)

  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Definición del instrumento personalizado</h3>

      <form.Field
        name="instrumentoPersonalizado"
        validators={{
          onChange: ({ value }) => {
            const v = value as InstrumentoPersonalizado
            // Mismo orden que el validador real.
            if (!v.tipoEvidenciaEsperada) {
              return { message: "Indique el tipo de evidencia esperada." }
            }
            if (!v.metodoValoracion) {
              return { message: "Indique el método de valoración." }
            }
            return undefined
          },
        }}
      >
        {(field) => {
          const value = field.state.value as InstrumentoPersonalizado
          // Regla 41: la opción de entrega que dicta el tipo queda marcada y deshabilitada; la otra libre.
          const entregaPorTipo = TIPO_EVIDENCIA_CHECKBOX_DEFAULT[value.tipoEvidenciaEsperada]
          function patch(next: Partial<InstrumentoPersonalizado>) {
            field.handleChange({ ...value, ...next })
          }
          // El validador es uno solo para el objeto: se recalcula qué select falta para marcar solo ese.
          const tocado = field.state.meta.isTouched || submissionAttempts > 0
          const tipoEvidenciaInvalido = tocado && !value.tipoEvidenciaEsperada
          const metodoValoracionInvalido = tocado && !value.metodoValoracion
          return (
            <>
              <Field variant="outlined">
                <FieldLabel htmlFor="instrumentoPersonalizado-descripcion">
                  Descripción del instrumento
                </FieldLabel>
                <Textarea
                  id="instrumentoPersonalizado-descripcion"
                  className={TEXTAREA_OUTLINED}
                  rows={3}
                  placeholder="Agregar descripción breve"
                  maxLength={descripcionMaxLength}
                  value={value.descripcion}
                  onChange={(e) => patch({ descripcion: e.target.value })}
                  disabled={disabled}
                />
                <CharacterCounter value={value.descripcion} max={descripcionMaxLength} />
              </Field>

              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <Field variant="outlined" data-invalid={tipoEvidenciaInvalido}>
                  <FieldLabel htmlFor="instrumentoPersonalizado-tipo-evidencia">
                    Tipo de evidencia esperada *
                  </FieldLabel>
                  <Select
                    value={value.tipoEvidenciaEsperada}
                    onValueChange={(v) => {
                      if (!v) return
                      const defecto = TIPO_EVIDENCIA_CHECKBOX_DEFAULT[v]
                      patch({
                        tipoEvidenciaEsperada: v,
                        ...(defecto
                          ? {
                              requiereArchivo: defecto === "archivo",
                              requiereRespuestaTexto: defecto === "texto",
                            }
                          : {}),
                      })
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger id="instrumentoPersonalizado-tipo-evidencia" aria-invalid={tipoEvidenciaInvalido}>
                      <SelectValue placeholder="Seleccione">
                        {(v) =>
                          // `??` no sirve: sin selección `v` llega como `""`.
                          v ? (TIPO_EVIDENCIA_ESPERADA_LABELS[v as string] ?? (v as string)) : "Seleccione"
                        }
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
                  {tipoEvidenciaInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
                </Field>

                <Field variant="outlined" data-invalid={metodoValoracionInvalido}>
                  <FieldLabel htmlFor="instrumentoPersonalizado-metodo-valoracion">
                    Método de valoración *
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
                    <SelectTrigger
                      id="instrumentoPersonalizado-metodo-valoracion"
                      aria-invalid={metodoValoracionInvalido}
                    >
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
                  {metodoValoracionInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
                </Field>
              </div>

              {/* El método elegido monta acá su definición, antes de las opciones de entrega. */}
              {value.metodoValoracion === "Rúbrica" ? (
                <RubricasSection form={form} unidades={unidades} disabled={disabled} />
              ) : value.metodoValoracion === "Lista de cotejo" ? (
                <ListaCotejoSection form={form} unidades={unidades} disabled={disabled} />
              ) : value.metodoValoracion === "Escala de valoración" ? (
                <EscalaValoracionSection
                  form={form}
                  unidades={unidades}
                  tipoEvaluacion={tipoEvaluacion}
                  disabled={disabled}
                />
              ) : null}

              <FieldSet>
                <FieldLegend variant="label">Opciones de entrega</FieldLegend>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={entregaPorTipo === "archivo" || value.requiereArchivo}
                      onCheckedChange={(next) => patch({ requiereArchivo: next === true })}
                      disabled={disabled || entregaPorTipo === "archivo"}
                    />
                    El estudiante debe adjuntar un archivo
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={entregaPorTipo === "texto" || value.requiereRespuestaTexto}
                      onCheckedChange={(next) => patch({ requiereRespuestaTexto: next === true })}
                      disabled={disabled || entregaPorTipo === "texto"}
                    />
                    El estudiante debe escribir una respuesta (texto)
                  </label>
                </div>
              </FieldSet>
            </>
          )
        }}
      </form.Field>
    </Card>
  )
}

function RubricasSection({
  form,
  unidades,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  disabled: boolean
}) {
  // Rúbrica: al menos un criterio es obligatorio.
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  // El puntaje es obligatorio solo si la unidad calcula por Ponderado o Suma de puntos (si no, pesa 1).
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id) || undefined
  const unidadActual = unidades.find((u) => u.id === unidadId)
  const puntajeObligatorio = unidadActual != null && unidadActual.metodoCalculo !== "Promedio simple"
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Definición de Rúbricas *</h3>
        <SoloEdicion>
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
                      { id: cryptoId(), nombre: "", descripcion: "", excelente: "", niveles: [], ponderacion: 0 },
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
        </SoloEdicion>
      </div>

      <form.Subscribe selector={(state) => state.values.esEvaluativa}>
        {(esEvaluativa) => (
          <form.Field
            name="rubrica"
            validators={{
              onChange: ({ value }) => {
                const rubrica = value as { id: number; criterios: Criterio[] }
                return rubrica.criterios.length === 0
                  ? { message: "Agrega al menos un criterio de rúbrica." }
                  : undefined
              },
            }}
          >
            {(field) => {
              const rubrica = field.state.value as { id: number; criterios: Criterio[] }
              const isInvalid = (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
              if (rubrica.criterios.length === 0) {
                return (
                  <div className="rounded-md border border-dashed p-3" data-invalid={isInvalid}>
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Agrega al menos un criterio con el botón de arriba.
                      </p>
                    )}
                  </div>
                )
              }
              return (
                <>
                  <ul className="flex flex-col gap-6">
                    {rubrica.criterios.map((criterio, index) => (
                      <CriterioItem
                        key={criterio.id}
                        criterio={criterio}
                        index={index}
                        esEvaluativa={esEvaluativa}
                        puntajeObligatorio={puntajeObligatorio}
                        disabled={disabled}
                        submissionAttempts={submissionAttempts}
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
                  {/* Botón repetido al pie para no tener que volver arriba (QA Bloque 5, criterio #3). */}
                  <SoloEdicion>
                  <div className="flex justify-end">
                    <Button
                      variant="fill"
                      color="primary"
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const current = field.state.value as { id: number; criterios: Criterio[] }
                        field.handleChange({
                          ...current,
                          criterios: [
                            ...current.criterios,
                            { id: cryptoId(), nombre: "", descripcion: "", excelente: "", niveles: [], ponderacion: 0 },
                          ],
                        })
                      }}
                    >
                      <PlusCircleIcon data-icon="inline-start" />
                      Agregar criterio
                    </Button>
                  </div>
                  </SoloEdicion>
                </>
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
  puntajeObligatorio,
  disabled,
  submissionAttempts,
  onChange,
  onRemove,
}: {
  criterio: Criterio
  index: number
  /** Con actividad sumativa cada nivel lleva su campo de puntaje. */
  esEvaluativa: boolean
  /**
   * Nombre y descripción de cada nivel (incluido "Excelente") obligatorios; puntaje solo si
   * `puntajeObligatorio` (si no, pesa 1). Con valor, entre 0 y 100.
   */
  puntajeObligatorio: boolean
  disabled: boolean
  /** Sin `form`: validación local por `blur`, con `submissionAttempts` como fallback. */
  submissionAttempts: number
  onChange: (next: Criterio) => void
  onRemove: () => void
}) {
  // Buffer local: no toca el criterio ni ensucia el form hasta "Agregar nivel".
  const [nivelInput, setNivelInput] = useState("")

  const [tocoNombre, setTocoNombre] = useState(false)
  const [tocoExcelenteDescripcion, setTocoExcelenteDescripcion] = useState(false)
  const [tocoExcelentePonderacion, setTocoExcelentePonderacion] = useState(false)
  // "Tocado" por `nivel.id`: la lista es dinámica.
  const [tocadosNivelDescripcion, setTocadosNivelDescripcion] = useState<Set<number>>(new Set())
  const [tocadosNivelPonderacion, setTocadosNivelPonderacion] = useState<Set<number>>(new Set())
  const marcarNivelDescripcionTocado = (id: number) =>
    setTocadosNivelDescripcion((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  const marcarNivelPonderacionTocado = (id: number) =>
    setTocadosNivelPonderacion((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))

  const nombreInvalido = (tocoNombre || submissionAttempts > 0) && !criterio.nombre.trim()
  const excelenteDescripcionInvalida =
    (tocoExcelenteDescripcion || submissionAttempts > 0) && !criterio.excelente.trim()
  const excelentePonderacionInvalida =
    puntajeObligatorio && (tocoExcelentePonderacion || submissionAttempts > 0) && criterio.excelentePonderacion == null
  // Al menos un nivel por criterio ("Excelente" cuenta si tiene contenido).
  const sinNiveles =
    submissionAttempts > 0 &&
    criterio.niveles.length === 0 &&
    !criterio.excelente.trim() &&
    criterio.excelentePonderacion == null

  return (
    <li className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Criterio {index + 1}</h4>
        <SoloEdicion>
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
        </SoloEdicion>
      </div>

      <Field variant="outlined" className="mt-3" data-invalid={nombreInvalido}>
        <FieldLabel>Nombre del criterio</FieldLabel>
        <Input
          placeholder="Ej: Expresión oral de ideas y experiencias"
          maxLength={50}
          value={criterio.nombre}
          onChange={(e) => onChange({ ...criterio, nombre: e.target.value })}
          onBlur={() => setTocoNombre(true)}
          aria-invalid={nombreInvalido}
          disabled={disabled}
        />
        {nombreInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
      </Field>

      {/* Descripción del criterio en sí, distinta de la de cada nivel. */}
      <Field variant="outlined" className="mt-3">
        <FieldLabel>Descripción o Juicio de valor</FieldLabel>
        <Textarea
          className={TEXTAREA_OUTLINED}
          rows={2}
          placeholder="Describe qué evalúa este criterio en general"
          maxLength={4000}
          value={criterio.descripcion}
          onChange={(e) => onChange({ ...criterio, descripcion: e.target.value })}
          disabled={disabled}
        />
        <CharacterCounter value={criterio.descripcion} max={4000} />
      </Field>

      {/* "Excelente" es el nivel más alto pero vive en su propio field; usa el mismo grid que
      los niveles y solo se muestra con contenido. */}
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
          <Field data-invalid={excelenteDescripcionInvalida}>
            <Textarea
              className={TEXTAREA_OUTLINED}
              rows={2}
              placeholder="Describe el desempeño esperado en este nivel"
              maxLength={500}
              value={criterio.excelente}
              onChange={(e) => onChange({ ...criterio, excelente: e.target.value })}
              onBlur={() => setTocoExcelenteDescripcion(true)}
              aria-invalid={excelenteDescripcionInvalida}
              disabled={disabled}
            />
            {excelenteDescripcionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
          </Field>
          {/* Vacío no se guarda como `0`. */}
          {esEvaluativa && (
            <Field variant="outlined" data-invalid={excelentePonderacionInvalida}>
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
                  // Regla 42: "Excelente" cuenta para el puntaje del criterio.
                  if (raw === "") {
                    const next = { ...criterio, excelentePonderacion: undefined }
                    onChange({ ...next, ponderacion: maxPonderacionCriterio(next) })
                    return
                  }
                  const num = Number(raw)
                  const next = {
                    ...criterio,
                    excelentePonderacion: Number.isNaN(num) ? undefined : Math.min(100, Math.max(0, num)),
                  }
                  onChange({ ...next, ponderacion: maxPonderacionCriterio(next) })
                }}
                onBlur={() => setTocoExcelentePonderacion(true)}
                aria-invalid={excelentePonderacionInvalida}
                disabled={disabled}
              />
              {excelentePonderacionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
          )}
          {/* Quita el bloque entero (texto y puntaje). */}
          <SoloEdicion>
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
                  onClick={() => {
                    const next = { ...criterio, excelente: "", excelentePonderacion: undefined }
                    onChange({ ...next, ponderacion: maxPonderacionCriterio(next) })
                  }}
                />
              }
            >
              <TrashIcon />
            </TooltipTrigger>
            <TooltipContent>Quitar excelente</TooltipContent>
          </Tooltip>
          </SoloEdicion>
        </div>
      )}

      {/* Niveles: nombre como label, descripción y, si es sumativa, columna de puntaje. */}
      <ul className="mt-4 flex flex-col gap-3">
        {criterio.niveles.map((nivel, nIndex) => {
          const descripcionInvalida =
            (tocadosNivelDescripcion.has(nivel.id) || submissionAttempts > 0) && !nivel.descripcion.trim()
          const ponderacionInvalida =
            puntajeObligatorio &&
            (tocadosNivelPonderacion.has(nivel.id) || submissionAttempts > 0) &&
            nivel.ponderacion == null
          return (
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
            <Field data-invalid={descripcionInvalida}>
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
                onBlur={() => marcarNivelDescripcionTocado(nivel.id)}
                aria-invalid={descripcionInvalida}
                disabled={disabled}
              />
              {descripcionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
            {esEvaluativa && (
              <Field variant="outlined" data-invalid={ponderacionInvalida}>
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
                    // Vacío → `undefined`; clamp real, no solo el `min`/`max` del `<input>`.
                    if (raw === "") {
                      next[nIndex] = { ...nivel, ponderacion: undefined }
                    } else {
                      const num = Number(raw)
                      next[nIndex] = {
                        ...nivel,
                        ponderacion: Number.isNaN(num) ? undefined : Math.min(100, Math.max(0, num)),
                      }
                    }
                    // Regla 42: el puntaje del criterio es de solo lectura, el máximo de sus niveles.
                    onChange({
                      ...criterio,
                      niveles: next,
                      ponderacion: maxPonderacionCriterio({ ...criterio, niveles: next }),
                    })
                  }}
                  onBlur={() => marcarNivelPonderacionTocado(nivel.id)}
                  aria-invalid={ponderacionInvalida}
                  disabled={disabled}
                />
                {ponderacionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
              </Field>
            )}
            <SoloEdicion>
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
                      onChange({
                        ...criterio,
                        niveles: next,
                        ponderacion: maxPonderacionCriterio({ ...criterio, niveles: next }),
                      })
                    }}
                  />
                }
              >
                <TrashIcon />
              </TooltipTrigger>
              <TooltipContent>{`Quitar nivel ${nivel.nombre}`}</TooltipContent>
            </Tooltip>
            </SoloEdicion>
          </li>
          )
        })}
      </ul>

      {/* Split-button: bordes anulados para leerse como un solo control. `mt-6` deja libre el
      label outlined, que asoma por encima del `Field`. */}
      <SoloEdicion>
      <Field
        variant="outlined"
        className="mt-6 [&_[data-slot=input]]:rounded-r-none [&_[data-slot=input]]:border-r-0"
        data-invalid={sinNiveles}
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
              // El texto tipeado es el `nombre`; la descripción arranca vacía.
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
        {sinNiveles && <FieldError errors={[{ message: "Agrega al menos un nivel de desempeño." }]} />}
      </Field>
      </SoloEdicion>

      {/* Regla 42: puntaje del criterio de solo lectura, máximo de sus niveles. */}
      <Field variant="outlined" className="mt-4 max-w-48">
        <FieldLabel>Puntaje</FieldLabel>
        <Input type="number" value={criterio.ponderacion} disabled readOnly />
      </Field>
    </li>
  )
}

/** Regla 42: máximo de los puntajes de los niveles, incluido "Excelente". 0 si no hay ninguno. */
function maxPonderacionCriterio(criterio: {
  niveles: { ponderacion?: number }[]
  excelentePonderacion?: number
}): number {
  return criterio.niveles.reduce(
    (max, n) => Math.max(max, n.ponderacion ?? 0),
    criterio.excelentePonderacion ?? 0,
  )
}

function AdaptacionesSection({
  form,
  matriculas,
  disabled,
  actividadId,
}: {
  form: FormActividad
  matriculas: MatriculaGrupo[]
  disabled: boolean
  actividadId: number
}) {
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  // Error de "obligatorio" = "tocado" local del item o intento de guardar del form.
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  // Regla 47: solo estudiantes de la actividad, no todo el grupo (el backend rechaza el resto).
  const asignarTodoElGrupo = useSelector(form.store, (state) => state.values.asignarTodoElGrupo)
  const matriculasIds = useSelector(form.store, (state) => state.values.matriculasIds)
  const estudiantesActividad = matriculas.filter((m) =>
    esEstudianteDeLaActividad({ asignarTodoElGrupo, matriculasIds }, m.id),
  )
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
                especificacionTipo: "",
                descripcion: "",
                versionModificada: "no",
                versionModificadaRef: "",
                nombrePlantilla: "",
                aplicaA: "",
                estudiantesIds: [],
                archivos: [],
              },
            ])
          // El "+" vive siempre en el header, haya o no adaptaciones.
          return (
            <>
              <div className="flex items-center justify-between rounded-md border bg-card p-3">
                <p className="text-sm font-semibold">
                  {adaptaciones.length === 0
                    ? "Si aplica, registre las adaptaciones"
                    : "Adaptaciones registradas"}
                </p>
                <SoloEdicion>
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
                </SoloEdicion>
              </div>

              {adaptaciones.length > 0 && (
                <ul className="mt-3 flex flex-col gap-3">
                  {adaptaciones.map((adapt, aIndex) => (
                    <AdaptacionItem
                      key={aIndex}
                      index={aIndex}
                      adaptacion={adapt}
                      matriculas={estudiantesActividad}
                      disabled={disabled}
                      actividadId={actividadId}
                      grupoId={grupoId ?? 0}
                      submissionAttempts={submissionAttempts}
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
 * Abre la plantilla ya subida en pestaña nueva. No usa `RecursoPreview`: no hay nombre
 * de archivo para adivinar el tipo, el navegador decide por el `Content-Type`.
 */
function VerPlantillaAdaptacion({ archivoId }: { archivoId: number }) {
  const { data: url, isPending } = useArchivoViewUrl(archivoId)
  if (isPending || !url) return null
  return (
    <Button
      variant="ghost"
      color="neutral"
      size="sm"
      type="button"
      render={<a href={url} target="_blank" rel="noopener noreferrer" />}
    >
      <EyeIcon data-icon="inline-start" />
      Ver plantilla cargada
    </Button>
  )
}

/**
 * Regla 50: combobox con las versiones modificadas que el propio docente registró en otras
 * actividades, filtradas por el tipo elegido. Una sola página de 100, filtrado en el cliente.
 */
function AdaptacionBibliotecaField({
  actividadId,
  grupoId,
  adaptacion,
  onChange,
  disabled,
}: {
  actividadId: number
  grupoId: number
  adaptacion: Adaptacion
  onChange: (next: Adaptacion) => void
  disabled: boolean
}) {
  const tieneAncla = actividadId > 0 || grupoId > 0
  const { data: tipoAdaptacionOptions } = useTipoAdaptacionCatalogQuery()
  const tipoAdaptacionId = tipoAdaptacionOptions?.find((o) => o.tipo === adaptacion.tipo)?.id
  const { data, isPending } = useAdaptacionesReutilizablesQuery(
    { actividadId, grupoId, tipoAdaptacionId, search: "", pagina: 1, size: 100 },
    tieneAncla,
  )
  const items = data?.items ?? []
  // Se identifica por la fila de origen: una plantilla de solo enlace no tiene archivo.
  const seleccionado = items.find((item) =>
    item.archivoId != null
      ? item.archivoId === adaptacion.archivoId
      : item.url != null && item.url === adaptacion.versionModificadaRef,
  )
  const etiqueta = (item: AdaptacionReutilizable) => item.nombrePlantilla || item.nombreArchivo || item.url || "—"

  function handleChange(value: string | null) {
    const item = items.find((it) => String(it.pkTactividadAdaptacion) === value)
    onChange({
      ...adaptacion,
      archivoId: item?.archivoId,
      archivoNombre: item?.nombreArchivo,
      // Sin blob: el recurso ya está en el servidor; si es de solo enlace viaja la URL.
      versionModificadaRef: item?.archivoId == null ? (item?.url ?? "") : "",
    })
  }

  return (
    <ComboboxField
      items={Object.fromEntries(
        items.map((item) => [String(item.pkTactividadAdaptacion), `${etiqueta(item)} — de: ${item.actividadOrigenTitulo}`]),
      )}
      value={seleccionado ? String(seleccionado.pkTactividadAdaptacion) : null}
      onValueChange={handleChange}
      disabled={disabled || !tieneAncla}
    >
      <ComboboxFieldTrigger className="w-full">
        <ComboboxFieldValue placeholder={!tieneAncla ? "Elegí un grupo primero" : "Seleccione"}>
          {() => (seleccionado ? etiqueta(seleccionado) : "Seleccione")}
        </ComboboxFieldValue>
      </ComboboxFieldTrigger>
      <ComboboxFieldContent>
        <ComboboxGroup>
          {items.map((item) => (
            <ComboboxFieldItem key={item.pkTactividadAdaptacion} value={String(item.pkTactividadAdaptacion)}>
              <span className="flex flex-col">
                <span>{etiqueta(item)}</span>
                <span className="text-muted-foreground text-xs">de: {item.actividadOrigenTitulo}</span>
              </span>
            </ComboboxFieldItem>
          ))}
        </ComboboxGroup>
        <ComboboxEmpty>
          {isPending
            ? "Buscando…"
            : "No hay plantillas guardadas en tus otras actividades todavía."}
        </ComboboxEmpty>
      </ComboboxFieldContent>
    </ComboboxField>
  )
}

// Formatos de la plantilla de adaptación (documentos, no multimedia). Se valida en el
// cliente (pedido de QA).
const ADAPTACION_ARCHIVO_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png"
const ADAPTACION_ARCHIVO_MIME_ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]
const ADAPTACION_ARCHIVO_MAX_BYTES = 10 * 1024 * 1024

/** Sin protocolo (`http`/`https`) no sirve como enlace. */
function esUrlValida(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Bloque de una adaptación curricular. `especificacionTipo`/`nombrePlantilla` validan por
 * `blur`; el checklist de estudiantes además con `submissionAttempts` (el backend rechaza la lista vacía).
 */
function AdaptacionItem({
  index,
  adaptacion,
  matriculas,
  disabled,
  actividadId,
  grupoId,
  submissionAttempts,
  onChange,
  onRemove,
}: {
  index: number
  adaptacion: Adaptacion
  matriculas: MatriculaGrupo[]
  disabled: boolean
  actividadId: number
  grupoId: number
  submissionAttempts: number
  onChange: (next: Adaptacion) => void
  onRemove: () => void
}) {
  const [tocoEspecificacionTipo, setTocoEspecificacionTipo] = useState(false)
  const [tocoNombrePlantilla, setTocoNombrePlantilla] = useState(false)
  // Rechazado en el picker (formato/tamaño): no llega a `adaptacion`.
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const [tocoEnlace, setTocoEnlace] = useState(false)
  const [tocoEstudiantes, setTocoEstudiantes] = useState(false)

  const especificacionTipoInvalida =
    tocoEspecificacionTipo && adaptacion.tipo === "Otro" && !adaptacion.especificacionTipo.trim()
  const nombrePlantillaInvalida =
    tocoNombrePlantilla &&
    (adaptacion.versionModificada === "archivo" || adaptacion.versionModificada === "enlace") &&
    !adaptacion.nombrePlantilla.trim()
  const enlaceInvalido =
    tocoEnlace && adaptacion.versionModificada === "enlace" && adaptacion.versionModificadaRef !== "" &&
    !esUrlValida(adaptacion.versionModificadaRef)
  // Solo cuentan los que siguen siendo estudiantes de la actividad.
  const estudiantesSeleccionados = adaptacion.estudiantesIds.filter((id) => matriculas.some((m) => m.id === id))
  const todosSeleccionados = matriculas.length > 0 && estudiantesSeleccionados.length === matriculas.length
  const estudiantesInvalido =
    (tocoEstudiantes || submissionAttempts > 0) &&
    adaptacion.aplicaA === "Estudiantes específicos" &&
    estudiantesSeleccionados.length === 0

  return (
    <li className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Adaptación {index + 1}</h4>
        <SoloEdicion>
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
        </SoloEdicion>
      </div>

      <Field variant="outlined" className="mt-3">
        <FieldLabel>¿Qué tipo de adaptación requiere esta actividad?</FieldLabel>
        <Select
          value={(adaptacion.tipo || "__none__") as never}
          onValueChange={(value) =>
            onChange({
              ...adaptacion,
              tipo: (!value || value === "__none__" ? "" : value) as Adaptacion["tipo"],
            })
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

      {/* Solo "Otro" la exige. */}
      {adaptacion.tipo === "Otro" && (
        <Field variant="outlined" className="mt-4" data-invalid={especificacionTipoInvalida}>
          <FieldLabel>Especifique el tipo de adaptación *</FieldLabel>
          <Input
            maxLength={150}
            placeholder="Describa el tipo de adaptación…"
            value={adaptacion.especificacionTipo}
            onChange={(e) => onChange({ ...adaptacion, especificacionTipo: e.target.value })}
            onBlur={() => setTocoEspecificacionTipo(true)}
            aria-invalid={especificacionTipoInvalida}
            disabled={disabled}
          />
          <CharacterCounter value={adaptacion.especificacionTipo} max={150} />
          {especificacionTipoInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
        </Field>
      )}

      <Field variant="outlined" className="mt-4">
        <FieldLabel>Describa cómo se adapta la actividad para este caso</FieldLabel>
        <Textarea
          rows={3}
          maxLength={500}
          placeholder="Describa la adaptación…"
          value={adaptacion.descripcion}
          onChange={(e) => onChange({ ...adaptacion, descripcion: e.target.value })}
          className={TEXTAREA_OUTLINED}
          disabled={disabled}
        />
        <CharacterCounter value={adaptacion.descripcion} max={500} />
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
              // Al cambiar de modo se limpia el auxiliar.
              versionModificadaRef: "",
              archivoNombre: undefined,
              archivoId: undefined,
              archivos: [],
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

      {adaptacion.versionModificada === "archivo" && (
        <>
          <Field variant="outlined" className="mt-4" data-invalid={Boolean(errorArchivo)}>
            <FieldLabel>Archivos de plantilla (hasta 3) *</FieldLabel>
            {adaptacion.archivos.length > 0 && (
              <ul className="mb-2 flex flex-col gap-1">
                {adaptacion.archivos.map((archivo, archivoIndex) => (
                  <li
                    // Un archivo recién elegido aún no tiene id: cae al `blobUrl`.
                    key={archivo.fkTarchivo ?? archivo.blobUrl}
                    className="flex items-center justify-between gap-2 rounded-sm border px-2 py-1 text-sm"
                  >
                    <span className="truncate">{archivo.nombre}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {archivo.fkTarchivo !== undefined && !archivo.blobUrl && (
                        <VerPlantillaAdaptacion archivoId={archivo.fkTarchivo} />
                      )}
                      <SoloEdicion>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              color="neutral"
                              size="icon-sm"
                              type="button"
                              aria-label={`Quitar ${archivo.nombre}`}
                              disabled={disabled}
                              onClick={() => {
                                if (archivo.blobUrl) URL.revokeObjectURL(archivo.blobUrl)
                                onChange({
                                  ...adaptacion,
                                  archivos: adaptacion.archivos.filter((_, i) => i !== archivoIndex),
                                })
                              }}
                            />
                          }
                        >
                          <RemoveCircleOutlineIcon />
                        </TooltipTrigger>
                        <TooltipContent>{`Quitar ${archivo.nombre}`}</TooltipContent>
                      </Tooltip>
                      </SoloEdicion>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {adaptacion.archivos.length < 3 && (
              <div className="relative">
                <FileUploadOutlinedIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  type="file"
                  // `<input type="file">` no acepta `value` programático. Se valida tipo/tamaño y se limpia
                  // el input tras cada elección para poder repetir archivo y sumar items.
                  accept={ADAPTACION_ARCHIVO_ACCEPT}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (!ADAPTACION_ARCHIVO_MIME_ACCEPT.includes(file.type)) {
                      setErrorArchivo("Formato no permitido. Usá PDF, Word (.doc/.docx), JPG o PNG.")
                      e.target.value = ""
                      return
                    }
                    if (file.size > ADAPTACION_ARCHIVO_MAX_BYTES) {
                      setErrorArchivo("El archivo supera el tamaño máximo permitido (10 MB).")
                      e.target.value = ""
                      return
                    }
                    setErrorArchivo(null)
                    const nuevo: AdaptacionArchivo = { nombre: file.name, blobUrl: URL.createObjectURL(file) }
                    onChange({ ...adaptacion, archivos: [...adaptacion.archivos, nuevo] })
                    e.target.value = ""
                  }}
                  className="pl-9"
                  disabled={disabled}
                />
              </div>
            )}
            {errorArchivo && <FieldError errors={[{ message: errorArchivo }]} />}
            {adaptacion.archivos.length === 0 && !errorArchivo && (
              <FieldDescription>
                Hasta 3 archivos — PDF, Word (.doc/.docx), JPG o PNG, máx. 10 MB cada uno.
              </FieldDescription>
            )}
          </Field>
          <Field variant="outlined" className="mt-4" data-invalid={nombrePlantillaInvalida}>
            <FieldLabel>Nombre de plantilla *</FieldLabel>
            <Input
              maxLength={100}
              placeholder="Nombre con el que se identifica la plantilla…"
              value={adaptacion.nombrePlantilla}
              onChange={(e) => onChange({ ...adaptacion, nombrePlantilla: e.target.value })}
              onBlur={() => setTocoNombrePlantilla(true)}
              aria-invalid={nombrePlantillaInvalida}
              disabled={disabled}
            />
            <CharacterCounter value={adaptacion.nombrePlantilla} max={100} />
            {nombrePlantillaInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
          </Field>
        </>
      )}

      {adaptacion.versionModificada === "enlace" && (
        <>
          <Field variant="outlined" className="mt-4" data-invalid={enlaceInvalido}>
            <FieldLabel>Enlace de la plantilla</FieldLabel>
            <Input
              type="url"
              placeholder="https://…"
              maxLength={500}
              value={adaptacion.versionModificadaRef}
              onChange={(e) =>
                onChange({ ...adaptacion, versionModificadaRef: e.target.value })
              }
              onBlur={() => setTocoEnlace(true)}
              aria-invalid={enlaceInvalido}
              disabled={disabled}
            />
            <CharacterCounter value={adaptacion.versionModificadaRef} max={500} />
            {enlaceInvalido && (
              <FieldError
                errors={[{ message: "Ingresá una URL válida (debe empezar con http:// o https://)." }]}
              />
            )}
          </Field>
          <Field variant="outlined" className="mt-4" data-invalid={nombrePlantillaInvalida}>
            <FieldLabel>Nombre de plantilla *</FieldLabel>
            <Input
              maxLength={100}
              placeholder="Nombre con el que se identifica la plantilla…"
              value={adaptacion.nombrePlantilla}
              onChange={(e) => onChange({ ...adaptacion, nombrePlantilla: e.target.value })}
              onBlur={() => setTocoNombrePlantilla(true)}
              aria-invalid={nombrePlantillaInvalida}
              disabled={disabled}
            />
            <CharacterCounter value={adaptacion.nombrePlantilla} max={100} />
            {nombrePlantillaInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
          </Field>
        </>
      )}

      {adaptacion.versionModificada === "biblioteca" && (
        <Field variant="outlined" className="mt-4">
          <FieldLabel>Seleccionar desde biblioteca institucional</FieldLabel>
          <AdaptacionBibliotecaField
            actividadId={actividadId}
            grupoId={grupoId}
            adaptacion={adaptacion}
            onChange={onChange}
            disabled={disabled}
          />
        </Field>
      )}

      <Field variant="outlined" className="mt-4">
        <FieldLabel>¿A quién se aplica esta adaptación?</FieldLabel>
        <Select
          value={(adaptacion.aplicaA || "__none__") as never}
          onValueChange={(value) => {
            const next = (!value || value === "__none__" ? "" : value) as Adaptacion["aplicaA"]
            onChange({
              ...adaptacion,
              aplicaA: next,
              // Fuera de "Estudiantes específicos" la selección se limpia.
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

      {/* Solo con "Estudiantes específicos"; opciones = estudiantes de la actividad (Regla 47).
      Siempre guarda la lista explícita: "todos" se deriva de la selección. */}
      {adaptacion.aplicaA === "Estudiantes específicos" && (
        <Field variant="outlined" className="mt-4" data-invalid={estudiantesInvalido}>
          <FieldLabel htmlFor={`adaptacion-${index}-estudiantes`}>Estudiantes de la adaptación</FieldLabel>
          <EstudiantesMultiSelect
            id={`adaptacion-${index}-estudiantes`}
            estudiantes={matriculas}
            value={estudiantesSeleccionados}
            allSelected={todosSeleccionados}
            allSelectedLabel="Todos los estudiantes de la actividad"
            onChange={({ matriculaIds, allSelected }) => {
              setTocoEstudiantes(true)
              onChange({
                ...adaptacion,
                estudiantesIds: allSelected ? matriculas.map((m) => m.id) : matriculaIds,
              })
            }}
            onOpenChange={(open) => {
              if (!open) setTocoEstudiantes(true)
            }}
            invalid={estudiantesInvalido}
            disabled={disabled}
            placeholder="La actividad todavía no tiene estudiantes"
          />
          {estudiantesInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
        </Field>
      )}
    </li>
  )
}

/** Seguimiento solo aparece con alguna adaptación registrada. */
function SeguimientoSection({ form, disabled }: { form: FormActividad; disabled: boolean }) {
  // Solo se monta con referente no formativo, por eso `false`.
  const tipoEvidenciaInvalido = useErrorObligatorio(
    form,
    useSelector(form.store, (state) => faltaTipoEvidencia(state.values, false)),
  )
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

              {/* Deshabilitado (no oculto) cuando no genera evidencias. */}
              <form.Field name="tipoEvidencia">
                {(tipoField) => (
                  <Field variant="outlined" data-invalid={tipoEvidenciaInvalido}>
                    <FieldLabel htmlFor={tipoField.name}>Tipo de evidencia{field.state.value ? " *" : ""}</FieldLabel>
                    <Select
                      value={tipoField.state.value}
                      onValueChange={(v) => v && tipoField.handleChange(v)}
                      disabled={!field.state.value || disabled}
                    >
                      <SelectTrigger id={tipoField.name} aria-invalid={tipoEvidenciaInvalido}>
                        <SelectValue />
                      </SelectTrigger>
                      {/* Valores = `nombre` real de `TIPO_EVIDENCIA` en `TLISTA_VALOR`. */}
                      <SelectContent>
                        <SelectItem value="Archivo">Archivo</SelectItem>
                        <SelectItem value="Enlace">Enlace</SelectItem>
                        <SelectItem value="Imagen">Imagen</SelectItem>
                        <SelectItem value="Observación">Observación</SelectItem>
                      </SelectContent>
                    </Select>
                    {tipoEvidenciaInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
                  </Field>
                )}
              </form.Field>
            </>
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

/** Id aleatorio para items nuevos; el PK real lo asigna el backend. */
function cryptoId(): number {
  return Math.floor(Math.random() * 1_000_000_000)
}

/** Botón "+" junto al `Select` de unidad: popover para crear una unidad en el momento. */
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
  /** Clases para encadenarlo con un control adyacente (split-button). */
  className?: string
  /** Rótulo real del instrumento ("Proyecto pedagógico" en Preescolar). */
  instrumentoLabel?: string
  /** Grado/Asignatura de la actividad: la unidad nueva nace con ellos. */
  gradoId: number | undefined
  asignaturaId: number | undefined
  /** `true` mientras la actividad no tenga Grado/Asignatura. */
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
  // Sin "nuevo/nueva": el rótulo varía y no se concuerda el género.
  const crearLabel = `Crear ${instrumentoLabel.toLowerCase()}`

  const {
    enunciados: enunciadosDisponibles,
    nombre: referenteNombre,
    descripcion: referenteDescripcion,
    nivel1Etiqueta,
    isPending: isPendingEnunciados,
  } = useEnunciadosDbaQuery(gradoId, asignaturaId)

  // Una unidad formativa no tiene "Método de cálculo".
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

  // Si falla se avisa acá y el popover queda abierto con lo tipeado.
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
                  // Deshabilitado sin Grado/Asignatura: adentro no se podría guardar nada.
                  disabled={disabled || !hasGradoAsignatura}
                  // `size-11` iguala la altura del `SelectTrigger`; `className` va al final para ganar.
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
        // `gap-0`: título y footer fijos, solo el cuerpo scrollea.
        className="w-96 gap-0 p-0"
      >
        {/* `line-clamp-2`: el rótulo admite 400 caracteres. */}
        <h3 className="line-clamp-2 border-b px-4 py-3 text-base font-semibold" title={crearLabel}>
          {crearLabel}
        </h3>

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
              // Nunca "Enunciados" fijo: en Preescolar el nivel 1 es "Propósito".
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

function formatDiaCorto(value: string): string {
  const [, m, d] = value.split("-")
  return `${d}/${m}`
}
