import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { CheckIcon, ChatCircleDotsIcon, ChatCircleTextIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

import { ArchivoImage } from "@/features/files/components/archivo-image"
import { useNotaEstudianteQuery } from "@/features/planeador/api/query/use-nota-estudiante-query"
import { useObservarEstudianteMutation } from "@/features/planeador/api/mutations/use-observar-estudiante"
import { OBSERVACION_MAX_CARACTERES } from "@/features/planeador/lib/observacion"
import type { CeldaEvidencia } from "@/features/planeador/api/types/planilla"

interface CeldaObservacionPopoverProps {
  pkTactividadEstudiante: number
  /** `yyyy-MM-dd` — `PlanillaCelda.fechaAsistencia`: el día con asistencia
   *  válida de ESE estudiante. `null` = no hay ninguno y el backend va a
   *  rechazar la observación, así que no se deja abrir. */
  fecha: string | null
  estudianteNombre: string
  /** Lo que ya trae la celda — evita esperar el `GET .../nota` para saber si
   *  el estudiante tiene o no observación. */
  observacionActual: string | null
  evidenciasActuales: CeldaEvidencia[]
  /** Para las vistas que no viven de la query de la Planilla (la de detalle
   *  de una actividad) — la invalidación propia de la mutación no las
   *  alcanza. */
  onGuardado?: () => void
}

/**
 * Popover de observación de UNA celda (estudiante × actividad formativa).
 * Es el gemelo de `CeldaNotaPopover` para el caso sin nota: mismo
 * comportamiento autocontenido (precarga lo guardado, guarda directo contra
 * el backend y deja que la invalidación refresque la grilla), pero contra
 * `PUT .../observar`.
 *
 * Las imágenes ya adjuntas se muestran, pero no se pueden agregar desde acá:
 * el binario lo sube el file-service antes (`POST /api/files/**`) y ese
 * empalme todavía no está hecho — mandar `EVIDENCIAS` ausente deja intactas
 * las que haya.
 */
export function CeldaObservacionPopover({
  pkTactividadEstudiante,
  fecha,
  estudianteNombre,
  observacionActual,
  evidenciasActuales,
  onGuardado,
}: CeldaObservacionPopoverProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const { notify } = useNotify()

  const { data: notaActual } = useNotaEstudianteQuery(open ? pkTactividadEstudiante : undefined)

  useEffect(() => {
    if (open) setDraft(notaActual?.observacion ?? observacionActual ?? "")
  }, [open, notaActual, observacionActual])

  const observar = useObservarEstudianteMutation({
    mutationConfig: {
      onSuccess: () => {
        notify("Observación guardada.")
        setOpen(false)
        onGuardado?.()
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  const evidencias = notaActual?.evidencias.length ? notaActual.evidencias : evidenciasActuales
  const tieneObservacion = Boolean(observacionActual?.trim())
  const Icono = tieneObservacion ? ChatCircleTextIcon : ChatCircleDotsIcon
  const etiqueta = tieneObservacion
    ? `Editar la observación de ${estudianteNombre}`
    : `Observar a ${estudianteNombre}`

  function guardar() {
    if (!fecha || !draft.trim()) return
    observar.mutate({ pkTactividadEstudiante, observacion: draft.trim(), fecha })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-xs"
                  disabled={fecha === null}
                  aria-label={etiqueta}
                />
              }
            />
          }
        >
          <Icono className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>
          {fecha === null ? `Sin asistencia registrada para ${estudianteNombre}` : etiqueta}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" side="bottom" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Observación: {estudianteNombre}</PopoverTitle>
        </PopoverHeader>

        <Field variant="outlined">
          <FieldLabel>Observación</FieldLabel>
          <Textarea
            value={draft}
            maxLength={OBSERVACION_MAX_CARACTERES}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Qué se observó en el desempeño del estudiante"
            rows={5}
          />
          <span className="text-muted-foreground self-end text-xs">
            {draft.length}/{OBSERVACION_MAX_CARACTERES}
          </span>
        </Field>

        {evidencias.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-muted-foreground text-xs">Evidencias</p>
            <div className="flex flex-wrap gap-2">
              {evidencias.map((evidencia) => (
                <ArchivoImage
                  key={evidencia.pk}
                  archivoId={evidencia.fkTarchivo}
                  alt={evidencia.nombre ?? `Evidencia de ${estudianteNombre}`}
                  className="size-16"
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="fill"
            color="primary"
            size="sm"
            disabled={!draft.trim() || observar.isPending}
            onClick={guardar}
          >
            {observar.isPending ? (
              <SpinnerIcon className="animate-spin" data-icon="inline-start" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
          <Button variant="fill" color="neutral" size="sm" onClick={() => setOpen(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
