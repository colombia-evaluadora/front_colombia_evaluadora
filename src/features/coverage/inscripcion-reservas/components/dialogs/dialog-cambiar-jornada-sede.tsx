import { z } from "zod"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowsLeftRightIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"

import { useCambiarJornadaSede } from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-reserva"
import { useUbicacionesReservaQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-detalle-query"
import type {
  ReservaCupo,
  UbicacionReserva,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
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
  onDone: (mensaje: string) => void
}

/**
 * Cambiar jornada o sede (Regla 33): mismo grado, otra jornada o sede del
 * establecimiento con cupo. El back recibe el grado de esa sede y jornada.
 */
export function CambiarJornadaSedeDialog({ reserva, onOpenChange, onDone }: Props) {
  // `key`: cada reserva abre el formulario limpio, con su jornada actual.
  return reserva ? (
    <Contenido key={reserva.id} reserva={reserva} onOpenChange={onOpenChange} onDone={onDone} />
  ) : null
}

function Contenido({ reserva, onOpenChange, onDone }: Props & { reserva: ReservaCupo }) {
  const ubicaciones = useUbicacionesReservaQuery(reserva.id)
  const cambiar = useCambiarJornadaSede()

  // Las que tienen cupo, sin la ubicación actual.
  const destinos = (ubicaciones.data ?? []).filter(
    (u) =>
      u.cupoDisponible > 0 &&
      !(u.fkTsede === reserva.fkTsede && u.fkTlvJornada === reserva.fkTlvJornada),
  )
  const buscar = (jornada: string, sede: string): UbicacionReserva | undefined =>
    destinos.find((u) => String(u.fkTlvJornada) === jornada && String(u.fkTsede) === sede)

  const form = useAppForm({
    defaultValues: {
      jornada: reserva.fkTlvJornada != null ? String(reserva.fkTlvJornada) : "",
      sede: "",
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const destino = buscar(value.jornada, value.sede)
      if (!destino) return
      try {
        await cambiar.mutateAsync({ id: reserva.id, fkTgrado: destino.fkTgrado })
      } catch {
        return // El banner del modal muestra el error.
      }
      onDone(
        `Se cambió la reserva de ${reserva.estudiante} a ${destino.jornada} · ${destino.sede}.`,
      )
      onOpenChange(false)
    },
  })

  const jornadas = [...new Map(destinos.map((u) => [String(u.fkTlvJornada), u.jornada]))].map(
    ([value, label]) => ({ value, label }),
  )
  const sinOpciones = ubicaciones.isSuccess && destinos.length === 0

  return (
    <Dialog open onOpenChange={(open) => !open && !cambiar.isPending && onOpenChange(false)}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cambiar jornada o sede — {reserva.estudiante}</DialogTitle>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Hoy: {reserva.grado} · {reserva.jornada} · {reserva.sede}
            <EstadoReservaBadge estado={reserva.estado} />
          </p>
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
          <ErrorNoticeBanner error={cambiar.error ?? ubicaciones.error} />
          <div className="grid gap-4 sm:grid-cols-3">
            <CampoLectura id="cambio-grado" label="Grado" value={reserva.grado} />
            <form.AppField
              name="jornada"
              listeners={{ onChange: () => form.setFieldValue("sede", "") }}
            >
              {(f) => (
                <f.SelectField
                  label="Jornada"
                  required
                  disabled={ubicaciones.isPending}
                  options={jornadas}
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
                      disabled={!jornada || ubicaciones.isPending}
                      options={destinos
                        .filter((u) => String(u.fkTlvJornada) === jornada)
                        .map((u) => ({ value: String(u.fkTsede), label: u.sede }))}
                    />
                  )}
                </form.AppField>
              )}
            </form.Subscribe>
          </div>
          {sinOpciones ? (
            <Aviso tono="info">
              No hay otra jornada ni sede con cupo en {reserva.grado} en este momento.
            </Aviso>
          ) : (
            <Aviso tono="warning">
              La constancia de reserva vigente quedará Anulada; genere una nueva para el acudiente.
            </Aviso>
          )}
          <p className="text-xs text-muted-foreground">
            Los campos marcados con * son obligatorios
          </p>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={cambiar.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={cambiar.isPending || sinOpciones}>
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
