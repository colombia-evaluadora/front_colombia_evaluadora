import { useState } from "react"

import { Button } from "@/components/ui/button"
import { CheckIcon, PencilIcon, XIcon } from "@/components/ui/icons"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { NotaCriterio } from "@/features/planeador/api/types/calificacion"
import { InstrumentoGradingFields } from "@/features/planeador/components/planilla/instrumento-grading-fields"

interface CeldaNotaPopoverProps {
  actividad: Actividad
  estudianteNombre: string
  /** Notas de este estudiante en esta actividad puntual. */
  notaActual: NotaCriterio[]
  onGuardar: (next: NotaCriterio[]) => void
}

/**
 * Popover de calificación anclado a UNA celda (estudiante × actividad): el
 * mismo formulario "volátil" de `InstrumentoGradingFields` que la pantalla
 * de calificación en bulk, pero acotado a un solo estudiante. Reemplaza al
 * `InstrumentoPopover` hardcodeado que tenía `calificaciones-view.tsx`
 * (siempre "Diseño"/"Modalidad" fijos) — ese componente se borra y pasa a
 * reusar este.
 */
export function CeldaNotaPopover({
  actividad,
  estudianteNombre,
  notaActual,
  onGuardar,
}: CeldaNotaPopoverProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NotaCriterio[]>(notaActual)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Reinicia el borrador con la nota real cada vez que se abre: si se
        // cerró sin guardar la vez anterior, no debe verse lo descartado.
        if (next) setDraft(notaActual)
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            color="neutral"
            size="icon-xs"
            aria-label={`Calificar a ${estudianteNombre}`}
          />
        }
      >
        <PencilIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Instrumento: {actividad.instrumento}</PopoverTitle>
        </PopoverHeader>

        <InstrumentoGradingFields actividad={actividad} value={draft} onChange={setDraft} />

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="fill"
            color="primary"
            size="sm"
            onClick={() => {
              onGuardar(draft)
              setOpen(false)
            }}
          >
            <CheckIcon data-icon="inline-start" />
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
