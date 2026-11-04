import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { InfoIcon, ProhibitIcon, SpinnerIcon } from "@/components/ui/icons"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useAnularAnotacion } from "@/features/gestion-estudiantil/observador/api/mutations/anotaciones"
import { colorDeTipo, formatFecha, MENSAJES } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import type { AnotacionRow } from "@/features/gestion-estudiantil/observador/api/types"

const MAX_MOTIVO = 1000

interface DialogAnularAnotacionProps {
  anotacion: AnotacionRow | null
  onClose: () => void
}

/** Modal "Anular [registro]" (G.1.ANU.1, Regla 3): motivo obligatorio; la anotación se conserva con la marca. */
export function DialogAnularAnotacion({ anotacion, onClose }: DialogAnularAnotacionProps) {
  const { notify } = useNotify()
  const [motivo, setMotivo] = useState("")
  const [intento, setIntento] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const anular = useAnularAnotacion({
    mutationConfig: {
      onSuccess: () => {
        notify(MENSAJES.anulada, { variant: "success" })
        cerrar()
      },
      onError: (error) => setNotice({ id: Date.now(), message: getErrorMessage(error) }),
    },
  })

  function cerrar() {
    setMotivo("")
    setIntento(false)
    setNotice(null)
    onClose()
  }

  const sinMotivo = !motivo.trim()

  function handleAnular() {
    setIntento(true)
    if (sinMotivo || !anotacion) return
    anular.mutate({ id: anotacion.id, motivo })
  }

  return (
    <Dialog open={anotacion != null} onOpenChange={(open) => !open && !anular.isPending && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Anular anotación — {anotacion?.estudiante_nombre}</DialogTitle>
          {anotacion && (
            <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{formatFecha(anotacion.fecha)} ·</span>
              <span className="font-semibold text-foreground">
                {anotacion.codigo} · {anotacion.descripcion}
              </span>
              <Badge variant="soft" color={colorDeTipo(anotacion.tipo_nombre)}>
                {anotacion.tipo_nombre}
              </Badge>
              {anotacion.responsable_nombre && <span>· {anotacion.responsable_nombre}</span>}
            </DialogDescription>
          )}
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />

        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="anular-motivo">
            Motivo*
          </FieldLabel>
          <Textarea
            id="anular-motivo"
            rows={3}
            className={TEXTAREA_OUTLINED}
            maxLength={MAX_MOTIVO}
            placeholder="Por qué se anula la anotación"
            value={motivo}
            aria-invalid={intento && sinMotivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="flex justify-between">
            {intento && sinMotivo ? <FieldError>El motivo es obligatorio.</FieldError> : <span />}
            <CharacterCounter value={motivo} max={MAX_MOTIVO} />
          </div>
        </Field>

        <Alert>
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
            La anotación se conserva con la marca Anulada, pero no saldrá en el boletín ni en el portal del
            acudiente, ni contará como señal de riesgo.
          </AlertDescription>
            </Alert>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="muted" />}>
            Cancelar
          </DialogClose>
          <Button size="sm" type="button" color="destructive" disabled={anular.isPending} onClick={handleAnular}>
            {anular.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <ProhibitIcon data-icon="inline-start" />
            )}
            Anular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
