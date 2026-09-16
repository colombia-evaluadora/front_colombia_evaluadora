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

import type {
  CambioPendiente,
  PlanillaPendiente,
} from "@/features/academic-management/reports/api/types"

export interface DestinoPlanilla {
  grupoId: number
  asignaturaId: number
  periodoId: number
}

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

interface FilaAlerta {
  key: string
  docente: string
  asignatura: string
  grupo: string
  detalle: string
  destino: DestinoPlanilla
}

function ListaAlerta({
  titulo,
  descripcion,
  filas,
  onIr,
}: {
  titulo: string
  descripcion: string
  filas: FilaAlerta[]
  onIr: (destino: DestinoPlanilla) => void
}) {
  return (
    <PopoverContent align="end" className="w-96">
      <PopoverClose aria-label="Cerrar">
        <XIcon className="size-4" />
      </PopoverClose>
      <PopoverHeader className="pr-6">
        <PopoverTitle className="text-base normal-case">{titulo}</PopoverTitle>
        <PopoverDescription className="text-xs">{descripcion}</PopoverDescription>
      </PopoverHeader>

      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {filas.map((fila) => (
          <div key={fila.key} className="flex items-center gap-2.5 rounded-md border border-border p-2">
            <Avatar size="sm">
              <AvatarFallback>{fila.docente.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-primary">{fila.docente}</p>
              <p className="truncate text-xs text-muted-foreground">
                {fila.asignatura} · {fila.detalle}
              </p>
            </div>
            <Badge variant="soft" color="neutral">
              {fila.grupo}
            </Badge>
            <Button
              type="button"
              variant="outline"
              color="primary"
              size="xs"
              onClick={() => onIr(fila.destino)}
            >
              Ir
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        ))}
      </div>
    </PopoverContent>
  )
}

interface PendingChangesBannersProps {
  planillasPendientes: PlanillaPendiente[]
  cambiosPendientes: CambioPendiente[]
  onIrAPlanilla: (destino: DestinoPlanilla) => void
}

export function PendingChangesBanners({
  planillasPendientes,
  cambiosPendientes,
  onIrAPlanilla,
}: PendingChangesBannersProps) {
  if (planillasPendientes.length === 0 && cambiosPendientes.length === 0) return null

  // El contador del botón naranja suma estudiantes afectados, no filas: una
  // misma planilla puede tocar a varios.
  const estudiantesAfectados = cambiosPendientes.reduce((t, c) => t + c.estudiantesAfectados, 0)
  const gruposConCambios = new Set(cambiosPendientes.map((c) => c.grupoId)).size

  return (
    <div className="mb-4 flex flex-col gap-3">
      {planillasPendientes.length > 0 && (
        <Banner
          color="destructive"
          titulo="Docentes con planillas pendientes de calificar"
          descripcion="Algunos docentes no han registrado calificaciones en sus grupos y asignaturas para este periodo."
        >
          <Popover>
            <PopoverTrigger render={<Button variant="outline" color="destructive" size="sm" />}>
              Ver planillas pendientes ({planillasPendientes.length})
            </PopoverTrigger>
            <ListaAlerta
              titulo={`Planillas sin calificar (${planillasPendientes.length})`}
              descripcion="Períodos ya terminados sin ninguna nota ni observación registrada."
              filas={planillasPendientes.map((p) => ({
                key: `${p.grupoId}-${p.asignaturaId}-${p.periodoId}`,
                docente: p.docente ?? "Sin docente asignado",
                asignatura: p.asignaturaNombre,
                grupo: p.grupoNombre,
                detalle:
                  p.actividades === 0
                    ? "sin actividades creadas"
                    : `${p.actividades} actividades sin calificar`,
                destino: { grupoId: p.grupoId, asignaturaId: p.asignaturaId, periodoId: p.periodoId },
              }))}
              onIr={onIrAPlanilla}
            />
          </Popover>
        </Banner>
      )}

      {cambiosPendientes.length > 0 && (
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
              Ver cambios pendientes ({estudiantesAfectados})
            </PopoverTrigger>
            <ListaAlerta
              titulo={`Grupos con cambios (${gruposConCambios})`}
              descripcion="Docentes que realizaron cambios en los grupos seleccionados."
              filas={cambiosPendientes.map((c) => ({
                key: `${c.grupoId}-${c.asignaturaId}-${c.periodoId}`,
                docente: c.docente ?? "Sin docente asignado",
                asignatura: c.asignaturaNombre,
                grupo: c.grupoNombre,
                detalle: `${c.estudiantesAfectados} estudiante${c.estudiantesAfectados === 1 ? "" : "s"}`,
                destino: { grupoId: c.grupoId, asignaturaId: c.asignaturaId, periodoId: c.periodoId },
              }))}
              onIr={onIrAPlanilla}
            />
          </Popover>
        </Banner>
      )}
    </div>
  )
}
