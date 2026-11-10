import { useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { NoticeProvider, queueNotice } from "@/components/notice/notice-context"
import { FormSectionHeading } from "@/components/form-section-heading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FloppyDiskIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { toDigitsOnly } from "@/lib/text-input"
import { useAppForm } from "@/lib/forms"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { cn } from "@/lib/utils"

import { useSavePolitica } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import {
  useModulosQuery,
  usePoliticaQuery,
} from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
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
const LISTADO = paths.app.conservacionDatos.getHref()

/** S.12.POL.2 (nueva) y S.12.POL.3 (modificar): misma pantalla, distinto origen de datos. */
export function PoliticaFormPage() {
  const { politicaId } = useParams({ strict: false }) as { politicaId?: string }
  const id = politicaId ? Number(politicaId) : null
  const { data, isPending, isError, error } = usePoliticaQuery(id)

  return (
    <NoticeProvider>
      {id == null ? (
        <PoliticaForm politica={null} />
      ) : isError ? (
        <ErrorNoticeBanner error={error} />
      ) : isPending ? (
        <Skeleton className="h-72" />
      ) : (
        <PoliticaForm key={data.pkPolitica} politica={data} />
      )}
    </NoticeProvider>
  )
}

function PoliticaForm({ politica }: { politica: Politica | null }) {
  const navigate = useNavigate()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
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
        queueNotice(politica ? SUCCESS_MESSAGES.politicaConservacion.updated : SUCCESS_MESSAGES.politicaConservacion.created)
        navigate({ to: LISTADO })
      } catch (err) {
        // 409: tipo de registro repetido, con el texto del back.
        setNotice({ id: Date.now(), message: getErrorMessage(err) })
      }
    },
  })

  function cancelar() {
    if (save.isPending) return
    if (JSON.stringify(form.state.values) !== JSON.stringify(defaultValues)) setConfirmDiscard(true)
    else navigate({ to: LISTADO })
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" color="neutral" onClick={cancelar}>
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button size="sm" color="primary" type="submit" form={FORM_ID} disabled={save.isPending}>
                {save.isPending ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            </div>
          }
        >
          Conservación de datos <span className="text-muted-foreground">›</span>{" "}
          {politica ? politica.tipoRegistro : "Nueva política"}
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" className="mb-4" />
        <Card className="rounded-md border border-border py-5">
          <CardContent className="grid gap-5">
            <FormSectionHeading>Datos de la política</FormSectionHeading>
        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid max-w-6xl gap-x-6 gap-y-6 md:grid-cols-3"
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
              <label className="flex flex-col gap-2 text-sm">
                <span>
                  Permanente<span className="text-red"> *</span>
                </span>
                <span className="flex items-center gap-2">
                  <Switch
                    size="sm"
                    round
                    checked={field.state.value}
                    onCheckedChange={(v) => field.handleChange(v)}
                  />
                  <span className="text-muted-foreground">{field.state.value ? "Sí" : "No"}</span>
                </span>
              </label>
            )}
          </form.Field>

          <form.Subscribe selector={(st) => st.values.permanente}>
            {(permanente) =>
              permanente ? (
                <p className="rounded-md bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground md:col-span-3">
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
                        className="md:col-span-2"
                        value={field.state.value}
                        onChange={(v) => field.handleChange(v as CuentaDesde)}
                        labels={CUENTA_DESDE_LABELS}
                        error={field.state.meta.errors[0]?.message}
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
                        error={field.state.meta.errors[0]?.message}
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
          </CardContent>
        </Card>
      </TableScreenBody>
      <ConfirmDiscardDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        onConfirm={() => navigate({ to: LISTADO })}
      />
    </TableScreen>
  )
}

/** Opción única en línea, como en el prototipo. */
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
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className="mb-2 text-sm">
        {legend}
        <span className="text-red"> *</span>
      </legend>
      <RadioGroup
        className="flex flex-wrap gap-x-6 gap-y-2 lg:flex-nowrap"
        value={value ?? ""}
        onValueChange={(v) => onChange(v as string)}
      >
        {Object.entries(labels).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm whitespace-nowrap">
            <RadioGroupItem value={key} />
            {label}
          </label>
        ))}
      </RadioGroup>
      {error ? <p className="text-xs text-red">{error}</p> : null}
    </fieldset>
  )
}
