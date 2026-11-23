import { useState } from "react"
import { useStore } from "@tanstack/react-form"
import { z } from "zod"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
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
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload"
import { FileUploadOutlinedIcon, PaperPlaneTiltIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { isFieldInvalid, useAppForm } from "@/lib/forms"
import { maxLength, minLength, required } from "@/lib/forms/messages"
import { toSafeTextInput } from "@/lib/text-input"

import { useSolicitarTraslado } from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-reserva"
import {
  useDestinosTrasladoQuery,
  useUbicacionesDestinoQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-detalle-query"
import { useReservasCupoCatalogosQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type { ReservaCupo } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const FORM_ID = "solicitar-traslado-form"
/** Destino fuera de la plataforma: va el nombre en lugar del establecimiento (V505). */
const OTRO = "OTRO"
const MAX_SOPORTE_MB = 10
const TIPOS_SOPORTE = "application/pdf,image/jpeg,image/png"

// Mismas reglas que `fn_reserva_validar_traslado` (V505), para avisar antes de enviar.
const schema = z
  .object({
    destino: z.string().min(1, required("El establecimiento de destino")),
    nombreDestino: z.string(),
    motivo: z.number().min(1, required("El motivo del traslado")),
    /** "sede|jornada" o vacío. */
    preferida: z.string(),
    tieneHermano: z.enum(["", "SI", "NO"]),
    documentoHermano: z.string(),
    compartirSoportes: z.boolean(),
    soporte: z.array(z.instanceof(File)),
    observacion: z.string(),
    autorizaDatos: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message })
    if (v.destino === OTRO) {
      const n = v.nombreDestino.trim().length
      if (n < 3) issue("nombreDestino", minLength(3, "El nombre"))
      else if (n > 150) issue("nombreDestino", maxLength(150, "El nombre"))
      return // Fuera de la plataforma no se piden los demás datos.
    }
    if (!v.tieneHermano)
      issue("tieneHermano", "Indique si tiene hermano en el establecimiento de destino.")
    if (v.tieneHermano === "SI" && !/^[A-Za-z0-9]{5,20}$/.test(v.documentoHermano)) {
      issue(
        "documentoHermano",
        "El documento debe tener de 5 a 20 dígitos o letras, sin puntos ni espacios.",
      )
    }
    const obs = v.observacion.trim().length
    if (obs > 0 && obs < 10) issue("observacion", minLength(10, "La observación"))
    if (obs > 500) issue("observacion", maxLength(500, "La observación"))
    if (!v.autorizaDatos) {
      issue("autorizaDatos", "El back exige la autorización de datos para enviar el traslado.")
    }
  })

const valoresIniciales: z.input<typeof schema> = {
  destino: "",
  nombreDestino: "",
  motivo: 0,
  preferida: "",
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
  onDone: (mensaje: string) => void
}

/**
 * Solicitar traslado (Secciones 3.1 y 3.2.1): los datos que la familia
 * reporta. A un destino de la plataforma queda Pendiente y el estudiante
 * conserva su reserva; a uno de fuera, la reserva se libera.
 */
export function SolicitarTrasladoDialog({ reserva, ...props }: Props) {
  return reserva ? <Contenido key={reserva.id} reserva={reserva} {...props} /> : null
}

function Contenido({ reserva, onOpenChange, onDone }: Props & { reserva: ReservaCupo }) {
  const { data: catalogos } = useReservasCupoCatalogosQuery()
  const destinos = useDestinosTrasladoQuery(reserva.id)
  const solicitar = useSolicitarTraslado()
  // Archivo rechazado (tipo o tamaño): mensaje del componente bajo el campo.
  const [rechazo, setRechazo] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: valoresIniciales,
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const fuera = value.destino === OTRO
      const [sede, jornada] = value.preferida
        ? value.preferida.split("|").map(Number)
        : [null, null]
      try {
        await solicitar.mutateAsync({
          id: reserva.id,
          destinoId: fuera ? null : Number(value.destino),
          nombreDestino: fuera ? value.nombreDestino.trim() : null,
          motivoId: value.motivo,
          sedePreferidaId: fuera ? null : sede,
          jornadaPreferidaId: fuera ? null : jornada,
          tieneHermano: !fuera && value.tieneHermano === "SI",
          documentoHermano: value.tieneHermano === "SI" ? value.documentoHermano : null,
          compartirSoportes: !fuera && value.compartirSoportes,
          soporte: fuera ? null : (value.soporte[0] ?? null),
          observacion: value.observacion.trim() || null,
          autorizaDatos: value.autorizaDatos,
        })
      } catch {
        return // El banner del modal muestra el error.
      }
      onDone(
        fuera
          ? `Se registró el traslado de ${reserva.estudiante} fuera de la plataforma; la reserva quedó Liberada.`
          : `Se solicitó el traslado de ${reserva.estudiante}. Queda Pendiente hasta que el destino responda.`,
      )
      onOpenChange(false)
    },
  })

  const destino = useStore(form.store, (s) => s.values.destino)
  const destinoId = destino && destino !== OTRO ? Number(destino) : null
  const ubicaciones = useUbicacionesDestinoQuery(reserva.id, destinoId)

  // Jornada y sede preferidas, hermano y soportes: solo con un destino de la plataforma.
  const datosDestino = (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <form.AppField name="preferida">
          {(f) => (
            <f.SelectField
              label="Jornada y sede preferidas"
              clearable
              disabled={destinoId == null || ubicaciones.isFetching}
              placeholder={destino ? "Seleccione" : "Elija el destino primero"}
              options={(ubicaciones.data ?? []).map((u) => ({
                value: `${u.fkTsede}|${u.fkTlvJornada}`,
                label: `${u.sede} · ${u.jornada}`,
              }))}
            />
          )}
        </form.AppField>

        <form.Field name="tieneHermano">
          {(f) => {
            const invalid = isFieldInvalid(f, form.state.submissionAttempts)
            return (
              <Field data-invalid={invalid || undefined} className="gap-2">
                <FieldLabel>
                  <span>
                    <span className="text-red">*</span> ¿Tiene hermano en el establecimiento de
                    destino?
                  </span>
                </FieldLabel>
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
                    errors={f.state.meta.errors.map((m) => ({ message: String(m?.message ?? m) }))}
                  />
                )}
              </Field>
            )
          }}
        </form.Field>
      </div>

      <form.Subscribe selector={(s) => s.values.tieneHermano === "SI"}>
        {(tiene) =>
          tiene && (
            <form.AppField name="documentoHermano">
              {(f) => (
                <f.TextField
                  label="Documento del hermano"
                  required
                  maxLength={20}
                  description="Debe tener matrícula vigente en el establecimiento de destino."
                  transform={(v) => v.replace(/[^A-Za-z0-9]/g, "").slice(0, 20)}
                />
              )}
            </form.AppField>
          )
        }
      </form.Subscribe>

      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="compartirSoportes">
          {(f) => (
            <div className="grid content-start gap-2">
              <span className="text-sm font-medium">Compartir archivos de soporte</span>
              <label className="flex w-fit cursor-pointer items-center gap-2">
                <Switch checked={f.state.value} onCheckedChange={(v) => f.handleChange(v)} />
                <span className="text-sm">{f.state.value ? "Sí" : "No"}</span>
              </label>
            </div>
          )}
        </form.Field>
        <form.Field name="soporte">
          {(f) => (
            <div className="grid content-start gap-2">
              <span className="text-sm font-medium">Soporte del traslado</span>
              <FileUpload
                value={f.state.value}
                onValueChange={(files) => {
                  setRechazo(null)
                  f.handleChange(files)
                }}
                accept={TIPOS_SOPORTE}
                maxFiles={1}
                maxSize={MAX_SOPORTE_MB * 1024 * 1024}
                onFileReject={(_, message) => setRechazo(message)}
              >
                <FileUploadTrigger
                  render={
                    <Button type="button" variant="outline" color="neutral" className="w-fit" />
                  }
                >
                  <FileUploadOutlinedIcon data-icon="inline-start" />
                  Adjuntar archivo
                </FileUploadTrigger>
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
              <p className="text-xs text-muted-foreground">
                Opcional. PDF, JPG o PNG · máx. {MAX_SOPORTE_MB} MB.
              </p>
              {rechazo && <p className="text-xs text-red">{rechazo}</p>}
            </div>
          )}
        </form.Field>
      </div>
    </>
  )

  const opcionesDestino = [
    ...(destinos.data ?? []).map((d) => ({ value: String(d.id), label: d.nombre })),
    { value: OTRO, label: "Otro (fuera de la plataforma)" },
  ]

  return (
    <Dialog open onOpenChange={(open) => !open && !solicitar.isPending && onOpenChange(false)}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Solicitar traslado — {reserva.estudiante}</DialogTitle>
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
          <ErrorNoticeBanner error={solicitar.error ?? destinos.error} />

          <div className="grid gap-5 sm:grid-cols-2">
            <form.AppField
              name="destino"
              listeners={{ onChange: () => form.setFieldValue("preferida", "") }}
            >
              {(f) => (
                <f.SelectField
                  label="Establecimiento de destino"
                  required
                  disabled={destinos.isPending}
                  options={opcionesDestino}
                />
              )}
            </form.AppField>
            <form.AppField name="motivo">
              {(f) => (
                <f.SelectField
                  label="Motivo del traslado"
                  required
                  emptyValue={0}
                  options={(catalogos?.motivosTraslado ?? []).map((m) => ({
                    value: m.id,
                    label: m.nombre,
                  }))}
                />
              )}
            </form.AppField>
          </div>

          {destino === OTRO ? (
            <>
              <form.AppField name="nombreDestino">
                {(f) => (
                  <f.TextField
                    label="Nombre del establecimiento de destino"
                    required
                    maxLength={150}
                    transform={toSafeTextInput}
                  />
                )}
              </form.AppField>
              <Aviso tono="warning">
                Con un destino fuera de la plataforma la reserva pasa a Liberada (Traslado fuera de
                la plataforma) y el cupo queda disponible.
              </Aviso>
            </>
          ) : (
            datosDestino
          )}

          <form.AppField name="observacion">
            {(f) => (
              <f.TextareaField label="Observación para el destino" maxLength={500} rows={2} />
            )}
          </form.AppField>

          <form.Subscribe selector={(s) => s.values.destino === OTRO}>
            {(fuera) =>
              !fuera && (
                <form.AppField name="autorizaDatos">
                  {(f) => (
                    <f.CheckboxField label="El acudiente autoriza el tratamiento de datos (Ley 1581 de 2012)" />
                  )}
                </form.AppField>
              )
            }
          </form.Subscribe>

          <p className="text-xs text-muted-foreground">
            Los campos marcados con * son obligatorios
          </p>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={solicitar.isPending}
            onClick={() => onOpenChange(false)}
          >
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
