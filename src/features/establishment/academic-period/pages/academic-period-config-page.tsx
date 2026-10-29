import { useEffect, useRef, useState } from "react"
import { toPeriodTitle } from "@/features/establishment/academic-period/utils/period-title"
import { toJornadaBreaks } from "@/features/establishment/academic-period/utils/recesos"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import {
  ArrowLeftIcon,
  CaretDownIcon,
  CaretRightIcon,
  FloppyDiskIcon,
  PrinterIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { PeriodStateAction } from "@/features/establishment/academic-period/components/period-state-action"
import { PeriodReadOnlyProvider } from "@/features/establishment/academic-period/utils/period-read-only"
import { formatCalendarRange } from "@/features/establishment/academic-period/utils/academic-calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ACADEMIC_PERIOD_STATUS_BADGE } from "@/features/establishment/academic-period/api/ui-mappings"
import { PeriodStatusStepper } from "@/features/establishment/academic-period/components/period-status-stepper"
import { GeneratePeriodDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-generate-period"
import type { GenerateKind } from "@/features/establishment/academic-period/api/query/use-period-generate-data"
import { Badge } from "@/components/ui/badge"
import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { getErrorMessage, isNotFoundError } from "@/lib/api-client"

import { Button } from "@/components/ui/button"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { paths } from "@/config/paths"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useCreateAcademicPeriod } from "@/features/establishment/academic-period/api/mutations/create-academic-period"
import { useUpdateAcademicPeriod } from "@/features/establishment/academic-period/api/mutations/update-academic-period"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"
import {
  useAcademicPeriodStatusesQuery,
  useJornadasQuery,
} from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import {
  type AcademicPeriodFormInput,
  type AcademicPeriodFormValues,
} from "@/features/establishment/academic-period/api/schema"
import type { AcademicPeriodDetail } from "@/features/establishment/academic-period/api/types/academic-period"
import { AcademicPeriodForm } from "@/features/establishment/academic-period/components/forms/form-academic-period"
import { EvaluationPeriodsSection } from "@/features/establishment/academic-period/components/tabs/evaluation-periods-section"
import type { EvaluationCriteriaHandle } from "@/features/establishment/academic-period/components/tabs/tab-evaluation-criteria"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import {
  DEFAULT_JORNADA,
  type Jornada,
} from "@/features/establishment/academic-period/utils/schedule-data"

const FORM_ID = "academic-period-config-form"

function toFormValues(detail: AcademicPeriodDetail): Partial<AcademicPeriodFormInput> {
  return {
    startDate: detail.startDate,
    endDate: detail.endDate,
    enrollmentDeadline: detail.enrollmentDeadline,
    sedeId: detail.sedeId,
    previousPeriodId: detail.previousPeriodId,
    statusId: detail.statusId ?? 0,
    jornadaId: detail.config.jornadaId,
    reservationEnabled: detail.config.reservationEnabled,
    defaultBlocksCount: detail.config.defaultBlocksCount,
    scheduleStartTime: detail.config.scheduleStartTime ?? "",
    scheduleEndTime: detail.config.scheduleEndTime ?? "",
    breaks: detail.config.breaks,
    enrollmentModality: detail.config.enrollmentModality,
    cycle: detail.config.cycle,
  }
}

// Estados automaticos del periodo (Regla 15), en el orden en que ocurren.
const STATUS_STEPS = ["Inscripciones", "Abierto", "Cerrado"]
const STATUS_STEP_INDEX: Partial<Record<string, number>> = { I: 0, A: 1, C: 2 }

function toJornada(detail: AcademicPeriodDetail): Jornada {
  return {
    startTime: detail.config.scheduleStartTime ?? "",
    endTime: detail.config.scheduleEndTime ?? "",
    blocksCount: detail.config.defaultBlocksCount,
    breaks: toJornadaBreaks(
      detail.config.scheduleStartTime ?? "",
      detail.config.scheduleEndTime ?? "",
      detail.config.defaultBlocksCount,
      detail.config.breaks,
    ),
  }
}

export function AcademicPeriodConfigPage({ viewOnly = false }: { viewOnly?: boolean }) {
  return (
    <NoticeProvider>
      <AcademicPeriodConfigPageContent viewOnly={viewOnly} />
    </NoticeProvider>
  )
}

// "Ver" desde la tabla: la misma pantalla en solo lectura.
export function AcademicPeriodViewPage() {
  return <AcademicPeriodConfigPage viewOnly />
}

function AcademicPeriodConfigPageContent({ viewOnly }: { viewOnly: boolean }) {
  const { notify } = useNotify()
  const navigate = useNavigate()
  const { periodId } = useParams({ strict: false }) as { periodId?: string }
  const isEditing = periodId != null
  // Sin Guardar, entrar por URL a agregar vuelve a la lista.
  const { puedeCrear, isLoading: permisoCargando } = useMenuPermission("PERIODOS_ACADEMICOS")
  useEffect(() => {
    if (!isEditing && !permisoCargando && !puedeCrear) {
      navigate({ to: paths.app.periodosAcademicos.getHref(), replace: true })
    }
  }, [isEditing, permisoCargando, puedeCrear, navigate])
  const parsedPeriodId = periodId ? Number(periodId) : undefined
  const isValidPeriodId = parsedPeriodId != null && Number.isInteger(parsedPeriodId)
  const numericPeriodId = isValidPeriodId ? parsedPeriodId : undefined

  const [saved, setSaved] = useState(false)
  const [createdPeriodId, setCreatedPeriodId] = useState<number | null>(null)
  const [jornada, setJornada] = useState<Jornada>(DEFAULT_JORNADA)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)
  const [savedToken, setSavedToken] = useState(0)
  // Criterios de evaluación: el Guardar de arriba también guarda esa pestaña.
  const criteriaRef = useRef<EvaluationCriteriaHandle>(null)
  const [isCriteriaDirty, setIsCriteriaDirty] = useState(false)
  const [isSavingCriteria, setIsSavingCriteria] = useState(false)
  // "Generar › Planes de estudio / Horarios" (Sección 5.7).
  const [generateKind, setGenerateKind] = useState<GenerateKind | null>(null)

  const {
    data: detail,
    isPending: isLoadingDetail,
    isError: isDetailError,
    error: detailError,
  } = useAcademicPeriodQuery(numericPeriodId)

  useSedeOptionsQuery()
  const { data: jornadas = [] } = useJornadasQuery()
  useAcademicPeriodStatusesQuery()

  const createPeriod = useCreateAcademicPeriod({
    mutationConfig: {
      onSuccess: (created) => {
        setCreatedPeriodId(created.id)
        setSaved(true)
        notify(SUCCESS_MESSAGES.academicPeriod.created)
        navigate({
          to: paths.app.periodosAcademicosEditar.getHref(created.id),
          search: (prev) => prev,
        })
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  const updatePeriod = useUpdateAcademicPeriod({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        setSavedToken((token) => token + 1)
        notify(SUCCESS_MESSAGES.academicPeriod.updated)
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  const detailJornada = detail ? toJornada(detail) : undefined

  if (isEditing && (!isValidPeriodId || isNotFoundError(detailError))) {
    return <NotFoundPage />
  }

  const academicPeriodId = isEditing ? numericPeriodId : (createdPeriodId ?? undefined)

  function handleSubmit(values: AcademicPeriodFormValues) {
    setJornada({
      startTime: values.scheduleStartTime,
      endTime: values.scheduleEndTime,
      blocksCount: values.defaultBlocksCount,
      breaks: toJornadaBreaks(
        values.scheduleStartTime,
        values.scheduleEndTime,
        values.defaultBlocksCount,
        values.breaks,
      ),
    })
    if (academicPeriodId != null) {
      updatePeriod.mutate({ id: academicPeriodId, values })
    } else {
      createPeriod.mutate(values)
    }
  }

  const isSaving = createPeriod.isPending || updatePeriod.isPending || isSavingCriteria

  // Envía el formulario del período solo si cambió (al agregar siempre) y, si
  // hay cambios en Criterios de evaluación, los guarda también.
  async function handleHeaderSave() {
    if (!isEditing || isFormDirty) {
      const periodForm = document.getElementById(FORM_ID)
      if (periodForm instanceof HTMLFormElement) periodForm.requestSubmit()
    }
    if (isCriteriaDirty && criteriaRef.current) {
      setIsSavingCriteria(true)
      try {
        await criteriaRef.current.save(notify)
      } finally {
        setIsSavingCriteria(false)
      }
    }
  }
  const showTabs = saved || (isEditing && !!detail)
  // Regla 16: Cerrado (o "Ver") deja el período y todas sus pestañas en solo lectura.
  const readOnlyReason = viewOnly ? "ver" : detail?.status === "C" ? "cerrado" : null
  const readOnly = readOnlyReason != null
  const stepIndex = detail ? STATUS_STEP_INDEX[detail.status] : undefined
  const title = detail
    ? toPeriodTitle(detail, jornadas.find((j) => j.id === detail.config.jornadaId)?.name)
    : isEditing
      ? "Editar período académico"
      : "Agregar período académico"

  const generalBody =
    isEditing && isLoadingDetail ? (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <SpinnerIcon data-icon="inline-start" className="animate-spin" />
        Cargando período…
      </div>
    ) : isEditing && isDetailError ? (
      <p className="py-10 text-center text-red">{getErrorMessage(detailError)}</p>
    ) : (
      <AcademicPeriodForm
        id={FORM_ID}
        defaultValues={detail ? toFormValues(detail) : undefined}
        onSubmit={handleSubmit}
        onDirtyChange={setIsFormDirty}
        onValidChange={setIsFormValid}
        savedToken={savedToken}
        currentPeriodId={numericPeriodId}
        readOnly={readOnly}
        lockEndDate={!!detail?.reopenedUntil}
      />
    )

  return (
    <TableScreen>
      <TableScreenHeader>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-table-screen-title px-(--screen-spacing) py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <nav aria-label="Ruta">
              <Link
                to={paths.app.periodosAcademicos.getHref()}
                search={(prev) => prev}
                className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground focus-visible:underline focus-visible:outline-none"
              >
                Períodos académicos
                <CaretRightIcon className="size-4" aria-hidden />
              </Link>
            </nav>
            <h1 className="font-heading truncate text-2xl font-bold">{title}</h1>
            {detail && (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <Badge
                  {...ACADEMIC_PERIOD_STATUS_BADGE[detail.status]}
                  className="border border-current/30"
                >
                  <span aria-hidden className="size-1.5 rounded-full bg-current" />
                  {detail.statusName}
                </Badge>
                <span className="text-muted-foreground">
                  {detail.reopenedUntil
                    ? `Reabierto: vuelve a Cerrado el ${formatCalendarRange(detail.reopenedUntil, detail.reopenedUntil)}.`
                    : "El estado cambia solo, con las fechas."}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {detail && academicPeriodId != null && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button size="sm" variant="outline" color="neutral" />}
                >
                  <PrinterIcon data-icon="inline-start" />
                  Generar
                  <CaretDownIcon data-icon="inline-end" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  <DropdownMenuItem onClick={() => setGenerateKind("planes")}>
                    Planes de estudio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGenerateKind("horarios")}>
                    Horarios
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              size="sm"
              variant="outline"
              color="neutral"
              render={<Link to={paths.app.periodosAcademicos.getHref()} search={(prev) => prev} />}
              nativeButton={false}
            >
              {readOnly ? (
                <ArrowLeftIcon data-icon="inline-start" />
              ) : (
                <XIcon data-icon="inline-start" />
              )}
              {readOnly ? "Volver" : "Cancelar"}
            </Button>
            {detail && academicPeriodId != null && (
              <PeriodStateAction
                variant="button"
                periodId={academicPeriodId}
                periodTitle={title}
                status={detail.status}
                reopenedUntil={detail.reopenedUntil}
              />
            )}
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                variant="fill"
                color="primary"
                onClick={handleHeaderSave}
                // Al editar, con cambios en el período o en Criterios de evaluación;
                // al agregar, cuando el formulario está completo.
                disabled={isSaving || (isEditing ? !isFormDirty && !isCriteriaDirty : !isFormValid)}
                aria-busy={isSaving}
              >
                {isSaving ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                {isSaving ? "Guardando…" : "Guardar"}
              </Button>
            )}
          </div>
        </div>
        {stepIndex != null && (
          <div className="border-b border-border px-(--screen-spacing) py-3">
            <PeriodStatusStepper steps={STATUS_STEPS} currentStep={stepIndex} />
          </div>
        )}
      </TableScreenHeader>
      <TableScreenBody>
        <NoticeOutlet className="mb-4" />
        <PeriodReadOnlyProvider reason={readOnlyReason}>
          <EvaluationPeriodsSection
            academicPeriodId={showTabs ? academicPeriodId : undefined}
            jornada={saved || !detailJornada ? jornada : detailJornada}
            general={generalBody}
            criteriaRef={criteriaRef}
            onCriteriaDirtyChange={setIsCriteriaDirty}
          />
        </PeriodReadOnlyProvider>
      </TableScreenBody>
      {detail && academicPeriodId != null && generateKind && (
        <GeneratePeriodDialog
          kind={generateKind}
          open
          onOpenChange={(open) => !open && setGenerateKind(null)}
          academicPeriodId={academicPeriodId}
          periodTitle={title}
        />
      )}
    </TableScreen>
  )
}
