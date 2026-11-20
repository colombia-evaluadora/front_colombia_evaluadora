import type { ReactNode } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowCounterClockwiseIcon, XCircleIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"

import {
  useCancelarTraslado,
  useRestituirReserva,
} from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-reserva"
import type { ReservaCupo } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

interface Props {
  reserva: ReservaCupo | null
  onOpenChange: (open: boolean) => void
  onDone: (mensaje: string) => void
}

/**
 * Confirmación de una acción sin datos (Restituir, Cancelar traslado). El error del back (p. ej. el 409
 * de Restituir sin cupo) queda en el modal; el éxito, en el aviso de la pestaña.
 */
function DialogConfirmar({
  onOpenChange,
  onDone,
  titulo,
  descripcion,
  efecto,
  volver = "Cancelar",
  boton,
  icono,
  color,
  exito,
  enviar,
}: Omit<Props, "reserva"> & {
  titulo: ReactNode
  descripcion: ReactNode
  efecto?: ReactNode
  volver?: string
  boton: string
  icono: ReactNode
  color?: "primary" | "destructive"
  exito: string
  enviar: {
    mutateAsync: () => Promise<unknown>
    reset: () => void
    isPending: boolean
    error: unknown
  }
}) {
  function cerrar() {
    enviar.reset()
    onOpenChange(false)
  }

  async function confirmar() {
    try {
      await enviar.mutateAsync()
    } catch {
      return // El banner del modal muestra el error.
    }
    onDone(exito)
    cerrar()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !enviar.isPending && cerrar()}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <ErrorNoticeBanner error={enviar.error} />
          {efecto}
        </div>
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={enviar.isPending} onClick={cerrar}>
            {volver}
          </Button>
          <Button color={color} disabled={enviar.isPending} onClick={confirmar}>
            {enviar.isPending ? <Spinner data-icon="inline-start" /> : icono}
            {boton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Restituir (Regla 33): una Liberada vuelve a Reservada en su misma ubicación. El back exige cupo,
 * fecha límite de matrícula vigente y que no haya otra reserva vigente; nunca restituye la que liberó
 * la entidad territorial.
 */
export function RestituirReservaDialog({ reserva, ...props }: Props) {
  const restituir = useRestituirReserva()
  if (!reserva) return null
  const r = reserva
  const ubicacion = [r.grado, r.jornada, r.sede].filter(Boolean).join(" · ")
  return (
    <DialogConfirmar
      key={r.id}
      {...props}
      titulo={<>Restituir reserva — {r.estudiante}</>}
      descripcion={`La reserva volverá a Reservada en ${ubicacion}.`}
      efecto={
        <Aviso tono="info">
          Solo se restituye si hay cupo, no venció la fecha límite de matrícula y el estudiante no
          tiene otra reserva vigente en este o en otro establecimiento. Se notificará al acudiente.
        </Aviso>
      }
      boton="Restituir"
      icono={<ArrowCounterClockwiseIcon data-icon="inline-start" />}
      exito={`Se restituyó la reserva de ${r.estudiante}.`}
      enviar={{
        mutateAsync: () => restituir.mutateAsync(r.id),
        reset: restituir.reset,
        isPending: restituir.isPending,
        error: restituir.error,
      }}
    />
  )
}

/** Cancelar traslado (Sección 3.2.1), en el origen, mientras está Pendiente. */
export function CancelarTrasladoDialog({ reserva, ...props }: Props) {
  const cancelar = useCancelarTraslado()
  if (!reserva) return null
  const r = reserva
  return (
    <DialogConfirmar
      key={r.id}
      {...props}
      titulo={<>Cancelar traslado — {r.estudiante}</>}
      descripcion="El estudiante conserva su reserva en este establecimiento."
      volver="Volver"
      boton="Cancelar traslado"
      icono={<XCircleIcon data-icon="inline-start" />}
      color="destructive"
      exito={`Se canceló el traslado de ${r.estudiante}.`}
      enviar={{
        mutateAsync: () => cancelar.mutateAsync(r.id),
        reset: cancelar.reset,
        isPending: cancelar.isPending,
        error: cancelar.error,
      }}
    />
  )
}
