import { z } from "zod"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LockIcon, PersonRemoveIcon, XIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"
import { toast } from "sonner"

import {
  useLiberarReserva,
  useRegistrarRetiro,
} from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-reserva"
import { useCatalogosAccionesQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-detalle-query"
import type { ReservaCupo } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

interface DialogProps {
  reserva: ReservaCupo | null
  onOpenChange: (open: boolean) => void
}

/**
 * Liberar manualmente y Registrar retiro comparten diseño (Sección 3.2,
 * "Modales de las acciones"): un motivo, el efecto y un botón destructivo.
 */
function DialogMotivo({
  reserva,
  onOpenChange,
  titulo,
  campo,
  motivos,
  efecto,
  boton,
  icono,
  exito,
  enviar,
  pendiente,
}: DialogProps & {
  titulo: string
  campo: string
  motivos: string[]
  efecto: string
  boton: string
  icono: ReactNode
  exito: string
  enviar: (motivo: string) => Promise<unknown>
  pendiente: boolean
}) {
  const form = useAppForm({
    defaultValues: { motivo: "" },
    validators: {
      onSubmit: z.object({ motivo: z.string().min(1, required(`El ${campo.toLowerCase()}`)) }),
    },
    onSubmit: async ({ value }) => {
      try {
        await enviar(value.motivo)
        toast.success(exito)
        onOpenChange(false)
      } catch (e) {
        toast.error(getErrorMessage(e))
      }
    },
  })

  return (
    <Dialog
      open={reserva != null}
      onOpenChange={(open) => {
        if (pendiente) return
        if (!open) form.reset()
        onOpenChange(open)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {titulo} — {reserva?.estudiante}
          </DialogTitle>
        </DialogHeader>
        <form
          id="dialog-motivo-reserva"
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.AppField name="motivo">
            {(f) => (
              <f.SelectField
                label={campo}
                required
                placeholder="Seleccionar"
                options={motivos.map((m) => ({ value: m, label: m }))}
              />
            )}
          </form.AppField>
          <Aviso tono="warning">{efecto}</Aviso>
          <p className="text-xs text-muted-foreground">
            Los campos marcados con * son obligatorios
          </p>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={pendiente}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            type="submit"
            form="dialog-motivo-reserva"
            color="destructive"
            disabled={pendiente}
          >
            {pendiente ? <Spinner data-icon="inline-start" /> : icono}
            {boton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LiberarReservaDialog(props: DialogProps) {
  const { data: catalogos } = useCatalogosAccionesQuery()
  const liberar = useLiberarReserva()
  const r = props.reserva
  return (
    <DialogMotivo
      {...props}
      titulo="Liberar reserva"
      campo="Motivo de liberación"
      motivos={catalogos?.motivosLiberacion ?? []}
      efecto={`El cupo de ${r?.grado} · ${r?.jornada} quedará disponible.`}
      boton="Liberar"
      icono={<LockIcon data-icon="inline-start" />}
      exito={`Se liberó la reserva de ${r?.estudiante}.`}
      enviar={(motivo) => liberar.mutateAsync({ id: r?.id ?? "", motivo })}
      pendiente={liberar.isPending}
    />
  )
}

export function RegistrarRetiroDialog(props: DialogProps) {
  const { data: catalogos } = useCatalogosAccionesQuery()
  const retiro = useRegistrarRetiro()
  const r = props.reserva
  return (
    <DialogMotivo
      {...props}
      titulo="Registrar retiro"
      campo="Motivo de retiro"
      motivos={catalogos?.motivosRetiro ?? []}
      efecto={`La reserva pasará a Liberada con el motivo Retiro del estudiante y el cupo de ${r?.grado} · ${r?.jornada} quedará disponible.`}
      boton="Registrar retiro"
      icono={<PersonRemoveIcon data-icon="inline-start" />}
      exito={`Se registró el retiro de ${r?.estudiante}.`}
      enviar={(motivo) => retiro.mutateAsync({ id: r?.id ?? "", motivo })}
      pendiente={retiro.isPending}
    />
  )
}
