import { useState } from "react"
import { z } from "zod"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { TituloConAyuda } from "@/components/titulo-con-ayuda"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PaperPlaneTiltIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, minLength, required } from "@/lib/forms/messages"

import { useResponderOrientacion } from "@/features/establishment/institution/api/mutations/responder-orientacion"
import type { OrientacionRecibida } from "@/features/establishment/institution/api/types/orientacion"
import { OrientacionResumen } from "@/features/establishment/institution/components/orientaciones/orientacion-resumen"
import {
  AYUDA_SIN_DATOS_SENSIBLES,
  enviadaTexto,
  RESPUESTA_MAX,
  RESPUESTA_MIN,
} from "@/features/establishment/institution/utils/orientaciones"

const FORM_ID = "form-responder-orientacion"

const schema = z.object({
  respuesta: z
    .string()
    .trim()
    .min(1, required("La respuesta", { femenino: true }))
    .min(RESPUESTA_MIN, minLength(RESPUESTA_MIN, "La respuesta"))
    .max(RESPUESTA_MAX, maxLength(RESPUESTA_MAX, "La respuesta")),
})

interface DialogResponderOrientacionProps {
  /** null = cerrado. */
  orientacion: OrientacionRecibida | null
  onClose: () => void
}

/** Modal «Responder orientación — [Tema]» (E.1.ORI.2; informe, 2.3). Lo abre la pestaña. */
export function DialogResponderOrientacion({
  orientacion,
  onClose,
}: DialogResponderOrientacionProps) {
  // Se monta en cada apertura: el formulario arranca vacío.
  if (!orientacion) return null
  return <ResponderContent key={orientacion.id} orientacion={orientacion} onClose={onClose} />
}

function ResponderContent({
  orientacion,
  onClose,
}: {
  orientacion: OrientacionRecibida
  onClose: () => void
}) {
  const { notify } = useNotify()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const responder = useResponderOrientacion()
  const busy = responder.isPending

  const form = useAppForm({
    defaultValues: { respuesta: "" },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      try {
        await responder.mutateAsync({ id: orientacion.id, respuesta: value.respuesta.trim() })
        onClose()
        notify("Respuesta enviada.", { variant: "success" })
      } catch (error) {
        setNotice({ id: Date.now(), message: getErrorMessage(error) })
      }
    },
  })

  function requestClose() {
    if (busy) return
    if (form.state.values.respuesta.trim()) {
      setConfirmDiscardOpen(true)
      return
    }
    onClose()
  }

  return (
    // Escape y click afuera pasan por la confirmación de descarte.
    <Dialog open onOpenChange={(next) => !next && requestClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>Responder orientación — {orientacion.tema}</DialogTitle>
          <DialogDescription>{enviadaTexto(orientacion)}</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <OrientacionResumen filas={[{ label: "Orientación", value: orientacion.orientacion }]} />
        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <form.AppField name="respuesta">
            {(f) => (
              <f.TextareaField
                label={<TituloConAyuda titulo="Respuesta" ayuda={AYUDA_SIN_DATOS_SENSIBLES} />}
                required
                maxLength={RESPUESTA_MAX}
                placeholder="Qué hizo el establecimiento con esta orientación"
                disabled={busy}
              />
            )}
          </form.AppField>
        </form>
        <DialogFooter className="sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">
            Los campos marcados con * son obligatorios
          </p>
          <Button
            size="sm"
            type="button"
            variant="outline"
            color="neutral"
            disabled={busy}
            onClick={requestClose}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            size="sm"
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <PaperPlaneTiltIcon data-icon="inline-start" />
            )}
            Responder
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onClose()
        }}
      />
    </Dialog>
  )
}
