import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"

import { IconoCarga } from "@/features/gestion-estudiantil/components/icono-carga"
import type { EstadoProcesoCodigo } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { COLOR_ESTADO_PROCESO } from "@/features/gestion-estudiantil/convivencia/api/procesos-ui"

interface ResumenProps {
  numero: string
  estado: { codigo: string; nombre: string }
  /** Datos que van antes del estado (p. ej. el estudiante y su grupo). */
  antes?: (string | null | undefined | false)[]
  /** Datos que van después del estado (plazos, fechas). */
  despues?: (string | null | undefined | false)[]
}

/** «Proceso 2027-008 · [En descargos] · Plazo para descargos: 27/05/2027» (encabezado de cada modal). */
export function ResumenProceso({ numero, estado, antes = [], despues = [] }: ResumenProps) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>Proceso {numero} ·</span>
      {antes.filter(Boolean).map((t) => (
        <span key={t as string}>{t} ·</span>
      ))}
      {/* En <span>: Badge pasa a minúsculas un texto suelto. */}
      <Badge variant="soft" color={COLOR_ESTADO_PROCESO[estado.codigo as EstadoProcesoCodigo] ?? "muted"}>
        <span>{estado.nombre}</span>
      </Badge>
      {despues.filter(Boolean).map((t) => (
        <span key={t as string}>· {t}</span>
      ))}
    </span>
  )
}

interface ShellProps {
  titulo: string
  resumen: ReactNode
  onClose: () => void
  error: unknown
  pending: boolean
  confirmar: { label: string; icon: ReactNode; color?: "destructive"; onClick: () => void; disabled?: boolean }
  children: ReactNode
  className?: string
}

/** Estructura común de los modales de etapa: título, resumen, error del backend y pie Cancelar/Confirmar. */
export function DialogProcesoShell({ titulo, resumen, onClose, error, pending, confirmar, children, className = "sm:max-w-2xl" }: ShellProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription render={<div />}>{resumen}</DialogDescription>
        </DialogHeader>
        <ErrorNoticeBanner error={error} />
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">{children}</div>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cancelar</DialogClose>
          <Button size="sm" type="button" color={confirmar.color} disabled={pending || confirmar.disabled} onClick={confirmar.onClick}>
            <IconoCarga cargando={pending}>{confirmar.icon}</IconoCarga>
            {confirmar.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
