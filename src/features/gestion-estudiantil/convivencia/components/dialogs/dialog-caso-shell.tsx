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

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { COLOR_ESTADO } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"

/** Chips de tipo, estado y gestor actual que encabezan los modales de operación. */
export function ResumenCaso({ caso }: { caso: CasoResumen }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>Caso {caso.numero} ·</span>
      {/* En <span>: Badge pasa a minúsculas un texto suelto y «Tipo II» quedaría «Tipo ii». */}
      <Badge variant="soft" color="info">
        <span>{caso.tipo_nombre}</span>
      </Badge>
      <Badge variant="soft" color={COLOR_ESTADO[caso.estado_codigo] ?? "muted"}>
        {caso.estado_nombre}
      </Badge>
      {caso.fk_gestor ? (
        <span>· Gestor: {caso.gestor_nombre}</span>
      ) : (
        <Badge variant="soft" color="warning">
          Sin gestor
        </Badge>
      )}
    </span>
  )
}

interface DialogCasoShellProps {
  caso: CasoResumen | null
  titulo: string
  onClose: () => void
  error: unknown
  pending: boolean
  confirmar: { label: string; icon: ReactNode; color?: "destructive"; onClick: () => void; disabled?: boolean }
  children: ReactNode
  className?: string
}

/** Estructura común: título «X — Caso N», resumen, error del backend en ErrorNoticeBanner y pie Cancelar/Confirmar. */
export function DialogCasoShell({
  caso,
  titulo,
  onClose,
  error,
  pending,
  confirmar,
  children,
  className = "sm:max-w-lg",
}: DialogCasoShellProps) {
  return (
    <Dialog open={caso != null} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>
            {titulo} — Caso {caso?.numero}
          </DialogTitle>
          {caso && (
            <DialogDescription render={<div />}>
              <ResumenCaso caso={caso} />
            </DialogDescription>
          )}
        </DialogHeader>
        <ErrorNoticeBanner error={error} />
        {children}
        <DialogFooter className="sm:items-center">
          {/* Nota de obligatorios a la izquierda, en la misma línea que los botones. */}
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cancelar</DialogClose>
          <Button
            size="sm"
            type="button"
            color={confirmar.color}
            disabled={pending || confirmar.disabled}
            onClick={confirmar.onClick}
          >
            <IconoCarga cargando={pending}>{confirmar.icon}</IconoCarga>
            {confirmar.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
