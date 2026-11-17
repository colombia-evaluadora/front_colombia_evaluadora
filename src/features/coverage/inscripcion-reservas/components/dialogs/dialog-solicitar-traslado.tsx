import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload"
import { FileUploadOutlinedIcon, PaperPlaneTiltIcon, XIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, minLength, required } from "@/lib/forms/messages"
import { toDigitsOnly } from "@/lib/text-input"

import { useSolicitarTraslado } from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-reserva"
import { useCatalogosAccionesQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-detalle-query"
import type { ReservaCupo } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const FORM_ID = "solicitar-traslado-form"
const OTRO = "Otro (fuera de la plataforma)"
const MAX_SOPORTE_MB = 10
const TIPOS_SOPORTE = "application/pdf,image/jpeg,image/png"

const schema = z
  .object({
    establecimientoDestino: z.string().min(1, required("El establecimiento de destino")),
    nombreDestino: z.string(),
    motivo: z.string().min(1, required("El motivo del traslado")),
    jornadaSedePreferida: z.string(),
    tieneHermano: z.enum(["", "SI", "NO"]),
    documentoHermano: z.string(),
    compartirSoportes: z.boolean(),
    soporte: z.array(z.instanceof(File)),
    observacion: z.string().max(500, maxLength(500, "La observación")),
    autorizaDatos: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.establecimientoDestino === OTRO) {
      const n = v.nombreDestino.trim().length
      if (n < 3)
        ctx.addIssue({
          code: "custom",
          path: ["nombreDestino"],
          message: minLength(3, "El nombre"),
        })
      if (n > 150)
        ctx.addIssue({
          code: "custom",
          path: ["nombreDestino"],
          message: maxLength(150, "El nombre"),
        })
    }
    if (!v.tieneHermano) {
      ctx.addIssue({
        code: "custom",
        path: ["tieneHermano"],
        message: "Indique si tiene hermano en el destino.",
      })
    }
    if (v.tieneHermano === "SI" && !/^\d{3,15}$/.test(v.documentoHermano)) {
      ctx.addIssue({
        code: "custom",
        path: ["documentoHermano"],
        message: required("El documento del hermano"),
      })
    }
    if (!v.autorizaDatos) {
      ctx.addIssue({
        code: "custom",
        path: ["autorizaDatos"],
        message: "Debe autorizar el tratamiento de datos.",
      })
    }
  })

const valoresIniciales: z.input<typeof schema> = {
  establecimientoDestino: "",
  nombreDestino: "",
  motivo: "",
  jornadaSedePreferida: "",
  tieneHermano: "",
  documentoHermano: "",
  compartirSoportes: false,
  soporte: [],
  observacion: "",
  autorizaDatos: false,
}

interface Props {
  reserva: ReservaCupo | null
  onOpenChange: (open: boolean) => void
}

/**
 * Solicitar traslado (Secciones 3.1 y 3.2.1): los datos del traslado que la
 * familia reporta en el establecimiento. El traslado queda Pendiente.
 */
