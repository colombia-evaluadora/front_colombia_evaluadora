import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon, InfoIcon, XIcon } from "@/components/ui/icons"
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import type { CambiosPendientesInfo } from "@/features/academic-management/reports/api/types"

interface BannerProps {
  color: "destructive" | "orange"
  titulo: string
  descripcion: string
  children: React.ReactNode
}

const BANNER_COLOR_CLASSES: Record<BannerProps["color"], string> = {
  destructive: "border-red-stroke bg-red-22 text-red",
  orange: "border-orange-stroke bg-orange-22 text-orange",
}

function Banner({ color, titulo, descripcion, children }: BannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3",
        BANNER_COLOR_CLASSES[color],
      )}
    >
      <div className="flex items-start gap-2.5">
        <InfoIcon className="mt-0.5 size-4.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">{titulo}</p>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

interface PendingChangesBannersProps {
  planillasPendientes: number
  cambiosPendientes: CambiosPendientesInfo
  onVerPlanillasPendientes: () => void
  onIrAPlanilla: (docenteId: number) => void
}

/**
 * Dos estados que un administrador necesita ver antes de confiar en el
 * informe del período: docentes que ni siquiera han calificado, y docentes
 * que calificaron tarde (después del cierre) y cuyo cambio aún no se ha
 * aprobado. Ninguno de los dos bloquea la pantalla — son avisos, la decisión
 * de aprobar/rechazar cada cambio queda fuera de este mockup.
 */
export function PendingChangesBanners({
  planillasPendientes,
  cambiosPendientes,
  onVerPlanillasPendientes,
  onIrAPlanilla,
}: PendingChangesBannersProps) {
  if (planillasPendientes === 0 && cambiosPendientes.totalDocentes === 0) return null

  return (
    <div className="mb-4 flex flex-col gap-3">
      {planillasPendientes > 0 && (
        <Banner
          color="destructive"
          titulo="Docentes con planillas pendientes de calificar"
          descripcion="Algunos docentes no han registrado calificaciones en sus grupos y asignaturas para este periodo."
        >
          <Button variant="outline" color="destructive" size="sm" onClick={onVerPlanillasPendientes}>
            Ver planillas pendientes ({planillasPendientes})
          </Button>
        </Banner>
      )}

      {cambiosPendientes.totalDocentes > 0 && (
        <Banner
          color="orange"
          titulo="Docentes con cambios pendientes de aprobación"
          descripcion="Se han realizado cambios en las planillas de calificación después del cierre del período. Estos cambios requieren de revisión y aprobación por el administrador."
        >
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  color="warning"
                  size="sm"
                  className="border-orange-stroke text-orange hover:bg-orange/10 focus-visible:ring-orange/20"
                />
              }
            >
              Ver cambios pendientes ({cambiosPendientes.totalDocentes})
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96">
              <PopoverClose aria-label="Cerrar">
                <XIcon className="size-4" />
              </PopoverClose>
              <PopoverHeader className="pr-6">
                <PopoverTitle className="text-base normal-case">
                  Grupos con cambios ({cambiosPendientes.grupos.length})
                </PopoverTitle>
                <PopoverDescription className="text-xs">
                  Docentes que realizaron cambios en los grupos seleccionados.
                </PopoverDescription>
              </PopoverHeader>

              <div className="flex flex-col gap-2">
                {cambiosPendientes.grupos.map((docente) => (
                  <div
                    key={docente.id}
                    className="flex items-center gap-2.5 rounded-md border border-border p-2"
                  >
                    <Avatar size="sm">
                      <AvatarFallback>{docente.nombreDocente.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary">{docente.nombreDocente}</p>
                      <p className="truncate text-xs text-muted-foreground">{docente.asignatura}</p>
                    </div>
                    <Badge variant="soft" color="neutral">
                      {docente.gradoGrupo}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      color="primary"
                      size="xs"
                      onClick={() => onIrAPlanilla(docente.id)}
                    >
                      Ir
                      <ArrowRightIcon data-icon="inline-end" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 rounded-md bg-primary-22 px-3 py-2 text-xs text-primary">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                Los cambios están pendientes de revisión y aprobación por el administrador.
              </div>
            </PopoverContent>
          </Popover>
        </Banner>
      )}
    </div>
  )
}
