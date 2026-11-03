import { forwardRef, useEffect, useImperativeHandle, useState } from "react"

import { Input } from "@/components/ui/input"
import type { NotifyOptions } from "@/components/notice/pending-notice"
import { getErrorMessage } from "@/lib/api-client"
import { toDigitsOnly } from "@/lib/text-input"

import {
  usePlazoAvisoAsistenciaQuery,
  useSavePlazoAvisoAsistencia,
} from "@/features/establishment/academic-period/api/query/use-plazo-aviso-asistencia"

type Notifier = (message: string, options?: NotifyOptions) => void

// Lo usa el Guardar del encabezado del período, como Criterios de evaluación.
// `save` avisa con el `notify` de la página y devuelve false si el valor no
// es válido o si el back rechazó.
export interface PlazoAvisoAsistenciaHandle {
  save: (notify: Notifier) => Promise<boolean>
  isDirty: () => boolean
  discard: () => void
}

interface PlazoAvisoAsistenciaFieldProps {
  academicPeriodId: number
  readOnly: boolean
  onDirtyChange?: (dirty: boolean) => void
}

/** Regla 109.3: "Plazo del aviso de asistencia sin registrar", en días hábiles
 *  (0 a 30, 2 por defecto). Pasado el plazo, la clase Pendiente avisa al
 *  Responsable de enseñanza y al Supervisor de sede. */
export const PlazoAvisoAsistenciaField = forwardRef<
  PlazoAvisoAsistenciaHandle,
  PlazoAvisoAsistenciaFieldProps
>(function PlazoAvisoAsistenciaField({ academicPeriodId, readOnly, onDirtyChange }, ref) {
  const { data: plazo, isPending } = usePlazoAvisoAsistenciaQuery(academicPeriodId)
  const save = useSavePlazoAvisoAsistencia(academicPeriodId)
  const [draft, setDraft] = useState<string | null>(null)
  const valor = draft ?? (plazo != null ? String(plazo) : "")
  const numero = Number(valor)
  const invalido = valor === "" || numero > 30
  const cambiado = draft != null && numero !== plazo

  useEffect(() => {
    onDirtyChange?.(cambiado)
  }, [cambiado, onDirtyChange])
  // Al desmontar (cambio de período) ya no hay nada pendiente.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange])

  useImperativeHandle(ref, () => ({
    save: async (notify) => {
      if (!cambiado) return true
      if (invalido) {
        notify("El plazo del aviso de asistencia debe estar entre 0 y 30 días hábiles.", {
          variant: "error",
        })
        return false
      }
      try {
        await save.mutateAsync(numero)
        setDraft(null)
        notify("Se actualizó el plazo del aviso de asistencia.", { variant: "success" })
        return true
      } catch (error) {
        notify(getErrorMessage(error), { variant: "error" })
        return false
      }
    },
    isDirty: () => cambiado,
    discard: () => setDraft(null),
  }))

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="plazo-aviso-asistencia" className="text-muted-foreground">
        Plazo del aviso de asistencia sin registrar
      </label>
      {/* Resaltado: es el único valor editable de la frase. Se guarda con el Guardar del período.
          `type="number"` (con flechas) vale aquí: PLAZO_AVISO_ASISTENCIA es SMALLINT, no VARCHAR. */}
      <Input
        id="plazo-aviso-asistencia"
        type="number"
        min={0}
        max={30}
        step={1}
        variant="outlined"
        className="h-7 w-14 border-primary/40 bg-primary/5 px-1.5 py-0 text-sm font-semibold text-primary tabular-nums"
        inputMode="numeric"
        value={valor}
        disabled={readOnly || isPending || save.isPending}
        aria-invalid={invalido || undefined}
        onChange={(e) => setDraft(toDigitsOnly(e.target.value, 2))}
      />
      <span className="text-muted-foreground">días hábiles</span>
      {invalido && draft != null && <span className="text-xs text-red">Entre 0 y 30 días hábiles.</span>}
    </div>
  )
})
