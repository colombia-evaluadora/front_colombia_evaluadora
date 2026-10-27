import { useEffect, useRef, useState } from "react"
import { deArticuloRotulo } from "@/features/planeador/lib/rotulo-gramatica"
import { useForm, useSelector } from "@tanstack/react-form"
import { Card } from "@/components/ui/card"
import { resolveInstrumentoLabel, useUnidadesTabsQuery } from "@/features/planeador/api/query/use-unidades-tabs-query"
import { UNIDAD_TAB_FALLBACK } from "@/features/planeador/components/planeador-tabs"
import { useNotify } from "@/components/notice/notice-context"
import type { ActividadTab } from "@/features/planeador/api/query/use-actividades-tabs-query"
import { useActividadMatriculasGrupoQuery } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import {
  useStudyPlanSubjectLabel,
} from "@/features/establishment/academic-period/api/query/use-study-plan-subject-label"
import { useTipoActividadCatalogQuery } from "@/features/planeador/api/query/catalogos-lista-valor"
import { useAsistenteActividad } from "@/features/planeador/hooks/use-asistente-actividad"
import {
  useInstrumentoEvaluacionCatalogQuery,
  instrumentoPermitidoLabel,
} from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { MetodoCalculo, UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useCreateUnidad } from "@/features/planeador/api/mutations/create-unidad"
import { consumeActividadFormDraft, type ActividadFormDraftKey } from "@/features/planeador/lib/actividad-form-draft"
import {
  avisoCamposObligatorios,
  camposObligatoriosFaltantes,
} from "@/features/planeador/lib/campos-obligatorios-faltantes"
import { faltantesInstrumento } from "@/features/planeador/lib/instrumento-faltantes"
import { precargarPredeterminado, scrollToFirstInvalidField } from "@/features/planeador/components/forms/form-editar-actividad/helpers"
import { usePredeterminadoQuery } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import {
  useHasGradoAsignatura,
  useRecuperacionBloqueaCampos,
  useRecuperacionAutoFill,
  useCamposEvaluacionEfectivos,
} from "@/features/planeador/components/forms/form-editar-actividad/hooks"
import { SoloLecturaActividadContext } from "@/features/planeador/components/forms/form-editar-actividad/context"
import { RecuperacionSection } from "@/features/planeador/components/forms/form-editar-actividad/recuperacion-section"
import {
  IdentificacionSection,
} from "@/features/planeador/components/forms/form-editar-actividad/identificacion-section"
import {
  UnidadAsociadaSection,
  UnidadSection,
} from "@/features/planeador/components/forms/form-editar-actividad/unidad-section"
import {
  AsignaturaGradoSection,
} from "@/features/planeador/components/forms/form-editar-actividad/asignatura-grado-section"
import {
  MaterialesSection,
  RecursosSection,
} from "@/features/planeador/components/forms/form-editar-actividad/recursos-section"
import { ProgramacionSection } from "@/features/planeador/components/forms/form-editar-actividad/programacion-section"
import { EvaluacionSection } from "@/features/planeador/components/forms/form-editar-actividad/evaluacion-section"
import { SeguimientoFormativoSection } from "@/features/planeador/components/forms/form-editar-actividad/seguimiento-formativo-section"
import {
  AdaptacionesSection,
  SeguimientoSection,
} from "@/features/planeador/components/forms/form-editar-actividad/adaptaciones-section"

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
  /**
   * Por qué está en solo lectura (Regla 37 o permisos): el asistente lo
   * devuelve si le piden rellenar este formulario.
   */
  motivoSoloLectura?: string
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
  motivoSoloLectura,
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

  // Solo en el alta y sin borrador: el borrador ya trae lo que eligió el usuario
  const precargar = esNueva && !draftInicial && !readOnly
  const { data: tipoPredeterminado } = usePredeterminadoQuery("TIPO_ACTIVIDAD")
  useEffect(() => {
    if (!precargar || !tipoPredeterminado || form.state.values.tipo) return
    precargarPredeterminado(form, "tipo", tipoPredeterminado.nombre as Actividad["tipo"])
  }, [precargar, tipoPredeterminado, form])

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
    motivoSoloLectura,
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
        <h3 className="text-base font-semibold">Identificación y Estructura de Datos {deArticuloRotulo(rotuloUnidad)} {rotuloUnidad}</h3>
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
        precargar={precargar}
        tipoEvaluacion={tipoEvaluacion}
        disabled={disabled}
      />
      {/* Bloque 5 alternativo: referente formativo (preescolar) sin instrumento ni nota. */}
      {esFormativa && <SeguimientoFormativoSection />}
      {/* Adaptaciones siempre visible (Regla 49): el Decreto 1421/PIAR exige documentar ajustes
      razonables también en referentes formativos. */}
      <AdaptacionesSection form={form} matriculas={matriculas} disabled={disabled} actividadId={actividad.id} />
      {!esFormativa && <SeguimientoSection form={form} disabled={disabled} />}
    </form>
    </SoloLecturaActividadContext.Provider>
  )
}
