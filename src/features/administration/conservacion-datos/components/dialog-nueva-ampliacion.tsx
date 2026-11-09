import { useState } from "react"

import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { SelectCampo } from "@/features/administration/conservacion-datos/components/select-campo"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { toDigitsOnly } from "@/lib/text-input"

import { useSaveAmpliacion } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import type { Ampliacion } from "@/features/administration/conservacion-datos/api/types"

export const PLAZO_MENOR_MENSAJE = "El plazo del establecimiento no puede ser menor que el plazo mínimo."

/** + Ampliación: tipo de registro (políticas activas no permanentes) y plazo del establecimiento. */
export function DialogNuevaAmpliacion({
  filas,
  pkEstablecimiento,
  onClose,
}: {
  filas: Ampliacion[]
  pkEstablecimiento: number | null
  onClose: () => void
}) {
  const { notify } = useNotify()
  const [pkPolitica, setPkPolitica] = useState<number | null>(null)
  const [plazo, setPlazo] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const elegida = filas.find((f) => f.pkPolitica === pkPolitica)

  const save = useSaveAmpliacion({
    mutationConfig: {
      onSuccess: () => {
        notify(SUCCESS_MESSAGES.ampliacion.created)
        onClose()
      },
      // 409: «Ya existe una ampliación para ese tipo de registro.»
      onError: (err) => setNotice({ id: Date.now(), message: getErrorMessage(err) }),
    },
  })

  function guardar() {
    const n = Number(plazo)
    if (!elegida) return setError("Seleccione el tipo de registro.")
    if (!plazo || n > 99) return setError("Escriba un plazo de hasta 99 años.")
    if (n < elegida.plazoMinimo) return setError(PLAZO_MENOR_MENSAJE)
    setError(null)
    save.mutate({ pkAmpliacion: null, pkPolitica: elegida.pkPolitica, pkEstablecimiento, plazo: n })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva ampliación</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <div className="flex flex-col gap-4">
          <SelectCampo
            id="ampliacion-tipo"
            label="Tipo de registro"
            required
            value={pkPolitica != null ? String(pkPolitica) : ""}
            options={filas.map((f) => ({ value: String(f.pkPolitica), label: f.tipoRegistro }))}
            onChange={(v) => setPkPolitica(v ? Number(v) : null)}
          />
          <Field variant="outlined" data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="ampliacion-plazo">
              Plazo del establecimiento (años)<span className="text-red"> *</span>
            </FieldLabel>
            <Input
              id="ampliacion-plazo"
              inputMode="numeric"
              value={plazo}
              aria-invalid={error ? true : undefined}
              placeholder={elegida ? `Desde ${elegida.plazoMinimo}` : "Hasta 99"}
              onChange={(e) => setPlazo(toDigitsOnly(e.target.value, 2))}
            />
            {error ? (
              <FieldError>{error}</FieldError>
            ) : elegida ? (
              <FieldDescription>
                Mínimo de la política: {elegida.plazoMinimo} años. Solo se puede alargar.
              </FieldDescription>
            ) : null}
          </Field>
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" color="neutral" disabled={save.isPending} onClick={onClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" color="primary" disabled={save.isPending} onClick={guardar}>
            {save.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
