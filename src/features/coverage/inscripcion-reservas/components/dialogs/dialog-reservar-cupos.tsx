import { useState } from "react"

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
import {
  ArmchairIcon,
  CheckCircleIcon,
  CheckIcon,
  InfoIcon,
  WarningIcon,
  XIcon,
} from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"

import { useReservarCupos } from "@/features/coverage/inscripcion-reservas/api/mutations/reservar-cupos"
import {
  formatPeriodo,
  usePeriodosInscripcionesQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"
import type { ReservarCuposResumen } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

function textoOmitidos(o: ReservarCuposResumen["omitidos"]) {
  const partes = [
    o.conReserva && `${o.conReserva} ya tenían reserva`,
    o.sinGradoSiguiente && `${o.sinGradoSiguiente} sin grado siguiente`,
    o.sinPeriodoContinuidad && `${o.sinPeriodoContinuidad} sin período de continuidad`,
    o.noRenovacion && `${o.noRenovacion} con No renovación del cupo`,
  ].filter(Boolean)
  return `Estudiantes omitidos: ${o.total}${partes.length ? ` (${partes.join(", ")})` : ""}.`
}

/** Botón y modal de "Reservar cupos" (Cobertura, Sección 3.2, Regla 35). */
export function ReservarCuposDialog() {
  const [open, setOpen] = useState(false)
  // `null` = todavía no se tocó: por defecto van todos los períodos.
  const [elegidos, setElegidos] = useState<string[] | null>(null)
  const [resumen, setResumen] = useState<ReservarCuposResumen | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      setError(null)
    }
  }

  function toggle(id: string, checked: boolean) {
    setElegidos(checked ? [...seleccion, id] : seleccion.filter((x) => x !== id))
  }

  function handleSubmit() {
    setError(null)
    reservar.mutate(
      { periodoIds: seleccion },
      { onSuccess: setResumen, onError: (e) => setError(getErrorMessage(e)) },
    )
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ArmchairIcon data-icon="inline-start" />
        Reservar cupos
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg" showCloseButton={!resumen}>
          {resumen ? (
            <>
              <DialogHeader>
                <DialogTitle>Reservar cupos — Resumen</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <Aviso tono="success" icon={CheckCircleIcon}>
                  Reservas creadas: {resumen.creadas}.
                </Aviso>
                {resumen.sinContinuidad > 0 && (
                  <Aviso tono="warning" icon={WarningIcon}>
                    Reservas Sin continuidad: {resumen.sinContinuidad}.
                  </Aviso>
                )}
                {resumen.omitidos.total > 0 && (
                  <Aviso tono="info" icon={InfoIcon}>
                    {textoOmitidos(resumen.omitidos)}
                  </Aviso>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => handleOpenChange(false)}>
                  <CheckIcon data-icon="inline-start" />
                  Entendido
                </Button>
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
                    No hay períodos en Inscripciones. Las reservas se crean cuando un Período
                    Académico pasa a Inscripciones.
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
                          {p.sede} · {p.jornada} · {formatPeriodo(p)}
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

              {error && <p className="text-sm text-red">{error}</p>}

              <p className="text-xs text-muted-foreground">
                Los campos marcados con * son obligatorios
              </p>

              <DialogFooter>
                <Button
                  variant="outline"
                  color="neutral"
                  disabled={reservar.isPending}
                  onClick={() => handleOpenChange(false)}
                >
                  <XIcon data-icon="inline-start" />
                  Cancelar
                </Button>
                <Button disabled={!seleccion.length || reservar.isPending} onClick={handleSubmit}>
                  {reservar.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <ArmchairIcon data-icon="inline-start" />
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
