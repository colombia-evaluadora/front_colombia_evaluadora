import { PencilIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"

import type { AcademicPeriod } from "@/features/establishment/academic-period/api/types/academic-period"

interface EditAcademicPeriodButtonProps {
  period: AcademicPeriod
}

export function EditAcademicPeriodButton({ period }: EditAcademicPeriodButtonProps) {
  return (
    <Button
      variant="ghost"
      color="neutral"
      size="icon-sm"
      render={<Link to={paths.app.periodosAcademicosEditar.getHref(period.id)} />}
      nativeButton={false}
    >
      <span className="sr-only">Editar periodo</span>
      <PencilIcon />
    </Button>
  )
}
