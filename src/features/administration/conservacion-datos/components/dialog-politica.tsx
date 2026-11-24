import { useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { MarcoOpciones } from "@/components/marco-opciones"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FloppyDiskIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api-client"
import { isFieldInvalid, useAppForm } from "@/lib/forms"
import { toDigitsOnly } from "@/lib/text-input"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"

import { useSavePolitica } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import { useModulosQuery } from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import {
  politicaFormSchema,
  toTipoRegistroInput,
  type PoliticaFormValues,
} from "@/features/administration/conservacion-datos/api/schema"
import {
  CUENTA_DESDE_LABELS,
  DISPOSICION_LABELS,
  type CuentaDesde,
  type Disposicion,
  type Politica,
} from "@/features/administration/conservacion-datos/api/types"

const FORM_ID = "politica-form"

/**
 * Nueva política y Modificar (S.12.POL.2 / POL.3) en un modal, a pedido: el md los pone en una pantalla
 * propia. Mismo formulario para los dos: tipo de registro, módulo, permanente, plazo mínimo, desde cuándo
 * se cuenta, disposición final y estado. Con Permanente en Sí no hay plazo, desde ni disposición.
 */
export function DialogPolitica({ politica, onClose }: { politica: Politica | null; onClose: () => void }) {
  const { notify } = useNotify()
  const [notice, setNotice] = useState<Notice | null>(null)
  const { data: modulos = [] } = useModulosQuery()
  const save = useSavePolitica()

  const defaultValues: PoliticaFormValues = {
    tipoRegistro: politica?.tipoRegistro ?? "",
    pkModulo: politica?.pkModulo ?? 0,
    permanente: politica?.permanente ?? false,
    plazoMinimo: politica?.plazoMinimo != null ? String(politica.plazoMinimo) : "",
    cuentaDesde: politica?.cuentaDesde ?? null,
    disposicion: politica?.disposicion ?? null,
    habilitado: politica?.habilitado ?? true,
  }

  const form = useAppForm({
    defaultValues,
    validators: { onChange: politicaFormSchema, onSubmit: politicaFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await save.mutateAsync({
          id: politica?.pkPolitica,
          ...value,
          tipoRegistro: value.tipoRegistro.trim(),
          plazoMinimo: value.permanente ? null : Number(value.plazoMinimo),
        })
        notify(politica ? SUCCESS_MESSAGES.politicaConservacion.updated : SUCCESS_MESSAGES.politicaConservacion.created)
        onClose()
      } catch (err) {
        // 409: tipo de registro repetido, con el texto del back.
        setNotice({ id: Date.now(), message: getErrorMessage(err) })
      }
    },
  })

  const { confirmDiscardOpen, requestClose, onOpenChange, discardDialogProps } = useGuardedDialog({
    isSaving: save.isPending,
    isDirty: () => JSON.stringify(form.state.values) !== JSON.stringify(defaultValues),
    onOpen: () => {},
    onClose,
  })

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-3xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>{politica ? `Modificar política: ${politica.tipoRegistro}` : "Nueva política"}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-6 gap-y-6 pt-2 sm:grid-cols-2"
        >
          <form.AppField name="tipoRegistro">
            {(f) => (
              <f.TextField
                label="Tipo de registro"
                required
                maxLength={80}
                showCounter
                transform={toTipoRegistroInput}
                placeholder="Ej. Observador"
              />
            )}
          </form.AppField>
          <form.AppField name="pkModulo">
            {(f) => (
              <f.SelectField
                label="Módulo"
                required
                emptyValue={0}
                options={modulos.map((m) => ({ value: m.pkModulo, label: m.nombre }))}
              />
            )}
          </form.AppField>
          <form.Field name="permanente">
            {(field) => (
              // Reglas de UI: el interruptor va en el recuadro de opciones.
              <MarcoOpciones id="politica-permanente" label="Permanente" required>
                <label className="flex items-center gap-2">
                  <Switch
                    size="sm"
                    round
                    aria-labelledby="politica-permanente-label"
                    checked={field.state.value}
                    onCheckedChange={(v) => field.handleChange(v)}
                  />
                  <span className="text-muted-foreground">{field.state.value ? "Sí" : "No"}</span>
                </label>
              </MarcoOpciones>
            )}
          </form.Field>

          <form.Subscribe selector={(st) => st.values.permanente}>
            {(permanente) =>
              permanente ? (
                <p className="self-center rounded-md bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  Un registro permanente no vence ni se dispone: no lleva plazo ni disposición final.
                </p>
              ) : (
                <>
                  <form.AppField name="plazoMinimo">
                    {(f) => (
                      <f.TextField
                        label="Plazo mínimo (años)"
                        required
                        inputMode="numeric"
                        transform={(v) => toDigitsOnly(v, 2)}
                        placeholder="De 1 a 99"
                      />
                    )}
                  </form.AppField>
                  <form.Field name="cuentaDesde">
                    {(field) => (
                      <Opciones
                        legend="Se cuenta desde"
                        className="sm:col-span-2"
                        value={field.state.value}
                        onChange={(v) => field.handleChange(v as CuentaDesde)}
                        labels={CUENTA_DESDE_LABELS}
                        // El validador corre en cada cambio del form: el error solo se muestra al tocar el campo o al guardar.
                        error={isFieldInvalid(field, form.state.submissionAttempts) ? field.state.meta.errors[0]?.message : undefined}
                      />
                    )}
                  </form.Field>
                  <form.Field name="disposicion">
                    {(field) => (
                      <Opciones
                        legend="Disposición final"
                        value={field.state.value}
                        onChange={(v) => field.handleChange(v as Disposicion)}
                        labels={DISPOSICION_LABELS}
                        error={isFieldInvalid(field, form.state.submissionAttempts) ? field.state.meta.errors[0]?.message : undefined}
                      />
                    )}
                  </form.Field>
                </>
              )
            }
          </form.Subscribe>

          <form.Field name="habilitado">
            {(field) => (
              <Opciones
                legend="Estado"
                value={field.state.value ? "A" : "I"}
                onChange={(v) => field.handleChange(v === "A")}
                labels={{ A: "Activo", I: "Inactivo" }}
              />
            )}
          </form.Field>
        </form>

        <DialogFooter className="sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <Button variant="outline" color="neutral" size="sm" type="button" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" color="primary" type="submit" form={FORM_ID} disabled={save.isPending} aria-busy={save.isPending}>
            {save.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}

/** Opción única en línea, como en el prototipo, dentro del recuadro de opciones (reglas de UI). */
function Opciones({
  legend,
  value,
  onChange,
  labels,
  error,
  className,
}: {
  legend: string
  value: string | null
  onChange: (value: string) => void
  labels: Record<string, string>
  error?: string
  className?: string
}) {
  const id = `politica-${legend.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <MarcoOpciones id={id} label={legend} required error={error} className={className}>
      <RadioGroup aria-labelledby={`${id}-label`} value={value ?? ""} onValueChange={(v) => onChange(v as string)}>
        {Object.entries(labels).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm whitespace-nowrap">
            <RadioGroupItem value={key} />
            {label}
          </label>
        ))}
      </RadioGroup>
    </MarcoOpciones>
  )
}
