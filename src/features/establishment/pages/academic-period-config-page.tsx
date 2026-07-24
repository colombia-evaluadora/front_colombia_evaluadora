import { useState } from "react"
import { SpinnerIcon } from "@phosphor-icons/react"
import { Link, useNavigate } from "@tanstack/react-router"

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
import type { AcademicPeriodFormValues } from "../api/schema"
import { AcademicPeriodForm } from "../components/academic-period/form-academic-period"
import { EvaluationPeriodsSection } from "../components/academic-period/evaluation-periods-section"
import {
  DEFAULT_JORNADA,
  type Jornada,
} from "../components/academic-period/schedule/schedule-data"

const FORM_ID = "academic-period-config-form"

export function AcademicPeriodConfigPage() {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  // La jornada guardada alimenta la grilla del horario (tab Grados).
  const [jornada, setJornada] = useState<Jornada>(DEFAULT_JORNADA)

  const createPeriod = useCreateAcademicPeriod({
    mutationConfig: {
      onSuccess: () => {
        setSaved(true)
        setShowBanner(true)
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
    createPeriod.mutate(values)
  }

  return (
    <Card>
      <CardHeader>
        <CardAction className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            color="primary"
            form={FORM_ID}
            disabled={createPeriod.isPending}
            aria-busy={createPeriod.isPending}
          >
            {createPeriod.isPending && (
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
        <CardTitle>Agregar periodo académico</CardTitle>
        <CardDescription>
          Configurá la jornada, los horarios y los recesos del periodo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">

        <AcademicPeriodForm id={FORM_ID} onSubmit={handleSubmit} />

        {saved && <EvaluationPeriodsSection jornada={jornada} />}
      </CardContent>
    </Card>
  )
}
