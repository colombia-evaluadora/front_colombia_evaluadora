import { PencilIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { paths } from "@/config/paths"

import type { AcademicPeriod } from "@/features/establishment/academic-period/api/types/academic-period"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface EditAcademicPeriodButtonProps {
  period: AcademicPeriod
}

export function EditAcademicPeriodButton({ period }: EditAcademicPeriodButtonProps) {
  const { puedeEditar } = useMenuPermission("PERIODOS_ACADEMICOS")
  if (!puedeEditar) return null

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            render={<Link to={paths.app.periodosAcademicosEditar.getHref(period.id)} />}
            nativeButton={false}
          />
        }
      >
        <span className="sr-only">Editar periodo</span>
        <PencilIcon />
      </TooltipTrigger>
      <TooltipContent>Editar periodo</TooltipContent>
    </Tooltip>
  )
}
