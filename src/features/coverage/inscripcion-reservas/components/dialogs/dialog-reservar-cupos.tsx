import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArmchairIcon, CalendarPlusIcon, CheckCircleIcon, InfoIcon } from "@/components/ui/icons"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

import { useReservarCupos } from "@/features/coverage/inscripcion-reservas/api/mutations/reservar-cupos"
import { usePeriodosInscripcionesQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import {
  Aviso,
  EstadoReservaBadge,
} from "@/features/coverage/inscripcion-reservas/components/reserva-ui"
import type { ReservarCuposResumen } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

/** Botón y modal de "Reservar cupos" (Cobertura, Sección 3.2, Regla 35). */
export function ReservarCuposDialog() {
  const [open, setOpen] = useState(false)
  // `null` = todavía no se tocó: por defecto van todos los períodos.
  const [elegidos, setElegidos] = useState<string[] | null>(null)
  // El resumen lleva cuántos períodos se procesaron (el back no los devuelve).
  const [resumen, setResumen] = useState<(ReservarCuposResumen & { periodos: number }) | null>(null)

  const { data: periodos, isPending } = usePeriodosInscripcionesQuery()
  const reservar = useReservarCupos()

  const todosIds = periodos?.map((p) => p.id) ?? []
  const seleccion = elegidos ?? todosIds
  const todos = todosIds.length > 0 && seleccion.length === todosIds.length

  function handleOpenChange(next: boolean) {
    if (reservar.isPending) return
    setOpen(next)
    if (!next) {
      setElegidos(null)
      setResumen(null)
      reservar.reset()
    }
  }

  function toggle(id: string, checked: boolean) {
    setElegidos(checked ? [...seleccion, id] : seleccion.filter((x) => x !== id))
  }

  function handleSubmit() {
    reservar.mutate(
      { periodoIds: seleccion },
      {
        onSuccess: (r) => setResumen({ ...r, periodos: seleccion.length }),
      },
    )
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ArmchairIcon data-icon="inline-start" />
        Reservar cupos
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          {resumen ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircleIcon className="size-5 text-green" aria-hidden />
                  Reservas creadas
                </DialogTitle>
                <DialogDescription>
                  Se{" "}
                  {resumen.periodos === 1
                    ? "procesó 1 período"
                    : `procesaron ${resumen.periodos} períodos`}{" "}
                  en Inscripciones.
                </DialogDescription>
              </DialogHeader>
              <dl className="grid text-sm">
                <FilaResumen
                  etiqueta={
                    <>
                      Reservas creadas <EstadoReservaBadge estado="RESERVADA" />
                    </>
                  }
                  valor={resumen.creadas}
                />
                <FilaResumen
                  etiqueta={
                    <>
                      Reservas Sin continuidad <EstadoReservaBadge estado="SIN_CONTINUIDAD" />
                    </>
                  }
                  valor={resumen.sinContinuidad}
                />
              </dl>
              {resumen.omitidos.total > 0 ? (
                <div className="grid gap-1">
                  <p className="text-sm font-medium">Estudiantes omitidos</p>
                  <dl className="grid text-sm">
                    <FilaResumen etiqueta="Ya tenían reserva" valor={resumen.omitidos.conReserva} />
                    <FilaResumen
                      etiqueta="No tienen grado siguiente"
                      valor={resumen.omitidos.sinGradoSiguiente}
                    />
                    <FilaResumen
                      etiqueta="Sin período de continuidad (o no ofrece su grado siguiente)"
                      valor={resumen.omitidos.sinPeriodoContinuidad}
                    />
                    {resumen.omitidos.noRenovacion > 0 ? (
                      <FilaResumen
                        etiqueta="Con No renovación del cupo"
                        valor={resumen.omitidos.noRenovacion}
                      />
                    ) : null}
                  </dl>
                </div>
              ) : null}
              {resumen.sinContinuidad > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Las reservas Sin continuidad las resuelve el Administrador del establecimiento o
                  el Gestor administrativo del establecimiento con <em>Reservar cupo</em>.
                </p>
              ) : null}
              <DialogFooter>
                <Button onClick={() => handleOpenChange(false)}>Entendido</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Reservar cupos</DialogTitle>
                <DialogDescription>
                  Se creará la reserva, con la decisión Continúa, de los estudiantes con matrícula
                  Cursando cuyo período de continuidad esté entre los elegidos. Se omite a quien ya
                  tiene reserva.
                </DialogDescription>
              </DialogHeader>

              <fieldset className="grid gap-3">
                <legend className="mb-3 text-sm font-medium">
                  Períodos en Inscripciones <span className="text-red">*</span>
                </legend>
                {isPending ? (
                  <Skeleton className="h-28 w-full" />
                ) : !todosIds.length ? (
                  <p className="text-muted-foreground">
                    No hay períodos en Inscripciones. Las reservas se crean cuando un período
                    académico pasa a Inscripciones.
                  </p>
                ) : (
                  <>
                    <label className="flex items-center gap-2.5">
                      <Checkbox
                        checked={todos}
                        indeterminate={!todos && seleccion.length > 0}
                        onCheckedChange={(v) => setElegidos(v ? todosIds : [])}
                      />
                      Todos ({todosIds.length})
                    </label>
                    <div className="grid gap-3 pl-6">
                      {periodos?.map((p) => (
                        <label key={p.id} className="flex items-center gap-2.5">
                          <Checkbox
                            checked={seleccion.includes(p.id)}
                            onCheckedChange={(v) => toggle(p.id, !!v)}
                          />
                          {p.sede} · {p.jornada} · {p.ciclo}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </fieldset>

              <Aviso tono="info" icon={InfoIcon}>
                La reserva se busca en el grado siguiente: primero en la misma jornada y sede, luego
                en las otras jornadas de continuidad y luego en otra sede. Si no hay cupo, queda Sin
                continuidad.
              </Aviso>

              <ErrorNoticeBanner error={reservar.error} />

              <DialogFooter>
                <Button
                  variant="outline"
                  color="neutral"
                  disabled={reservar.isPending}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button disabled={!seleccion.length || reservar.isPending} onClick={handleSubmit}>
                  {reservar.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <CalendarPlusIcon data-icon="inline-start" />
                  )}
                  Reservar cupos
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Fila del resumen: etiqueta (con su badge) a la izquierda y el número a la derecha. */
function FilaResumen({ etiqueta, valor }: { etiqueta: ReactNode; valor: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <dt className="flex flex-wrap items-center gap-2">{etiqueta}</dt>
      <dd className="font-medium tabular-nums">{valor}</dd>
    </div>
  )
}
