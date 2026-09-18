import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { ArrowLeftIcon, SpinnerIcon } from "@/components/ui/icons"

import { useObservarGrupalMutation } from "@/features/planeador/api/mutations/use-observar-estudiante"
import { OBSERVACION_MAX_CARACTERES } from "@/features/planeador/lib/observacion"

interface ObservarActividadGrupalProps {
  actividadId: number
  titulo: string
  /** `yyyy-MM-dd` — fecha propuesta: el día con asistencia válida que
   *  comparte la mayoría del grupo (`PlanillaCelda.fechaAsistencia`). */
  fechaSugerida: string
  /** Cuántos estudiantes tiene la actividad asignados, para contrastar con
   *  los que el backend termina observando. */
  totalEstudiantes: number
  onVolver: () => void
}

/**
 * Observación en bloque de una actividad formativa
 * (`POST .../observar-grupal`). Ocupa el mismo lugar que
 * `CalificarActividadBulk` —se llega desde el botón del header de la columna
 * y se vuelve con la flecha—, pero no lista estudiantes: el endpoint aplica
 * el texto a TODO el roster y omite en silencio a quien no tenga asistencia
 * válida en `fecha`, de ahí que el resultado se contraste con el total.
 *
 * La observación individual pisa a la grupal, así que se puede corregir caso
 * por caso desde la grilla después de aplicarla.
 */
export function ObservarActividadGrupal({
  actividadId,
  titulo,
  fechaSugerida,
  totalEstudiantes,
  onVolver,
}: ObservarActividadGrupalProps) {
  const [observacion, setObservacion] = useState("")
  const [fecha, setFecha] = useState(fechaSugerida)
  const { notify } = useNotify()

  const observarGrupal = useObservarGrupalMutation({
    mutationConfig: {
      onSuccess: ({ observados }) => {
        if (observados !== null && observados < totalEstudiantes) {
          notify(
            `Observación aplicada a ${observados} de ${totalEstudiantes} estudiantes — el resto no tiene asistencia registrada el ${fecha}.`,
            { variant: "info" },
          )
        } else {
          notify("Observación aplicada al grupo.")
        }
        onVolver()
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-md border bg-card p-3">
      <div className="flex items-center gap-2 border-b pb-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                onClick={onVolver}
                aria-label="Volver a la planilla"
              />
            }
          >
            <ArrowLeftIcon className="size-6" />
          </TooltipTrigger>
          <TooltipContent>Volver a la planilla</TooltipContent>
        </Tooltip>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">Observación grupal: {titulo}</h2>
          <p className="text-muted-foreground text-xs">
            Actividad formativa, se registra una observación.
          </p>
        </div>
      </div>

      <Field variant="outlined">
        <FieldLabel htmlFor="observacion-grupal">Observación</FieldLabel>
        <Textarea
          id="observacion-grupal"
          value={observacion}
          maxLength={OBSERVACION_MAX_CARACTERES}
          onChange={(event) => setObservacion(event.target.value)}
          placeholder="Qué se observó en el desempeño del grupo"
          rows={6}
        />
        <span className="text-muted-foreground self-end text-xs">
          {observacion.length}/{OBSERVACION_MAX_CARACTERES}
        </span>
      </Field>

      <Field variant="outlined">
        <FieldLabel htmlFor="fecha-observacion-grupal">Fecha</FieldLabel>
        <Input
          id="fecha-observacion-grupal"
          type="date"
          value={fecha}
          onChange={(event) => setFecha(event.target.value)}
        />
      </Field>

      <div className="mt-auto flex items-center justify-between rounded-md border bg-card px-4 py-3">
        <p className="text-muted-foreground text-sm">
          Se aplicará a los {totalEstudiantes} estudiantes asignados con asistencia registrada ese
          día.
        </p>
        <Button
          variant="fill"
          color="primary"
          size="sm"
          disabled={!observacion.trim() || !fecha || observarGrupal.isPending}
          onClick={() =>
            observarGrupal.mutate({ actividadId, observacion: observacion.trim(), fecha })
          }
        >
          {observarGrupal.isPending && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
          Guardar
        </Button>
      </div>
    </div>
  )
}
