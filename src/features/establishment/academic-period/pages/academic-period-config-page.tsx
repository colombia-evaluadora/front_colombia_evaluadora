import { useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { CheckIcon, SpinnerIcon } from "@/components/ui/icons"
import { Link, notFound, useNavigate, useParams } from "@tanstack/react-router"

import { isNotFoundError } from "@/lib/api-client"

import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { paths } from "@/config/paths"

import { useCreateAcademicPeriod } from "@/features/establishment/academic-period/api/mutations/create-academic-period"
import { useUpdateAcademicPeriod } from "@/features/establishment/academic-period/api/mutations/update-academic-period"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import type {
  AcademicPeriodFormInput,
  AcademicPeriodFormValues,
} from "@/features/establishment/academic-period/api/schema"
import type { AcademicPeriodDetail } from "@/features/establishment/academic-period/api/types/academic-period"
import { AcademicPeriodForm } from "@/features/establishment/academic-period/components/forms/form-academic-period"
import { EvaluationPeriodsSection } from "@/features/establishment/academic-period/components/evaluation-periods-section"
import {
  NoticeOutlet,
  NoticeProvider,
  useNotify,
} from "@/components/notice/notice-context"
import {
  DEFAULT_JORNADA,
  type Jornada,
} from "@/features/establishment/academic-period/components/schedule-data"

const FORM_ID = "academic-period-config-form"

function toFormValues(
  detail: AcademicPeriodDetail
): Partial<AcademicPeriodFormInput> {
  return {
    startDate: detail.startDate,
    endDate: detail.endDate,
    enrollmentDeadline: detail.enrollmentDeadline,
    sedeId: detail.sedeId,
    previousPeriodId: detail.previousPeriodId,
    status: detail.status,
    jornadaId: detail.config.jornadaId,
    reservationEnabled: detail.config.reservationEnabled,
    defaultBlocksCount: detail.config.defaultBlocksCount,
    scheduleStartTime: detail.config.scheduleStartTime ?? "",
    scheduleEndTime: detail.config.scheduleEndTime ?? "",
    breaks: detail.config.breaks,
  }
}

function toJornada(detail: AcademicPeriodDetail): Jornada {
  return {
    startTime: detail.config.scheduleStartTime ?? "",
    endTime: detail.config.scheduleEndTime ?? "",
    blocksCount: detail.config.defaultBlocksCount,
    breaks: detail.config.breaks,
  }
}

export function AcademicPeriodConfigPage() {
  return (
    <NoticeProvider>
      <AcademicPeriodConfigPageContent />
    </NoticeProvider>
  )
}

function AcademicPeriodConfigPageContent() {
  const { notify } = useNotify()
  const navigate = useNavigate()
  const { periodId } = useParams({ strict: false }) as { periodId?: string }
  const isEditing = periodId != null
  const parsedPeriodId = periodId ? Number(periodId) : undefined
  const isValidPeriodId =
    parsedPeriodId != null && Number.isInteger(parsedPeriodId)
  const numericPeriodId = isValidPeriodId ? parsedPeriodId : undefined

  const [saved, setSaved] = useState(false)
  const [createdPeriodId, setCreatedPeriodId] = useState<number | null>(null)
  const [jornada, setJornada] = useState<Jornada>(DEFAULT_JORNADA)
  const [configOpen, setConfigOpen] = useState(true)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [savedToken, setSavedToken] = useState(0)

  const {
    data: detail,
    isPending: isLoadingDetail,
    isError: isDetailError,
    error: detailError,
  } = useAcademicPeriodQuery(numericPeriodId)

  const createPeriod = useCreateAcademicPeriod({
    mutationConfig: {
      onSuccess: (created) => {
        setCreatedPeriodId(created.id)
        setSaved(true)
        notify(SUCCESS_MESSAGES.academicPeriod.created)
        navigate({
          to: paths.app.periodosAcademicosEditar.getHref(created.id),
        })
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
    },
  })

  if (isEditing && (!isValidPeriodId || isNotFoundError(detailError))) {
    throw notFound()
  }

  const academicPeriodId = isEditing ? numericPeriodId : createdPeriodId ?? undefined

  function handleSubmit(values: AcademicPeriodFormValues) {
    setJornada({
      startTime: values.scheduleStartTime,
      endTime: values.scheduleEndTime,
      blocksCount: values.defaultBlocksCount,
      breaks: values.breaks,
    })
    if (academicPeriodId != null) {
      updatePeriod.mutate({ id: academicPeriodId, values })
    } else {
      createPeriod.mutate(values)
    }
  }

  const isSaving = createPeriod.isPending || updatePeriod.isPending

  const showSecondForm = saved || (isEditing && !!detail)

  const showSaveAction = !isEditing || isFormDirty || isSaving

  const configBody = (
    <Accordion
      value={configOpen ? ["config"] : []}
      onValueChange={(value) => setConfigOpen(value.includes("config"))}
    >
      <AccordionItem value="config" className="rounded-md border border-border">
        <AccordionTrigger className="items-center gap-3 px-4 py-2.5 text-lg **:data-[slot=accordion-trigger-icon]:size-5">
          Información general del periodo
        </AccordionTrigger>
        <AccordionContent keepMounted className="px-4 pb-4">
          {isEditing && isLoadingDetail ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              Cargando periodo…
            </div>
          ) : isEditing && isDetailError ? (
            <p className="py-10 text-center text-destructive">
              Ocurrió un error al cargar el periodo académico.
            </p>
          ) : (
            <AcademicPeriodForm
              id={FORM_ID}
              defaultValues={detail ? toFormValues(detail) : undefined}
              onSubmit={handleSubmit}
              onDirtyChange={setIsFormDirty}
              savedToken={savedToken}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button
              size="sm"
              variant="fill"
              color="neutral"
              render={<Link to={paths.app.periodosAcademicos.getHref()} />}
              nativeButton={false}
            >
              Cerrar
            </Button>
          }
        >
          {isEditing ? "Editar periodo académico" : "Agregar periodo académico"}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>
      <TableScreenBody className="rounded-b-none border-b-0">
        {configBody}
        {showSecondForm && (
          <div className="mt-6">
            <EvaluationPeriodsSection
              academicPeriodId={academicPeriodId}
              jornada={saved || !detail ? jornada : toJornada(detail)}
            />
          </div>
        )}
      </TableScreenBody>

      {showSaveAction && (
        <TableScreenFooter>
          <p className="text-sm text-muted-foreground">
            Complete la información antes de guardar.
          </p>
          <Button
            type="submit"
            size="sm"
            variant="fill"
            color="primary"
            form={FORM_ID}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </TableScreenFooter>
      )}
    </TableScreen>
  )
}
