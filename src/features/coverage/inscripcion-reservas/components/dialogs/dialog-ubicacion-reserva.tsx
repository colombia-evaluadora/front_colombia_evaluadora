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
import { ArmchairIcon, ArrowsLeftRightIcon, CheckIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"

import {
  useAceptarTraslado,
  useCambiarJornadaSede,
  useReservarCupo,
} from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-reserva"
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

const FORM_ID = "ubicacion-reserva-form"

const schema = z.object({
  jornada: z.string().min(1, required("La jornada", { femenino: true })),
  sede: z.string().min(1, required("La sede", { femenino: true })),
})

interface Props {
  reserva: ReservaCupo | null
  onOpenChange: (open: boolean) => void
  onDone: (mensaje: string) => void
}

interface Mutacion {
  mutateAsync: (input: { id: string; fkTgrado: number }) => Promise<unknown>
  reset: () => void
  isPending: boolean
  error: unknown
}

interface DialogUbicacionProps extends Omit<Props, "reserva"> {
  reserva: ReservaCupo
  titulo: ReactNode
  subtitulo: ReactNode
  /** Quita la ubicación actual (Cambiar jornada o sede). */
  excluirActual?: boolean
  jornadaInicial?: string
  /** Efecto de la acción; se reemplaza por `sinOpciones` si no hay cupo. */
  aviso: ReactNode
  sinOpciones: string
  boton: string
  icono: ReactNode
  exito: (destino: UbicacionReserva) => string
  enviar: Mutacion
}

/**
 * Cambiar jornada o sede, Reservar cupo y Aceptar traslado (Reglas 33 y 3.2.1) eligen lo mismo: la
 * jornada y la sede con cupo en el grado de la reserva. `GET /reservas-cupo/:ID/ubicaciones` las da
 * (en el destino si quien pide responde el traslado) y el back recibe el grado de esa sede y jornada.
 */
function DialogUbicacion({
  reserva,
  onOpenChange,
  onDone,
  titulo,
  subtitulo,
  excluirActual = false,
  jornadaInicial = "",
  aviso,
  sinOpciones: mensajeSinOpciones,
  boton,
  icono,
  exito,
  enviar,
}: DialogUbicacionProps) {
  const ubicaciones = useUbicacionesReservaQuery(reserva.id)

  const destinos = (ubicaciones.data ?? []).filter(
    (u) =>
      u.cupoDisponible > 0 &&
      !(excluirActual && u.fkTsede === reserva.fkTsede && u.fkTlvJornada === reserva.fkTlvJornada),
  )
  const buscar = (jornada: string, sede: string): UbicacionReserva | undefined =>
    destinos.find((u) => String(u.fkTlvJornada) === jornada && String(u.fkTsede) === sede)

  const form = useAppForm({
    defaultValues: { jornada: jornadaInicial, sede: "" },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const destino = buscar(value.jornada, value.sede)
      if (!destino) return
      try {
        await enviar.mutateAsync({ id: reserva.id, fkTgrado: destino.fkTgrado })
      } catch {
        return // El banner del modal muestra el error.
      }
      onDone(exito(destino))
      cerrar()
    },
  })

  // La mutación vive fuera del modal: al cerrar se limpia su error.
  function cerrar() {
    enviar.reset()
    onOpenChange(false)
  }

  const jornadas = [...new Map(destinos.map((u) => [String(u.fkTlvJornada), u.jornada]))].map(
    ([value, label]) => ({ value, label }),
  )
  const sinOpciones = ubicaciones.isSuccess && destinos.length === 0

  return (
    <Dialog open onOpenChange={(open) => !open && !enviar.isPending && cerrar()}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
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
          <ErrorNoticeBanner error={enviar.error ?? ubicaciones.error} />
          <div className="grid gap-4 sm:grid-cols-3">
            <CampoLectura id="ubicacion-grado" label="Grado" value={reserva.grado} />
            <form.AppField
              name="jornada"
              listeners={{ onChange: () => form.setFieldValue("sede", "") }}
            >
              {(f) => (
                <f.SelectField
                  label="Jornada"
                  required
                  disabled={ubicaciones.isPending || sinOpciones}
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
                        .map((u) => ({
                          value: String(u.fkTsede),
                          label: `${u.sede} (${u.cupoDisponible} ${u.cupoDisponible === 1 ? "cupo" : "cupos"})`,
                        }))}
                    />
                  )}
                </form.AppField>
              )}
            </form.Subscribe>
          </div>
          {sinOpciones ? <Aviso tono="info">{mensajeSinOpciones}</Aviso> : aviso}
          <p className="text-xs text-muted-foreground">
            Los campos marcados con * son obligatorios
          </p>
        </form>

        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={enviar.isPending} onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={enviar.isPending || sinOpciones}>
            {enviar.isPending ? <Spinner data-icon="inline-start" /> : icono}
            {boton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** "Séptimo · IE Central · Mañana"; una Sin continuidad no tiene sede ni jornada. */
const ubicacionActual = (r: ReservaCupo) => [r.grado, r.jornada, r.sede].filter(Boolean).join(" · ")

/** Cambiar jornada o sede (Regla 33): mismo grado, otra jornada o sede del establecimiento con cupo. */
export function CambiarJornadaSedeDialog({ reserva, ...props }: Props) {
  const cambiar = useCambiarJornadaSede()
  if (!reserva) return null
  const r = reserva
  // `key`: cada reserva abre el formulario limpio, con su jornada actual.
  return (
    <DialogUbicacion
      key={r.id}
      {...props}
      reserva={r}
      titulo={<>Cambiar jornada o sede — {r.estudiante}</>}
      subtitulo={
        <>
          Hoy: {ubicacionActual(r)}
          <EstadoReservaBadge estado={r.estado} />
        </>
      }
      excluirActual
      jornadaInicial={r.fkTlvJornada != null ? String(r.fkTlvJornada) : ""}
      aviso={
        <Aviso tono="warning">
          La constancia de reserva vigente quedará Anulada; genere una nueva para el acudiente.
        </Aviso>
      }
      sinOpciones={`No hay otra jornada ni sede con cupo en ${r.grado} en este momento.`}
      boton="Cambiar"
      icono={<ArrowsLeftRightIcon data-icon="inline-start" />}
      exito={(d) => `Se cambió la reserva de ${r.estudiante} a ${d.jornada} · ${d.sede}.`}
      enviar={cambiar}
    />
  )
}

/**
 * Reservar cupo (Regla 33) de una Sin continuidad: el establecimiento le reserva cupo cuando lo hay.
 * Si no lo hay, el estudiante sigue en la redistribución (Sección 3.5).
 */
export function ReservarCupoDialog({ reserva, ...props }: Props) {
  const reservar = useReservarCupo()
  if (!reserva) return null
  const r = reserva
  return (
    <DialogUbicacion
      key={r.id}
      {...props}
      reserva={r}
      titulo={<>Reservar cupo — {r.estudiante}</>}
      subtitulo={
        <>
          {r.grado}
          <EstadoReservaBadge estado={r.estado} />
        </>
      }
      aviso={
        <Aviso tono="info">
          La reserva pasará a Reservada en la jornada y sede elegidas y se notificará al acudiente.
          Si el estudiante tenía una ubicación propuesta por la entidad territorial, se retira.
        </Aviso>
      }
      sinOpciones={`No hay cupo en ${r.grado} en ninguna jornada y sede. El estudiante sigue en la redistribución de la entidad territorial.`}
      boton="Reservar cupo"
      icono={<ArmchairIcon data-icon="inline-start" />}
      exito={(d) => `Se reservó el cupo de ${r.estudiante} en ${d.jornada} · ${d.sede}.`}
      enviar={reservar}
    />
  )
}

/**
 * Aceptar traslado (Sección 3.2.1), en el destino: la jornada y la sede con cupo en el grado vigente de
 * la reserva del origen. Crea la reserva aquí y libera la del origen.
 */
export function AceptarTrasladoDialog({ reserva, ...props }: Props) {
  const aceptar = useAceptarTraslado()
  if (!reserva) return null
  const r = reserva
  return (
    <DialogUbicacion
      key={r.id}
      {...props}
      reserva={r}
      titulo={
        <>
          Aceptar traslado — {r.estudiante}
          {r.establecimientoOrigen ? ` desde ${r.establecimientoOrigen}` : ""}
        </>
      }
      subtitulo={<>Grado solicitado: {r.grado}</>}
      aviso={
        <Aviso tono="info">
          Se crea la reserva en este establecimiento y se libera la del origen.
        </Aviso>
      }
      sinOpciones={`No se puede aceptar el traslado porque no hay cupo en ${r.grado} en ninguna jornada y sede.`}
      boton="Aceptar traslado"
      icono={<CheckIcon data-icon="inline-start" />}
      exito={(d) =>
        `Se aceptó el traslado de ${r.estudiante}: su reserva quedó en ${d.jornada} · ${d.sede}.`
      }
      enviar={aceptar}
    />
  )
}
