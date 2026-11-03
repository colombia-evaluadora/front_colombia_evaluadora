import { useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { cn } from "@/lib/utils"

import { useEstadoFestivo } from "@/features/administration/festivos/api/mutations/estado-festivo"
import { useSaveFestivo } from "@/features/administration/festivos/api/mutations/save-festivo"
import {
  festivoFormSchema,
  type FestivoFormValues,
} from "@/features/administration/festivos/api/schema"
import {
  TIPO_FECHA_AYUDA,
  TIPO_FECHA_LABELS,
  type Festivo,
  type TipoFecha,
} from "@/features/administration/festivos/api/types"
import {
  fechaFestivo,
  fechaTexto,
  toIso,
  type ReglaFecha,
} from "@/features/administration/festivos/lib/fecha-festivo"

const FORM_ID = "festivo-form"

const MES_OPTIONS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
].map((label, i) => ({ value: i + 1, label }))

/** Deja el signo menos inicial y hasta tres dígitos: −10 a 100. */
const toEnteroConSigno = (value: string) => {
  const negativo = /^\s*[-−]/.test(value)
  return (negativo ? "-" : "") + value.replace(/\D/g, "").slice(0, 3)
}

/** Valores del form → regla de fecha (la usan la vista previa y el guardado). */
function aRegla(v: FestivoFormValues): ReglaFecha {
  return {
    tipoFecha: v.tipoFecha,
    mes: v.mes || null,
    dia: v.dia === "" ? null : Number(v.dia),
    diasPascua: v.diasPascua === "" || v.diasPascua === "-" ? null : Number(v.diasPascua),
    trasladoLunes: v.trasladoLunes,
  }
}

interface DialogSaveFestivoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Presente = modificar. */
  festivo: Festivo | null
}

/** "Nuevo festivo" / "Modificar festivo". Lo abre la página. */
export function DialogSaveFestivo({ open, onOpenChange, festivo }: DialogSaveFestivoProps) {
  // El form se monta en cada apertura: arranca de los datos del festivo.
  if (!open) return null
  return (
    <SaveFestivoContent
      key={festivo?.pkFestivo ?? "nuevo"}
      festivo={festivo}
      onClose={() => onOpenChange(false)}
    />
  )
}

