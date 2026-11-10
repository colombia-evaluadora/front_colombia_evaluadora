import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowsLeftRightIcon, XIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"

import { useCambiarJornadaSede } from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-reserva"
import { useOpcionesCupoQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-detalle-query"
import type { ReservaCupo } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import {
  Aviso,
  CampoLectura,
  EstadoReservaBadge,
} from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const FORM_ID = "cambiar-jornada-sede-form"

const schema = z.object({
  jornada: z.string().min(1, required("La jornada", { femenino: true })),
  sede: z.string().min(1, required("La sede", { femenino: true })),
})

interface Props {
  reserva: ReservaCupo | null
  onOpenChange: (open: boolean) => void
}

/** Cambiar jornada o sede (Sección 3.2): mismo grado, otra jornada o sede con cupo. */
export function CambiarJornadaSedeDialog({ reserva, onOpenChange }: Props) {
  const { data: opciones = [] } = useOpcionesCupoQuery(reserva?.id ?? null)
  const cambiar = useCambiarJornadaSede()

  const form = useAppForm({
    defaultValues: { jornada: "", sede: "" },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      try {
        await cambiar.mutateAsync({ id: reserva?.id ?? "", ...value })
        toast.success(
          `Se cambió la reserva de ${reserva?.estudiante} a ${value.jornada} · ${value.sede}.`,
        )
        cerrar()
      } catch (e) {
        toast.error(getErrorMessage(e))
      }
    },
  })

  function cerrar() {
    form.reset()
    onOpenChange(false)
  }

  const jornadas = [...new Set(opciones.map((o) => o.jornada))]

  return (
    <Dialog open={reserva != null} onOpenChange={(open) => !open && !cambiar.isPending && cerrar()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cambiar jornada o sede — {reserva?.estudiante}</DialogTitle>
          {reserva && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              Hoy: {reserva.grado} · {reserva.jornada} · {reserva.sede}
              <EstadoReservaBadge estado={reserva.estado} />
            </p>
          )}
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
          <CampoLectura id="cambio-grado" label="Grado" required value={reserva?.grado} />
          <div className="grid gap-4 sm:grid-cols-2">
            <form.AppField
              name="jornada"
              listeners={{ onChange: () => form.setFieldValue("sede", "") }}
            >
              {(f) => (
                <f.SelectField
                  label="Jornada"
                  required
                  placeholder="Seleccionar"
                  options={jornadas.map((j) => ({ value: j, label: j }))}
                />
              )}
            </form.AppField>
            <form.Subscribe selector={(s) => s.values.jornada}>
              {(jornada) => (
                <form.AppField name="sede">
                  {(f) => (
                    <f.SelectField
                      label="Sede"
                      required
                      placeholder={jornada ? "Seleccionar" : "Elija la jornada primero"}
                      disabled={!jornada}
                      options={opciones
                        .filter((o) => o.jornada === jornada)
                        .map((o) => ({ value: o.sede, label: o.sede }))}
                    />
                  )}
                </form.AppField>
              )}
            </form.Subscribe>
          </div>
          <Aviso tono="info">
            Solo se ofrecen jornadas y sedes del establecimiento con cupo en {reserva?.grado}.
          </Aviso>
          <Aviso tono="warning">
            La constancia de reserva vigente quedará Anulada; genere una nueva para el acudiente.
          </Aviso>
          <p className="text-xs text-muted-foreground">
            Los campos marcados con * son obligatorios
          </p>
        </form>

        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={cambiar.isPending} onClick={cerrar}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={cambiar.isPending}>
            {cambiar.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <ArrowsLeftRightIcon data-icon="inline-start" />
            )}
            Cambiar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
