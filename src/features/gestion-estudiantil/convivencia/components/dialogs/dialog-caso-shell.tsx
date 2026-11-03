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
import { SpinnerIcon } from "@/components/ui/icons"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"

import { COLOR_ESTADO } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"

/** Chips de tipo, estado y gestor actual que encabezan los modales de operación. */
export function ResumenCaso({ caso }: { caso: CasoResumen }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>Caso {caso.numero} ·</span>
      <Badge variant="soft" color="info">
        {caso.tipo_nombre}
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
  notice: Notice | null
  onNoticeClose: () => void
  pending: boolean
  confirmar: { label: string; icon: ReactNode; color?: "destructive"; onClick: () => void; disabled?: boolean }
  children: ReactNode
  className?: string
}

/** Estructura común: título «X — Caso N», resumen, error del backend en NoticeBanner y pie Cancelar/Confirmar. */
export function DialogCasoShell({
  caso,
  titulo,
  onClose,
  notice,
  onNoticeClose,
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
        <NoticeBanner notice={notice} onClose={onNoticeClose} variant="error" />
        {children}
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="muted" />}>Cancelar</DialogClose>
          <Button
            size="sm"
            type="button"
            color={confirmar.color}
            disabled={pending || confirmar.disabled}
            onClick={confirmar.onClick}
          >
            {pending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : confirmar.icon}
            {confirmar.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
