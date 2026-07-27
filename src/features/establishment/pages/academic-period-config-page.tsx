import { useState } from "react"
import { SpinnerIcon } from "@phosphor-icons/react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { paths } from "@/config/paths"

import { useCreateAcademicPeriod } from "../api/mutations/create-academic-period"
import { useUpdateAcademicPeriod } from "../api/mutations/update-academic-period"
import { useAcademicPeriodQuery } from "../api/query/use-academic-period-query"
import type {
  AcademicPeriodFormInput,
  AcademicPeriodFormValues,
} from "../api/schema"
import type { AcademicPeriodDetail } from "../api/types/academic-period/academic-period"
import { AcademicPeriodForm } from "../components/academic-period/form-academic-period"
import { EvaluationPeriodsSection } from "../components/academic-period/evaluation-periods-section"
import {
  DEFAULT_JORNADA,
  type Jornada,
} from "../components/academic-period/schedule/schedule-data"

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
  const navigate = useNavigate()
  const { periodId } = useParams({ strict: false }) as { periodId?: string }
  const isEditing = periodId != null
  const numericPeriodId = periodId ? Number(periodId) : undefined

  const [saved, setSaved] = useState(false)
  const [createdPeriodId, setCreatedPeriodId] = useState<number | null>(null)
  const [jornada, setJornada] = useState<Jornada>(DEFAULT_JORNADA)

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
      },
    },
  })

  const updatePeriod = useUpdateAcademicPeriod({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        navigate({ to: paths.app.periodosAcademicos.getHref() })
      },
    },
  })

  function handleSubmit(values: AcademicPeriodFormValues) {
    setJornada({
      startTime: values.scheduleStartTime,
      endTime: values.scheduleEndTime,
      blocksCount: values.defaultBlocksCount,
      breaks: values.breaks,
    })
    if (isEditing && numericPeriodId != null) {
      updatePeriod.mutate({ id: numericPeriodId, values })
    } else {
      createPeriod.mutate(values)
    }
  }

  const isSaving = isEditing ? updatePeriod.isPending : createPeriod.isPending
  const academicPeriodId = isEditing ? numericPeriodId : createdPeriodId ?? undefined

  return (
    <Card>
      <CardHeader>
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
            render={<Link to={paths.app.periodosAcademicos.getHref()} />}
            nativeButton={false}
          >
            Cerrar
          </Button>
        </CardAction>
        <CardTitle>
          {isEditing ? "Editar periodo académico" : "Agregar periodo académico"}
        </CardTitle>
        <CardDescription>
          Configurá la jornada, los horarios y los recesos del periodo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
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
        {(saved || (isEditing && !!detail)) && (
          <EvaluationPeriodsSection
            academicPeriodId={academicPeriodId}
            jornada={saved || !detail ? jornada : toJornada(detail)}
          />
        )}
      </CardContent>
    </Card>
  )
}
