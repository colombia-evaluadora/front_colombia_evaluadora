import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/date-picker"
import { Field, FieldLabel } from "@/components/ui/field"
import { TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { Textarea } from "@/components/ui/textarea"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { ArrowLeftIcon, CheckIcon, SpinnerIcon, WarningCircleIcon, XIcon } from "@/components/ui/icons"

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
  /** Cuántos de esos estudiantes YA tienen una observación individual
   *  guardada. El backend (`fn_actividad_observar_grupal`) no distingue: al
   *  guardar acá pisa la de TODOS por igual, sin importar si era una nota
   *  personalizada. Mientras no exista una observación de grupo separada de
   *  la individual (pendiente de backend), esto solo se puede advertir. */
  estudiantesConObservacionPrevia: number
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
 * por caso desde la grilla después de aplicarla — pero no al revés: no hay
 * una observación de grupo separada de la del estudiante (pendiente de
 * backend), así que volver a guardar acá borra cualquier nota individual ya
 * escrita. Por eso se avisa antes de guardar cuando hay alguna en riesgo.
 */
export function ObservarActividadGrupal({
  actividadId,
  titulo,
  fechaSugerida,
  totalEstudiantes,
  estudiantesConObservacionPrevia,
  onVolver,
}: ObservarActividadGrupalProps) {
  const [observacion, setObservacion] = useState("")
  const [fecha, setFecha] = useState(fechaSugerida)
  const [confirmando, setConfirmando] = useState(false)
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

  function guardar() {
    setConfirmando(false)
    observarGrupal.mutate({ actividadId, observacion: observacion.trim(), fecha })
  }

  function intentarGuardar() {
    if (estudiantesConObservacionPrevia > 0) {
      setConfirmando(true)
      return
    }
    guardar()
  }

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

      {estudiantesConObservacionPrevia > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800 after:bg-amber-500 [&>svg]:text-amber-600">
          <WarningCircleIcon />
          <AlertDescription>
            {estudiantesConObservacionPrevia === 1
              ? "1 estudiante de este grupo ya tiene una observación individual guardada."
              : `${estudiantesConObservacionPrevia} estudiantes de este grupo ya tienen una observación individual guardada.`}{" "}
            Guardar acá se la reemplaza a todos por este mismo texto — no hay forma de conservarla
            aparte todavía.
          </AlertDescription>
        </Alert>
      )}

      <Field variant="outlined">
        <FieldLabel htmlFor="observacion-grupal">Observación</FieldLabel>
        <Textarea
          id="observacion-grupal"
          value={observacion}
          maxLength={OBSERVACION_MAX_CARACTERES}
          onChange={(event) => setObservacion(event.target.value)}
          placeholder="Qué se observó en el desempeño del grupo"
          rows={6}
          className={TEXTAREA_OUTLINED}
        />
        <span className="text-muted-foreground self-end text-xs">
          {observacion.length}/{OBSERVACION_MAX_CARACTERES}
        </span>
      </Field>

      <Field variant="outlined">
        <FieldLabel htmlFor="fecha-observacion-grupal">Fecha</FieldLabel>
        <DatePicker
          id="fecha-observacion-grupal"
          value={parseDateValue(fecha)}
          onChange={(date) => setFecha(formatDateValue(date))}
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
          onClick={intentarGuardar}
        >
          {observarGrupal.isPending && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
          Guardar
        </Button>
      </div>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reemplazar observaciones individuales?</AlertDialogTitle>
            <AlertDialogDescription>
              {estudiantesConObservacionPrevia === 1
                ? "1 estudiante"
                : `${estudiantesConObservacionPrevia} estudiantes`}{" "}
              de este grupo ya tiene{estudiantesConObservacionPrevia === 1 ? "" : "n"} una
              observación individual guardada. Al guardar la observación grupal se pierde ese texto
              y queda reemplazado por el mismo para todos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction color="destructive" onClick={guardar}>
              <CheckIcon data-icon="inline-start" />
              Reemplazar de todas formas
            </AlertDialogAction>
            <AlertDialogCancel variant="fill" color="neutral">
              <XIcon data-icon="inline-start" />
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
