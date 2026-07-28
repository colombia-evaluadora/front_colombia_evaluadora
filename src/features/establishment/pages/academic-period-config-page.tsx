import { useState } from "react"
import { CaretDownIcon, SpinnerIcon } from "@/components/ui/icons"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  // Primera parte (configuración del periodo) colapsable para dar más espacio
  // a la segunda parte (periodos de evaluación, grados, asignación, etc.).
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
    <div className="flex flex-col gap-6">
      {/* Cuadro 1: configuración del periodo (colapsable). */}
      <Card>
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
        <CardContent>
          <Collapsible
            open={configOpen}
            onOpenChange={setConfigOpen}
            className="flex flex-col gap-4"
          >
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                />
              }
            >
              <span className="flex flex-col gap-0.5">
                <span className="font-heading text-sm font-semibold tracking-wider uppercase">
                  Configuración del periodo
                </span>
              </span>
              <CaretDownIcon
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform",
                  configOpen && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent keepMounted>
              {isEditing && isLoadingDetail ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <SpinnerIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
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
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Cuadro 2: periodos de evaluación y configuración del grado. */}
      {(saved || (isEditing && !!detail)) && (
        <Card>
          <CardContent>
            <EvaluationPeriodsSection
              academicPeriodId={academicPeriodId}
              jornada={saved || !detail ? jornada : toJornada(detail)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
