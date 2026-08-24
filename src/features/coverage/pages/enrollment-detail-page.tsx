"use no memo"

import { ArrowLeftIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Link } from "@tanstack/react-router"

import { paths } from "@/config/paths"

export function EnrollmentDetailPage() {
  return (
    <TableScreen>
      <TableScreenHeader>
        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            color="neutral"
            size="sm"
            className="w-fit"
            render={
              <Link to={paths.app.coberturaInscritos.getHref()} />
            }
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Volver a Inscripciones
          </Button>
          <TableScreenTitle>Detalle de inscripción</TableScreenTitle>
        </div>
      </TableScreenHeader>
      <TableScreenBody>
        <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">
          Detalle del inscrito. Pendiente de implementar.
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
