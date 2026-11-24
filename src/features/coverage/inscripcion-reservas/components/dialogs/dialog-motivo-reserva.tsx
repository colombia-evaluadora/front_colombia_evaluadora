import { z } from "zod"
import type { ReactNode } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LockIcon, PersonRemoveIcon, WarningIcon, XIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"

import {
  useLiberarReserva,
  useRechazarTraslado,
  useRegistrarRetiro,
} from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-reserva"
import { useReservasCupoCatalogosQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type {
  OpcionCatalogo,
  ReservaCupo,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import {
  Aviso,
  EstadoReservaBadge,
} from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const FORM_ID = "dialog-motivo-reserva"

interface DialogProps {
  reserva: ReservaCupo | null
  onOpenChange: (open: boolean) => void
  onDone: (mensaje: string) => void
}

/** "Séptimo · IE Central · Mañana"; una Sin continuidad no tiene sede ni jornada. */
const ubicacion = (r: ReservaCupo, ...partes: string[]) =>
  [r.grado, ...partes].filter(Boolean).join(" · ")

/**
 * Liberar manualmente, Registrar retiro y Rechazar traslado comparten forma (prototipo): un
 * motivo obligatorio, el efecto y un botón destructivo.
 */
function DialogMotivo({
  onOpenChange,
  onDone,
  titulo,
  subtitulo,
  campo,
  ayuda,
  motivos,
  efecto,
  boton,
  icono,
  exito,
  enviar,
  destructivo = false,
}: Omit<DialogProps, "reserva"> & {
  titulo: ReactNode
  subtitulo: ReactNode
  campo: string
  ayuda?: string
  motivos: OpcionCatalogo[]
  efecto?: ReactNode
  boton: string
  /** Rojo solo si borra o apaga (CLAUDE.md §13): el retiro; liberar y rechazar son decisiones (azul). */
  destructivo?: boolean
  icono: ReactNode
  exito: string
  enviar: {
    mutateAsync: (motivoId: number) => Promise<unknown>
    isPending: boolean
    error: unknown
  }
}) {
  const form = useAppForm({
    defaultValues: { motivo: 0 },
    validators: {
      onSubmit: z.object({ motivo: z.number().min(1, required(`El ${campo.toLowerCase()}`)) }),
    },
    onSubmit: async ({ value }) => {
      try {
        await enviar.mutateAsync(value.motivo)
      } catch {
        return // El banner del modal muestra el error.
      }
      onDone(exito)
      onOpenChange(false)
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && !enviar.isPending && onOpenChange(false)}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{titulo}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {subtitulo}
          </div>
        </DialogHeader>
        <form
          id={FORM_ID}
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <ErrorNoticeBanner error={enviar.error} />
          <form.AppField name="motivo">
            {(f) => (
              <f.SelectField
                label={campo}
                required
                emptyValue={0}
                description={ayuda}
                options={motivos.map((m) => ({ value: m.id, label: m.nombre }))}
              />
            )}
          </form.AppField>
          {efecto}
          <p className="text-xs text-muted-foreground">
            Los campos marcados con * son obligatorios
          </p>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={enviar.isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} color={destructivo ? "destructive" : "primary"} disabled={enviar.isPending}>
            {enviar.isPending ? <Spinner data-icon="inline-start" /> : icono}
            {boton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Liberar manualmente (Regla 33): solo los motivos que admite el back (V504). */
export function LiberarReservaDialog({ reserva, ...props }: DialogProps) {
  const { data: catalogos } = useReservasCupoCatalogosQuery()
  const liberar = useLiberarReserva()
  if (!reserva) return null
  const r = reserva
  return (
    <DialogMotivo
      key={r.id}
      {...props}
      // La mutación vive fuera del modal: al cerrar se limpia su error.
      onOpenChange={(open) => {
        if (!open) liberar.reset()
        props.onOpenChange(open)
      }}
      titulo={
        <>
          <WarningIcon className="size-5 text-orange" aria-hidden />
          Liberar reserva — {r.estudiante}
        </>
      }
      subtitulo={
        r.estado === "SIN_CONTINUIDAD"
          ? "La reserva Sin continuidad quedará Liberada."
          : `El cupo de ${ubicacion(r, r.jornada)} quedará disponible.`
      }
      campo="Motivo de liberación"
      motivos={catalogos?.motivosLiberacion ?? []}
      boton="Liberar"
      icono={<LockIcon data-icon="inline-start" />}
      exito={`Se liberó la reserva de ${r.estudiante}.`}
      enviar={{
        mutateAsync: (motivoId) => liberar.mutateAsync({ id: r.id, motivoId }),
        isPending: liberar.isPending,
        error: liberar.error,
      }}
    />
  )
}

/** Registrar retiro (Regla 33): decisión Se retira; la reserva queda Liberada. */
export function RegistrarRetiroDialog({ reserva, ...props }: DialogProps) {
  const { data: catalogos } = useReservasCupoCatalogosQuery()
  const retiro = useRegistrarRetiro()
  if (!reserva) return null
  const r = reserva
  return (
    <DialogMotivo
      key={r.id}
      {...props}
      // La mutación vive fuera del modal: al cerrar se limpia su error.
      onOpenChange={(open) => {
        if (!open) retiro.reset()
        props.onOpenChange(open)
      }}
      titulo={<>Registrar retiro — {r.estudiante}</>}
      subtitulo={
        <>
          Reserva: {ubicacion(r, r.sede, r.jornada)}
          <EstadoReservaBadge estado={r.estado} />
        </>
      }
      campo="Motivo de retiro"
      ayuda="¿Se va a otro colegio? Elija Solicitar traslado."
      motivos={catalogos?.motivosRetiro ?? []}
      efecto={
        <Aviso tono="info">
          La reserva pasará a Liberada con motivo Retiro del estudiante y se notificará al
          acudiente.
        </Aviso>
      }
      boton="Registrar retiro"
      destructivo
      icono={<PersonRemoveIcon data-icon="inline-start" />}
      exito={`Se registró el retiro de ${r.estudiante}.`}
      enviar={{
        mutateAsync: (motivoId) => retiro.mutateAsync({ id: r.id, motivoId }),
        isPending: retiro.isPending,
        error: retiro.error,
      }}
    />
  )
}

/**
 * Rechazar traslado (Sección 3.2.1), en el destino: exige un motivo de rechazo; la fila sale de la
 * lista, la reserva del origen sigue Reservada y se avisa al acudiente.
 */
export function RechazarTrasladoDialog({ reserva, ...props }: DialogProps) {
  const { data: catalogos } = useReservasCupoCatalogosQuery()
  const rechazar = useRechazarTraslado()
  if (!reserva) return null
  const r = reserva
  return (
    <DialogMotivo
      key={r.id}
      {...props}
      // La mutación vive fuera del modal: al cerrar se limpia su error.
      onOpenChange={(open) => {
        if (!open) rechazar.reset()
        props.onOpenChange(open)
      }}
      titulo={<>Rechazar traslado — {r.estudiante}</>}
      subtitulo={
        r.establecimientoOrigen
          ? `El estudiante conserva su reserva en ${r.establecimientoOrigen}.`
          : "El estudiante conserva su reserva en el establecimiento de origen."
      }
      campo="Motivo de rechazo"
      motivos={catalogos?.motivosRechazoTraslado ?? []}
      boton="Rechazar"
      icono={<XIcon data-icon="inline-start" />}
      exito={`Se rechazó el traslado de ${r.estudiante}.`}
      enviar={{
        mutateAsync: (motivoId) => rechazar.mutateAsync({ id: r.id, motivoId }),
        isPending: rechazar.isPending,
        error: rechazar.error,
      }}
    />
  )
}
