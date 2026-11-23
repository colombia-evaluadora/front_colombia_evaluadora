import type { ReactNode } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useNotify } from "@/components/notice/notice-context"
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
import { ArrowUpIcon, PersonAddIcon, UsersIcon, XIcon } from "@/components/ui/icons"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import {
  useApoyoOrientacionGestion,
  useEscalarGestion,
  useTomarGestion,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/gestion-alertas"
import type { ResumenGestion } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ResumenGestionDialogo } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/resumen-gestion"

export type ConfirmacionGestion = "tomar" | "apoyo" | "escalar"

const TEXTOS: Record<ConfirmacionGestion, { titulo: string; cuerpo: string; boton: string; exito: string; icono: ReactNode }> = {
  tomar: {
    titulo: "Tomar la gestión",
    cuerpo:
      "Pasará a ser el Responsable de esta gestión. Se avisa a los demás Supervisores de sede y al Administrador del establecimiento.",
    boton: "Tomar",
    exito: "Gestión tomada.",
    icono: <PersonAddIcon data-icon="inline-start" />,
  },
  apoyo: {
    titulo: "Solicitar apoyo de orientación",
    cuerpo: "Se avisa al Profesional de orientación, que valora el caso y crea el plan si hace falta.",
    boton: "Solicitar apoyo",
    exito: "Apoyo de orientación solicitado.",
    icono: <UsersIcon data-icon="inline-start" />,
  },
  escalar: {
    titulo: "Escalar a la entidad territorial",
    cuerpo:
      "La gestión queda Escalada. La entidad territorial ve el estudiante, el grado, el umbral y los días, sin la información sensible, y puede registrar una orientación.",
    boton: "Escalar",
    exito: "Alerta escalada a la entidad territorial.",
    icono: <ArrowUpIcon data-icon="inline-start" />,
  },
}

/** Tomar, Solicitar apoyo de orientación y Escalar: operaciones sin campos que se confirman antes de enviarse. */
export function DialogConfirmarGestion({
  gestion,
  accion,
  onClose,
}: {
  gestion: ResumenGestion
  accion: ConfirmacionGestion
  onClose: () => void
}) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const t = TEXTOS[accion]
  const mutationConfig = {
    onSuccess: () => {
      notify(t.exito, { variant: "success" })
      onClose()
    },
    onError: (e: Error) => s.setError(e),
  }
  const tomar = useTomarGestion({ mutationConfig })
  const apoyo = useApoyoOrientacionGestion({ mutationConfig })
  const escalar = useEscalarGestion({ mutationConfig })
  const mut = accion === "tomar" ? tomar : accion === "apoyo" ? apoyo : escalar

  return (
    <Dialog open onOpenChange={(open) => !open && !mut.isPending && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.titulo}</DialogTitle>
          <DialogDescription render={<div />}>
            <ResumenGestionDialogo g={gestion} />
          </DialogDescription>
        </DialogHeader>
        <ErrorNoticeBanner error={s.error} />
        <p className="text-sm">{t.cuerpo}</p>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" color="neutral" size="sm" type="button" disabled={mut.isPending} />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
          <Button
            size="sm"
            type="button"
            disabled={mut.isPending}
            onClick={() => {
              s.setError(null)
              mut.mutate({ id: gestion.id })
            }}
          >
            <IconoCarga cargando={mut.isPending}>{t.icono}</IconoCarga>
            {t.boton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