function SaveFestivoContent({ festivo, onClose }: { festivo: Festivo | null; onClose: () => void }) {
  const isEditing = festivo != null
  const { notify } = useNotify()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const defaultValues: FestivoFormValues = {
    nombre: festivo?.nombre ?? "",
    tipoFecha: festivo?.tipoFecha ?? "FIJA",
    mes: festivo?.mes ?? 0,
    dia: festivo?.dia != null ? String(festivo.dia) : "",
    diasPascua: festivo?.diasPascua != null ? String(festivo.diasPascua) : "",
    trasladoLunes: festivo?.trasladoLunes ?? false,
    habilitado: festivo?.habilitado ?? true,
  }

  const save = useSaveFestivo()
  const estado = useEstadoFestivo()
  const busy = save.isPending || estado.isPending

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: festivoFormSchema },
    onSubmit: ({ value }) => guardar(value),
  })

  // Datos y estado son dos endpoints: primero los datos, luego el estado.
  async function guardar(value: FestivoFormValues) {
    const { habilitado, ...datos } = value
    const { habilitado: _h, ...datosIniciales } = defaultValues
    const cambianDatos = !isEditing || JSON.stringify(datos) !== JSON.stringify(datosIniciales)
    const cambiaEstado = isEditing && habilitado !== festivo.habilitado
    try {
      if (cambianDatos)
        await save.mutateAsync({ id: festivo?.pkFestivo, nombre: value.nombre.trim(), ...aRegla(value) })
      if (cambiaEstado) await estado.mutateAsync({ id: festivo.pkFestivo, habilitado })
      onClose()
      if (cambianDatos || !cambiaEstado)
        notify(isEditing ? SUCCESS_MESSAGES.festivo.updated : SUCCESS_MESSAGES.festivo.created)
      else
        notify(habilitado ? SUCCESS_MESSAGES.festivo.activated : SUCCESS_MESSAGES.festivo.deactivated)
    } catch (error) {
      // Nombre repetido (409) llega con el texto del requerimiento desde el back.
      setNotice({ id: Date.now(), message: getErrorMessage(error) })
    }
  }

  function requestClose() {
    if (busy) return
    if (JSON.stringify(form.state.values) !== JSON.stringify(defaultValues)) {
      setConfirmDiscardOpen(true)
      return
    }
    onClose()
  }

  const anio = new Date().getFullYear()

  return (
    // Escape, click afuera y la X pasan por la confirmación de descarte.
    <Dialog open onOpenChange={(next) => !next && requestClose()}>
      <DialogContent className="sm:max-w-xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modificar festivo" : "Nuevo festivo"}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-5"
        >
          <form.AppField name="nombre">
            {(f) => (
              <f.TextField
                label="Nombre"
                required
                maxLength={80}
                placeholder="Ej. Día de los Reyes Magos"
                description="De 3 a 80 caracteres. No puede repetirse."
              />
            )}
          </form.AppField>

          <form.Field name="tipoFecha">
            {(field) => (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm">
                  Tipo de fecha<span className="text-red"> *</span>
                </legend>
                <RadioGroup
                  className="flex flex-col gap-2"
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v as TipoFecha)}
                >
                  {(Object.keys(TIPO_FECHA_LABELS) as TipoFecha[]).map((tipo) => (
                    <label key={tipo} className="flex items-start gap-2 text-sm">
                      <RadioGroupItem value={tipo} className="mt-0.5" />
                      <span className="flex flex-col">
                        {TIPO_FECHA_LABELS[tipo]}
                        <span className="text-xs text-muted-foreground">{TIPO_FECHA_AYUDA[tipo]}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>
            )}
          </form.Field>

          <form.Subscribe selector={(st) => st.values.tipoFecha}>
            {(tipo) =>
              tipo === "PASCUA" ? (
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <form.AppField name="diasPascua">
                    {(f) => (
                      <f.TextField
                        label="Días respecto del Domingo de Pascua"
                        required
                        transform={toEnteroConSigno}
                        placeholder="Ej. −3"
                        description="Negativo antes de Pascua; de −10 a 100."
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="trasladoLunes">
                    {(f) => (
                      <f.CheckboxField
                        label="Se traslada al lunes"
                        description="Si no cae en lunes, pasa al lunes siguiente."
                        className="sm:mt-3"
                      />
                    )}
                  </form.AppField>
                </div>
              ) : (
                <div className="grid items-start gap-4 sm:grid-cols-[1fr_8rem]">
                  <form.AppField name="mes">
                    {(f) => <f.SelectField label="Mes" required options={MES_OPTIONS} emptyValue={0} />}
                  </form.AppField>
                  <form.AppField name="dia">
                    {(f) => <f.NumberField label="Día" required maxDigits={2} />}
                  </form.AppField>
                </div>
              )
            }
          </form.Subscribe>

          {/* Vista previa con la misma regla del back: confirma la regla antes de guardar. */}
          <form.Subscribe selector={(st) => aRegla(st.values)}>
            {(regla) => {
              const fechas = [anio, anio + 1].map((a) => ({ a, fecha: fechaFestivo(regla, a) }))
              return (
                <section aria-labelledby="festivo-vista-previa" className="rounded-md bg-muted/40 px-3 py-2.5">
                  <h3 id="festivo-vista-previa" className="text-xs text-muted-foreground">
                    Fecha resultante
                  </h3>
                  {fechas.every((x) => x.fecha) ? (
                    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
                      {fechas.map(({ a, fecha }) => (
                        <div key={a} className="contents">
                          <dt className="tabular-nums text-muted-foreground">{a}</dt>
                          <dd className="first-letter:uppercase">{fechaTexto(toIso(fecha!))}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Complete la fecha para ver en qué día cae.
                    </p>
                  )}
                </section>
              )
            }}
          </form.Subscribe>

          <form.AppField name="habilitado">
            {(f) => (
              <EstadoSwitch
                checked={f.state.value}
                // Uno nuevo nace activo; el estado se cambia al modificar.
                disabled={!isEditing}
                onChange={(next) => f.handleChange(next)}
              />
            )}
          </form.AppField>
        </form>
        <DialogFooter>
          <Button size="sm" type="submit" color="primary" form={FORM_ID} disabled={busy} aria-busy={busy}>
            {busy ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
          <Button size="sm" type="button" variant="fill" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
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

/** Mismo aspecto que el estado de Áreas oficiales. */
function EstadoSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      htmlFor="festivo-estado"
      className={cn(
        "flex items-start gap-3 rounded-md border px-3 py-2.5",
        checked ? "border-border" : "border-dashed border-border bg-muted/40",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <Switch
        id="festivo-estado"
        size="sm"
        round
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => !disabled && onChange(next)}
      />
      <span className="flex flex-col gap-0.5 text-sm">
        <span className={cn("font-medium", !checked && "text-muted-foreground")}>
          {checked ? "Activo" : "Inactivo"}
        </span>
        <span className="text-xs text-muted-foreground">
          {checked
            ? "Cuenta como día inhábil en el Calendario Académico. Si lo inactiva, deja de contar en los períodos que aún no han comenzado."
            : "No cuenta en los períodos que aún no han comenzado. Los que ya comenzaron conservan su día inhábil."}
        </span>
      </span>
    </label>
  )
}
