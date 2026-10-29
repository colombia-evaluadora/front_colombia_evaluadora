import { EyeIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { paths } from "@/config/paths"

import type { AcademicPeriod } from "@/features/establishment/academic-period/api/types/academic-period"

// "Ver detalle" (Sección 7.4): el período y sus pestañas en solo lectura.
export function ViewAcademicPeriodButton({ period }: { period: AcademicPeriod }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            render={<Link to={paths.app.periodosAcademicosVer.getHref(period.id)} search={(prev) => prev} />}
            nativeButton={false}
          />
        }
      >
        <span className="sr-only">Ver periodo</span>
        <EyeIcon />
      </TooltipTrigger>
      <TooltipContent>Ver periodo</TooltipContent>
    </Tooltip>
  )
}