export function SolicitarTrasladoDialog({ reserva, onOpenChange }: Props) {
  const { data: catalogos } = useCatalogosAccionesQuery()
  const solicitar = useSolicitarTraslado()

  const form = useAppForm({
    defaultValues: valoresIniciales,
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      try {
        await solicitar.mutateAsync({
          id: reserva?.id ?? "",
          establecimientoDestino: value.establecimientoDestino,
          nombreDestino: value.establecimientoDestino === OTRO ? value.nombreDestino.trim() : null,
          motivo: value.motivo,
          jornadaSedePreferida: value.jornadaSedePreferida || null,
          tieneHermano: value.tieneHermano === "SI",
          documentoHermano: value.tieneHermano === "SI" ? value.documentoHermano : null,
          compartirSoportes: value.compartirSoportes,
          soporte: value.soporte[0] ?? null,
          observacion: value.observacion.trim() || null,
          autorizaDatos: value.autorizaDatos,
        })
        toast.success(`Se solicitó el traslado de ${reserva?.estudiante}. Queda Pendiente.`)
        cerrar()
      } catch (e) {
        toast.error(getErrorMessage(e))
      }
    },
  })

  function cerrar() {
    form.reset()
    onOpenChange(false)
  }

  const opciones = (lista: string[] | undefined) =>
    (lista ?? []).map((v) => ({ value: v, label: v }))

  return (
    <Dialog
      open={reserva != null}
      onOpenChange={(open) => !open && !solicitar.isPending && cerrar()}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Solicitar traslado — {reserva?.estudiante}</DialogTitle>
        </DialogHeader>

        <form
          id={FORM_ID}
          noValidate
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <form.AppField name="establecimientoDestino">
              {(f) => (
                <f.SelectField
                  label="Establecimiento de destino"
                  required
                  placeholder="Seleccionar"
                  options={opciones(catalogos?.establecimientosDestino)}
                />
              )}
            </form.AppField>
            <form.AppField name="motivo">
              {(f) => (
                <f.SelectField
                  label="Motivo del traslado"
                  required
                  placeholder="Seleccionar"
                  options={opciones(catalogos?.motivosTraslado)}
                />
              )}
            </form.AppField>
          </div>

          <form.Subscribe selector={(s) => s.values.establecimientoDestino === OTRO}>
            {(esOtro) =>
              esOtro && (
                <form.AppField name="nombreDestino">
                  {(f) => (
                    <f.TextField
                      label="Nombre del establecimiento de destino"
                      required
                      maxLength={150}
                    />
                  )}
                </form.AppField>
              )
            }
          </form.Subscribe>

          <form.AppField name="jornadaSedePreferida">
            {(f) => (
              <f.SelectField
                label="Jornada y sede preferidas"
                placeholder="Seleccionar"
                clearable
                options={opciones(catalogos?.jornadasSedesDestino)}
              />
            )}
          </form.AppField>

          <div className="grid gap-5 sm:grid-cols-2">
            <form.Field name="tieneHermano">
              {(f) => {
                const invalid = f.state.meta.errors.length > 0
                return (
                  <Field data-invalid={invalid || undefined} className="gap-2">
                    <FieldLabel>¿Tiene hermano en el establecimiento de destino? *</FieldLabel>
                    <RadioGroup
                      value={f.state.value}
                      onValueChange={(v) => f.handleChange(v as "SI" | "NO")}
                      className="flex gap-6"
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="SI" /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="NO" /> No
                      </label>
                    </RadioGroup>
                    {invalid && (
                      <FieldError
                        errors={f.state.meta.errors.map((m) => ({
                          message: String(m?.message ?? m),
                        }))}
                      />
                    )}
                  </Field>
                )
              }}
            </form.Field>
            <form.Subscribe selector={(s) => s.values.tieneHermano === "SI"}>
              {(tiene) =>
                tiene && (
                  <form.AppField name="documentoHermano">
                    {(f) => (
                      <f.TextField
                        label="Documento del hermano"
                        required
                        inputMode="numeric"
                        maxLength={15}
                        transform={(v) => toDigitsOnly(v, 15)}
                      />
                    )}
                  </form.AppField>
                )
              }
            </form.Subscribe>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <form.Field name="compartirSoportes">
              {(f) => (
                <div className="grid content-start gap-2">
                  <span className="text-sm font-medium">Compartir archivos de soporte<span className="text-red">*</span></span>
                  <label className="flex w-fit cursor-pointer items-center gap-2">
                    <Switch
                      checked={f.state.value}
                      onCheckedChange={f.handleChange}
                      className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
                    />
                    <span className="text-sm">{f.state.value ? "Sí" : "No"}</span>
                  </label>
                </div>
              )}
            </form.Field>
            <form.Field name="soporte">
              {(f) => (
                <FileUpload
                  value={f.state.value}
                  onValueChange={f.handleChange}
                  accept={TIPOS_SOPORTE}
                  maxFiles={1}
                  maxSize={MAX_SOPORTE_MB * 1024 * 1024}
                  onFileReject={(_, message) => toast.error(message)}
                >
                  <FileUploadDropzone className="flex-col gap-1 p-4 text-center">
                    <FileUploadOutlinedIcon aria-hidden className="size-5 text-muted-foreground" />
                    <p className="text-sm font-medium">Soporte del traslado</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG o PNG · {MAX_SOPORTE_MB} MB
                    </p>
                  </FileUploadDropzone>
                  <FileUploadList>
                    {f.state.value.map((file) => (
                      <FileUploadItem key={file.name} value={file}>
                        <FileUploadItemPreview />
                        <FileUploadItemMetadata />
                        <FileUploadItemDelete />
                      </FileUploadItem>
                    ))}
                  </FileUploadList>
                </FileUpload>
              )}
            </form.Field>
          </div>

          <form.AppField name="observacion">
            {(f) => (
              <f.TextareaField
                label="Observación para el destino"
                placeholder="Escribir"
                maxLength={500}
                rows={2}
              />
            )}
          </form.AppField>

          <form.AppField name="autorizaDatos">
            {(f) => (
              <f.CheckboxField
                label="Autorizo el tratamiento de datos (Ley 1581 de 2012)."
                required
              />
            )}
          </form.AppField>

          <Aviso tono="info">
            El traslado queda Pendiente hasta que el establecimiento de destino responda. El
            estudiante conserva su reserva aquí.
          </Aviso>
          <p className="text-xs text-muted-foreground">
            Los campos marcados con * son obligatorios
          </p>
        </form>

        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={solicitar.isPending} onClick={cerrar}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={solicitar.isPending}>
            {solicitar.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PaperPlaneTiltIcon data-icon="inline-start" />
            )}
            Solicitar traslado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
