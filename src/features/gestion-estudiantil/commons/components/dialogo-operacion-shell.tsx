import type { ReactNode } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
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

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"

interface Props {
  titulo: string
  /** Línea bajo el título (chips y datos del registro, como en los modales del prototipo). */
  resumen?: ReactNode
  onClose: () => void
  /** Error del backend (22023, 42501…): se muestra tal cual en un banner dentro del modal. */
  error: unknown
  pending: boolean
  confirmar: { label: string; icon: ReactNode; color?: "destructive"; onClick: () => void; disabled?: boolean }
  /** G.3.CIT.5 rotula el botón secundario «Volver». */
  cancelarLabel?: string
  className?: string
  children: ReactNode
}

/**
 * Estructura común de los modales de operación de Citaciones y compromisos: título, resumen, error del
 * backend, campos, nota de obligatorios y pie Cancelar (outline neutral) / acción. Cada modal se monta
 * solo mientras está abierto, así su estado arranca limpio en cada apertura.
 */
export function DialogoOperacionShell({
  titulo,
  resumen,
  onClose,
  error,
  pending,
  confirmar,
  cancelarLabel = "Cancelar",
  className = "sm:max-w-lg",
  children,
}: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {resumen && <DialogDescription render={<div />}>{resumen}</DialogDescription>}
        </DialogHeader>
        <ErrorNoticeBanner error={error} />
        {children}
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" disabled={pending} />}>
            {cancelarLabel}
          </DialogClose>
          <Button size="sm" type="button" color={confirmar.color} disabled={pending || confirmar.disabled} onClick={confirmar.onClick}>
            <IconoCarga cargando={pending}>{confirmar.icon}</IconoCarga>
            {confirmar.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
