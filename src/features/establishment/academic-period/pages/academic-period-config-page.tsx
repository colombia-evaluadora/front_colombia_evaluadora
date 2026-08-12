import { useState } from "react"
import { SpinnerIcon } from "@/components/ui/icons"
import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { paths } from "@/config/paths"

import { useCreateAcademicPeriod } from "../api/mutations/academic-period/create-academic-period"
import { useUpdateAcademicPeriod } from "../api/mutations/academic-period/update-academic-period"
import { useAcademicPeriodQuery } from "../api/query/academic-period/use-academic-period-query"
import type {
  AcademicPeriodFormInput,
  AcademicPeriodFormValues,
} from "../api/schema"
import type { AcademicPeriodDetail } from "../api/types/academic-period"
import { AcademicPeriodForm } from "../components/academic-period/form-academic-period"
import { EvaluationPeriodsSection } from "../components/academic-period/evaluation-periods-section"
import {
  NoticeOutlet,
  NoticeProvider,
  useNotify,
} from "../components/common/notice-context"
import {
  DEFAULT_JORNADA,
  type Jornada,
} from "../components/schedule/schedule-data"

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
    statusId: detail.statusId ?? 0,
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
  const numericPeriodId = periodId ? Number(periodId) : undefined

  const [saved, setSaved] = useState(false)
  const [createdPeriodId, setCreatedPeriodId] = useState<number | null>(null)
  const [jornada, setJornada] = useState<Jornada>(DEFAULT_JORNADA)
  const [configOpen, setConfigOpen] = useState(true)

  const {
    data: detail,
    isPending: isLoadingDetail,
    isError: isDetailError,
  } = useAcademicPeriodQuery(numericPeriodId)

  const createPeriod = useCreateAcademicPeriod({
    mutationConfig: {
      onSuccess: (created) => {
        setCreatedPeriodId(created.id)
        setSaved(true)
        notify("Periodo académico creado. Ahora podés configurar el resto.")
        // Tras crear, pasamos a la ruta de edición del nuevo periodo para que
        // la URL refleje el estado real (editable, recargable, compartible).
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
        notify(result.message)
      },
    },
  })

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

  const header = (
    <CardHeader className="border-b">
      <CardAction className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          color="primary"
          form={FORM_ID}
          disabled={isSaving || (isEditing && isLoadingDetail)}
          aria-busy={isSaving}
        >
          {isSaving && (
            <SpinnerIcon data-icon="inline-start" className="animate-spin" />
          )}
          Guardar
        </Button>
        <Button
          size="sm"
          variant="outline"
          render={<Link to={paths.app.periodosAcademicos.getHref()} />}
          nativeButton={false}
        >
          Cerrar
        </Button>
      </CardAction>
      <CardTitle>
        {isEditing ? "Editar periodo académico" : "Agregar periodo académico"}
      </CardTitle>
    </CardHeader>
  )

  const configBody = (
    <Accordion
      value={configOpen ? ["config"] : []}
      onValueChange={(value) => setConfigOpen(value.includes("config"))}
    >
      <AccordionItem value="config" className="rounded-md border border-border">
        <AccordionTrigger className="px-4 py-3">
          <span className="font-heading text-sm font-semibold tracking-wider uppercase">
            Configuración del periodo
          </span>
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
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
  return (
    <div className="flex flex-col gap-6">
      <Card>
        {header}
        <CardContent className="flex flex-col gap-6">
          <NoticeOutlet />
          {configBody}
          {showSecondForm && (
            <Card>
              <CardContent>
                <EvaluationPeriodsSection
                  academicPeriodId={academicPeriodId}
                  jornada={saved || !detail ? jornada : toJornada(detail)}
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
