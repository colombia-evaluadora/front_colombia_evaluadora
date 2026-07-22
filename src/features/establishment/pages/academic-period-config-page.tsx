import { ArrowLeftIcon } from "@phosphor-icons/react"
import { Link, useNavigate } from "@tanstack/react-router"
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

import type { AcademicPeriodFormValues } from "../api/schema"
import { AcademicPeriodForm } from "../components/academic-period/form-academic-period"

const FORM_ID = "academic-period-config-form"

export function AcademicPeriodConfigPage() {
  const navigate = useNavigate()

  function handleSubmit(values: AcademicPeriodFormValues) {
    console.log("AcademicPeriodConfig", values)
    toast.success("Configuración guardada.")
    navigate({ to: paths.app.periodosAcademicos.getHref() })
  }

  return (
    <Card>
      <CardHeader>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            render={<Link to={paths.app.periodosAcademicos.getHref()} />}
            nativeButton={false}
          >
            <ArrowLeftIcon weight="bold" className="size-4" />
            Volver
          </Button>
        </CardAction>
        <CardTitle>Agregar periodo académico</CardTitle>
        <CardDescription>
          Configurá la jornada, los horarios y los recesos del periodo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcademicPeriodForm id={FORM_ID} onSubmit={handleSubmit} />
      </CardContent>
    </Card>
  )
}
