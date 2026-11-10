import { useRef, useState } from "react"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { z } from "zod"

import { SelectItemsDialog } from "@/components/select-items-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CalendarPlusIcon,
  FileUploadOutlinedIcon,
  FloppyDiskIcon,
  PlayCircleIcon,
  XIcon,
} from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { FormDisabledProvider, useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"

import {
  useAmpliarLimiteMatricula,
  useGuardarCalendario,
  useInscripcionEnLinea,
} from "@/features/coverage/inscripcion-reservas/api/mutations/territorial"
import type {
  CalendarioCobertura,
  CampoCalendario,
  ContextoTerritorial,
} from "@/features/coverage/inscripcion-reservas/api/types/territorial"
import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import { Marca } from "@/features/coverage/inscripcion-reservas/components/table/columns-inscripciones"

/** Ciclos por modalidad: el Ciclo va de 1 al número de ciclos (3.10). */
export const CICLOS_MODALIDAD: Record<string, number> = {
  Anual: 1,
  Semestral: 2,
  Trimestral: 4,
  Bimestral: 6,
}
const MODALIDADES = Object.keys(CICLOS_MODALIDAD).map((m) => ({ value: m, label: m }))

export const ESTADO_CALENDARIO_UI = {
  BORRADOR: { label: "Borrador", color: "neutral", punto: false },
  PUBLICADO: { label: "Publicado", color: "success", punto: true },
  FINALIZADO: { label: "Finalizado", color: "muted", punto: true },
} as const

export const nombreCalendario = (c: Pick<CalendarioCobertura, "anio" | "modalidad" | "ciclo">) =>
  `${c.anio} · ${c.modalidad} · Ciclo ${c.ciclo}`

const fechaCorta = (iso: string | null) => (iso ? format(parseISO(iso), "dd/MM/yyyy") : "")
const SOPORTE_ACCEPT = "application/pdf,image/jpeg,image/png"
const SOPORTE_MAX = 10 * 1024 * 1024

/** El soporte del acto: PDF, JPG o PNG de hasta 10 MB (3.10). Avisa y devuelve null si no cumple. */
function soporteValido(f: File | undefined) {
  if (!f) return null
  if (!SOPORTE_ACCEPT.split(",").includes(f.type)) {
    toast.error("El soporte debe ser PDF, JPG o PNG.")
    return null
  }
  if (f.size > SOPORTE_MAX) {
    toast.error("El soporte pesa más de 10 MB.")
    return null
  }
  return f
}

const opcional = z.string().nullable()
const schema = z
  .object({
    anio: z
      .number({ error: required("El año") })
      .int()
      .min(2000, "Indique un año válido."),
    modalidad: z.string().min(1, required("La modalidad de matrícula", { femenino: true })),
    ciclo: z
      .number({ error: required("El ciclo") })
      .int()
      .min(1, "El ciclo empieza en 1."),
    inicioInscripcion: z.string().min(1, required("El inicio de la prematrícula y la inscripción")),
    fechaCierreInscripcion: z
      .string()
      .min(1, required("La fecha de cierre de inscripción", { femenino: true })),
    fechaLiberacionReservas: opcional,
    fechaLimiteMatricula: z
      .string()
      .min(1, required("La fecha límite de matrícula", { femenino: true })),
    corteReporte: opcional,
    plazoSolicitudRetiro: z
      .number({ error: required("El plazo de atención de la solicitud de retiro") })
      .int()
      .min(1, "El plazo es de 1 a 30 días hábiles.")
      .max(30, "El plazo es de 1 a 30 días hábiles."),
    estado: z.enum(["BORRADOR", "PUBLICADO"]),
  })
  .superRefine((v, ctx) => {
    const max = CICLOS_MODALIDAD[v.modalidad]
    if (max && v.ciclo > max) {
      ctx.addIssue({
        code: "custom",
        path: ["ciclo"],
        message: `La modalidad ${v.modalidad} tiene ${max} ciclo${max > 1 ? "s" : ""}.`,
      })
    }
    if (
      v.inicioInscripcion &&
      v.fechaCierreInscripcion &&
      v.fechaCierreInscripcion <= v.inicioInscripcion
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fechaCierreInscripcion"],
        message: "Debe ser posterior al inicio de la inscripción.",
      })
    }
    if (
      v.fechaCierreInscripcion &&
      v.fechaLimiteMatricula &&
      v.fechaLimiteMatricula <= v.fechaCierreInscripcion
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fechaLimiteMatricula"],
        message: "Debe ser posterior al cierre de inscripción.",
      })
    }
    const lib = v.fechaLiberacionReservas
    if (
      lib &&
      ((v.fechaCierreInscripcion && lib < v.fechaCierreInscripcion) ||
        (v.fechaLimiteMatricula && lib > v.fechaLimiteMatricula))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fechaLiberacionReservas"],
        message: "Debe estar entre el cierre de inscripción y la fecha límite de matrícula.",
      })
    }
  })

type Valores = z.infer<typeof schema>

const valoresDe = (c: CalendarioCobertura | null): Valores => ({
  anio: c?.anio ?? new Date().getFullYear() + 1,
  modalidad: c?.modalidad ?? "Anual",
  ciclo: c?.ciclo ?? 1,
  inicioInscripcion: c?.inicioInscripcion ?? "",
  fechaCierreInscripcion: c?.fechaCierreInscripcion ?? "",
  fechaLiberacionReservas: c?.fechaLiberacionReservas ?? null,
  fechaLimiteMatricula: c?.fechaLimiteMatricula ?? "",
  corteReporte: c?.corteReporte ?? null,
  plazoSolicitudRetiro: c?.plazoSolicitudRetiro ?? 5,
  estado: c?.estado === "PUBLICADO" ? "PUBLICADO" : "BORRADOR",
})

const FORM_ID = "calendario-cobertura-form"

/**
 * Nuevo calendario y Modificar (3.10). Con `soloLectura` es el Ver detalle de un calendario
 * Finalizado: los mismos campos deshabilitados, el Estado como marca y el botón Cerrar.
 */
export function CalendarioDialog({
  abierto,
  calendario,
  soloLectura = false,
  onOpenChange,
}: {
  abierto: boolean
  calendario: CalendarioCobertura | null
  soloLectura?: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        {abierto && (
          // Se monta por apertura: los valores iniciales son los del calendario elegido.
          <CalendarioContenido
            key={calendario?.id ?? "nuevo"}
            calendario={calendario}
            soloLectura={soloLectura}
            cerrar={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CalendarioContenido({
  calendario,
  soloLectura,
  cerrar,
}: {
  calendario: CalendarioCobertura | null
  soloLectura: boolean
  cerrar: () => void
}) {
  const guardar = useGuardarCalendario()
  const [soporte, setSoporte] = useState<File | null>(null)
  const archivo = useRef<HTMLInputElement>(null)

  const form = useAppForm({
    defaultValues: valoresDe(calendario),
    validators: { onSubmit: schema },
    onSubmit: ({ value }) =>
      guardar.mutateAsync(
        { id: calendario?.id, ...value, soporte },
        {
          onSuccess: () => {
            toast.success(
              calendario
                ? `Se guardó el calendario ${nombreCalendario(value)}.`
                : `Se creó el calendario ${nombreCalendario(value)}.`,
            )
            cerrar()
          },
        },
      ),
  })

  function elegirSoporte(f: File | undefined) {
    const valido = soporteValido(f)
    if (valido) setSoporte(valido)
  }

  const titulo = calendario
    ? `${soloLectura ? "Calendario de cobertura" : "Editar calendario"} — ${nombreCalendario(calendario)}`
    : "Nuevo calendario"

  return (
    <>
      <DialogHeader>
        <DialogTitle>{titulo}</DialogTitle>
      </DialogHeader>
      <form
        id={FORM_ID}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FormDisabledProvider disabled={soloLectura || guardar.isPending}>
          <div className="grid gap-x-3 gap-y-4 sm:grid-cols-3">
            <form.AppField name="anio">
              {(f) => (
                <f.NumberField label="Año" required={!soloLectura} valueAs="number" maxDigits={4} />
              )}
            </form.AppField>
            <form.AppField
              name="modalidad"
              listeners={{ onChange: () => form.setFieldValue("ciclo", 1) }}
            >
              {(f) => (
                <f.SelectField
                  label={soloLectura ? "Modalidad" : "Modalidad de matrícula"}
                  required={!soloLectura}
                  options={MODALIDADES}
                />
              )}
            </form.AppField>
            <form.AppField name="ciclo">
              {(f) => (
                <f.NumberField
                  label="Ciclo"
                  required={!soloLectura}
                  valueAs="number"
                  maxDigits={1}
                />
              )}
            </form.AppField>
            <form.AppField name="inicioInscripcion">
              {(f) => (
                <f.DateField
                  label="Inicio de la prematrícula y la inscripción"
                  required={!soloLectura}
                />
              )}
            </form.AppField>
            <form.AppField name="fechaCierreInscripcion">
              {(f) => (
                <f.DateField label="Fecha de cierre de inscripción" required={!soloLectura} />
              )}
            </form.AppField>
            <form.AppField name="fechaLiberacionReservas">
              {(f) => (
                <f.DateField label="Fecha de liberación de reservas" nullable placeholder="—" />
              )}
            </form.AppField>
            <form.AppField name="fechaLimiteMatricula">
              {(f) => <f.DateField label="Fecha límite de matrícula" required={!soloLectura} />}
            </form.AppField>
            {!soloLectura && (
              <form.AppField name="corteReporte">
                {(f) => (
                  <f.DateField
                    label="Corte de reporte al sistema nacional"
                    nullable
                    placeholder="—"
                    description="Informativa."
                  />
                )}
              </form.AppField>
            )}
            <form.Field name="estado">
              {(f) => (
                <div className="grid content-start gap-2">
                  <span className="text-sm font-medium">
                    Estado {!soloLectura && <span data-required-mark="">*</span>}
                  </span>
                  {soloLectura && calendario ? (
                    <Marca {...ESTADO_CALENDARIO_UI[calendario.estado]} />
                  ) : (
                    <RadioGroup
                      className="flex flex-wrap gap-6"
                      value={f.state.value}
                      onValueChange={(v) => f.handleChange(v as Valores["estado"])}
                    >
                      {(["BORRADOR", "PUBLICADO"] as const).map((v) => (
                        <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
                          <RadioGroupItem value={v} disabled={guardar.isPending} />
                          {ESTADO_CALENDARIO_UI[v].label}
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {!soloLectura && (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="grid content-start gap-2 sm:col-span-3">
                <span className="text-sm font-medium">Soporte</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    color="neutral"
                    size="sm"
                    onClick={() => archivo.current?.click()}
                  >
                    <FileUploadOutlinedIcon data-icon="inline-start" />
                    Subir PDF, JPG o PNG
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {soporte?.name ?? calendario?.soporte ?? ""}
                  </span>
                  <input
                    ref={archivo}
                    type="file"
                    hidden
                    accept={SOPORTE_ACCEPT}
                    onChange={(e) => {
                      elegirSoporte(e.target.files?.[0])
                      e.target.value = ""
                    }}
                  />
                </div>
              </div>
              <form.AppField name="plazoSolicitudRetiro">
                {(f) => (
                  <f.NumberField
                    label="Plazo de atención de la solicitud de retiro"
                    required
                    valueAs="number"
                    maxDigits={2}
                    description="Días hábiles, de 1 a 30."
                  />
                )}
              </form.AppField>
              <p className="text-xs text-muted-foreground sm:col-span-3">
                Los campos marcados con * son obligatorios
              </p>
            </div>
          )}
        </FormDisabledProvider>
      </form>
      <DialogFooter>
        {soloLectura ? (
          <Button onClick={cerrar}>Cerrar</Button>
        ) : (
          <>
            <Button variant="outline" color="neutral" disabled={guardar.isPending} onClick={cerrar}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID} disabled={guardar.isPending}>
              {guardar.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <FloppyDiskIcon data-icon="inline-start" />
              )}
              Guardar
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  )
}

/** Fechas del calendario que se pueden ampliar (3.10, Etapas) y de dónde sale su valor actual. */
const CAMPOS_AMPLIAR: Record<
  CampoCalendario,
  { label: string; actual: (c: CalendarioCobertura) => string | null }
> = {
  FECHA_CIERRE_INSCRIPCION: {
    label: "Fecha de cierre de inscripción",
    actual: (c) => c.fechaCierreInscripcion,
  },
  FECHA_LIBERACION_RESERVAS: {
    label: "Fecha de liberación de reservas",
    actual: (c) => c.fechaLiberacionReservas,
  },
  FECHA_LIMITE_MATRICULA: {
    label: "Fecha límite de matrícula",
    actual: (c) => c.fechaLimiteMatricula,
  },
}

const ampliarSchema = (actual: string, elegidos: boolean) =>
  z.object({
    fecha: z
      .string()
      .min(1, required("La nueva fecha", { femenino: true }))
      .refine((v) => v > actual, "Debe ser posterior a la fecha actual."),
    establecimientos: elegidos
      ? z.array(z.number()).min(1, "Elija al menos un establecimiento.")
      : z.array(z.number()),
    motivo: z
      .string()
      .trim()
      .min(1, required("El motivo"))
      .max(500, "El motivo tiene máximo 500 caracteres."),
  })

/**
 * Ampliar fecha (3.10, Etapas): una fecha del calendario, con un motivo y, si hay, el soporte del acto.
 * General: la toman los establecimientos que la heredaron y no la ajustaron. La Fecha límite de
 * matrícula se puede ampliar además para establecimientos elegidos, aunque hayan ajustado sus fechas.
 */
export function AmpliarLimiteDialog({
  calendario,
  contexto,
  onOpenChange,
}: {
  calendario: CalendarioCobertura | null
  contexto: ContextoTerritorial | undefined
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={calendario != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {calendario && (
          <AmpliarContenido
            key={calendario.id}
            calendario={calendario}
            contexto={contexto}
            cerrar={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Selector de establecimientos del alcance, con su mensaje de error. */
function CampoEstablecimientos({
  id,
  contexto,
  value,
  onChange,
  error,
}: {
  id: string
  contexto: ContextoTerritorial | undefined
  value: number[]
  onChange: (ids: number[]) => void
  error?: string
}) {
  return (
    <div className="grid gap-1.5">
      <SelectItemsDialog
        id={id}
        items={(contexto?.establecimientos ?? []).map((e) => ({ id: e.id, label: e.nombre }))}
        value={value}
        onChange={onChange}
        invalid={Boolean(error)}
        placeholder="Establecimientos *"
        dialogTitle="Seleccionar establecimientos"
        searchPlaceholder="Buscar establecimiento..."
        emptyMessage="No se encontraron establecimientos."
        selectedCountLabel={(n) =>
          n === 1 ? "1 establecimiento seleccionado" : `${n} establecimientos seleccionados`
        }
      />
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  )
}

const primerError = (errors: unknown[]) => {
  const e = errors[0] as { message?: string } | string | undefined
  return e == null ? undefined : String(typeof e === "string" ? e : (e.message ?? e))
}

function AmpliarContenido({
  calendario,
  contexto,
  cerrar,
}: {
  calendario: CalendarioCobertura
  contexto: ContextoTerritorial | undefined
  cerrar: () => void
}) {
  const ampliar = useAmpliarLimiteMatricula()
  const [soporte, setSoporte] = useState<File | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const [campo, setCampo] = useState<CampoCalendario>("FECHA_LIMITE_MATRICULA")
  // Solo la Fecha límite de matrícula se amplía para establecimientos elegidos.
  const [alcance, setAlcance] = useState<"TODOS" | "ELEGIDOS">("TODOS")
  const elegidos = campo === "FECHA_LIMITE_MATRICULA" && alcance === "ELEGIDOS"
  const actual = CAMPOS_AMPLIAR[campo].actual(calendario) ?? ""
  // Una fecha que el calendario no definió no se amplía: se define con Modificar.
  const campos = (Object.keys(CAMPOS_AMPLIAR) as CampoCalendario[]).filter((k) =>
    CAMPOS_AMPLIAR[k].actual(calendario),
  )
  const form = useAppForm({
    defaultValues: { fecha: "", establecimientos: [] as number[], motivo: "" },
    validators: { onSubmit: ampliarSchema(actual, elegidos) },
    onSubmit: ({ value }) =>
      ampliar.mutateAsync(
        {
          calendarioId: calendario.id,
          campo,
          fecha: value.fecha,
          establecimientos: elegidos ? value.establecimientos : [],
          motivo: value.motivo.trim(),
          soporte,
        },
        {
          onSuccess: () => {
            const n = value.establecimientos.length
            const donde = elegidos
              ? `en ${n} establecimiento${n > 1 ? "s" : ""}`
              : "para los establecimientos que la heredaron"
            toast.success(
              `Se amplió la ${CAMPOS_AMPLIAR[campo].label.toLowerCase()} al ${fechaCorta(value.fecha)} ${donde}.`,
            )
            cerrar()
          },
        },
      ),
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ampliar fecha</DialogTitle>
        <DialogDescription className="sr-only">{nombreCalendario(calendario)}</DialogDescription>
      </DialogHeader>
      <form
        id="ampliar-limite-form"
        noValidate
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FormDisabledProvider disabled={ampliar.isPending}>
          <MatriculaSelectField
            id="ampliar-campo"
            label="Fecha que se amplía"
            value={campo}
            options={campos}
            labelFor={(v) => CAMPOS_AMPLIAR[v as CampoCalendario].label}
            onChange={(v) => v && setCampo(v as CampoCalendario)}
          />
          <form.AppField name="fecha">
            {(f) => (
              <f.DateField
                label="Nueva fecha"
                required
                minDate={actual ? parseISO(actual) : undefined}
                description={`Fecha actual: ${fechaCorta(actual)}. Debe ser posterior.`}
              />
            )}
          </form.AppField>
          {campo === "FECHA_LIMITE_MATRICULA" && (
            <RadioGroup
              className="flex flex-wrap gap-6"
              value={alcance}
              onValueChange={(v) => setAlcance(v as "TODOS" | "ELEGIDOS")}
            >
              {(
                [
                  ["TODOS", "Establecimientos que la heredaron"],
                  ["ELEGIDOS", "Establecimientos elegidos"],
                ] as const
              ).map(([v, texto]) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value={v} disabled={ampliar.isPending} />
                  {texto}
                </label>
              ))}
            </RadioGroup>
          )}
          {elegidos && (
            <form.Field name="establecimientos">
              {(f) => (
                <CampoEstablecimientos
                  id="ampliar-establecimientos"
                  contexto={contexto}
                  value={f.state.value}
                  onChange={f.handleChange}
                  error={primerError(f.state.meta.errors)}
                />
              )}
            </form.Field>
          )}
          <form.AppField name="motivo">
            {(f) => (
              <f.TextareaField
                label="Motivo"
                required
                placeholder="Escriba el motivo de la ampliación"
                maxLength={500}
              />
            )}
          </form.AppField>
          <div className="grid content-start gap-2">
            <span className="text-sm font-medium">Soporte</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                color="neutral"
                size="sm"
                disabled={ampliar.isPending}
                onClick={() => archivo.current?.click()}
              >
                <FileUploadOutlinedIcon data-icon="inline-start" />
                Subir PDF, JPG o PNG
              </Button>
              <span className="text-sm text-muted-foreground">{soporte?.name ?? ""}</span>
              <input
                ref={archivo}
                type="file"
                hidden
                accept={SOPORTE_ACCEPT}
                onChange={(e) => {
                  const f = soporteValido(e.target.files?.[0])
                  if (f) setSoporte(f)
                  e.target.value = ""
                }}
              />
            </div>
          </div>
        </FormDisabledProvider>
      </form>
      <DialogFooter>
        <Button variant="outline" color="neutral" disabled={ampliar.isPending} onClick={cerrar}>
          <XIcon data-icon="inline-start" />
          Cancelar
        </Button>
        <Button type="submit" form="ampliar-limite-form" disabled={ampliar.isPending}>
          {ampliar.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CalendarPlusIcon data-icon="inline-start" />
          )}
          Ampliar
        </Button>
      </DialogFooter>
    </>
  )
}

const enLineaSchema = z.object({
  establecimientos: z.array(z.number()).min(1, "Elija al menos un establecimiento."),
  motivo: z
    .string()
    .trim()
    .min(1, required("El motivo"))
    .max(500, "El motivo tiene máximo 500 caracteres."),
})

/**
 * Habilitar o suspender la inscripción y la prematrícula en línea (3.10, Etapas): para un
 * establecimiento, varios o todos, con un motivo. Es el *Habilitar reserva de cupos* de sus períodos
 * en Inscripciones (Establecimiento, Regla 31).
 */
export function InscripcionEnLineaDialog({
  calendario,
  contexto,
  onOpenChange,
}: {
  calendario: CalendarioCobertura | null
  contexto: ContextoTerritorial | undefined
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={calendario != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {calendario && (
          <EnLineaContenido
            key={calendario.id}
            calendario={calendario}
            contexto={contexto}
            cerrar={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EnLineaContenido({
  calendario,
  contexto,
  cerrar,
}: {
  calendario: CalendarioCobertura
  contexto: ContextoTerritorial | undefined
  cerrar: () => void
}) {
  const cambiar = useInscripcionEnLinea()
  const [accion, setAccion] = useState<"HABILITAR" | "SUSPENDER">("HABILITAR")
  const todos = (contexto?.establecimientos ?? []).map((e) => e.id)
  const form = useAppForm({
    defaultValues: { establecimientos: [] as number[], motivo: "" },
    validators: { onSubmit: enLineaSchema },
    onSubmit: ({ value }) =>
      cambiar.mutateAsync(
        {
          calendarioId: calendario.id,
          accion,
          establecimientos: value.establecimientos,
          motivo: value.motivo.trim(),
        },
        {
          onSuccess: (r) => {
            const hecho = accion === "HABILITAR" ? "habilitó" : "suspendió"
            const omitidos = r?.omitidos
              ? ` ${r.omitidos} período${r.omitidos > 1 ? "s" : ""} sin grados con grupos y cupos no se habilitaron.`
              : ""
            toast.success(
              `Se ${hecho} la inscripción en línea en ${r?.periodos ?? 0} período${r?.periodos === 1 ? "" : "s"}.${omitidos}`,
            )
            cerrar()
          },
        },
      ),
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>Habilitar o suspender la inscripción en línea</DialogTitle>
        <DialogDescription className="sr-only">{nombreCalendario(calendario)}</DialogDescription>
      </DialogHeader>
      <form
        id="inscripcion-en-linea-form"
        noValidate
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FormDisabledProvider disabled={cambiar.isPending}>
          <RadioGroup
            className="flex flex-wrap gap-6"
            value={accion}
            onValueChange={(v) => setAccion(v as "HABILITAR" | "SUSPENDER")}
          >
            {(
              [
                ["HABILITAR", "Habilitar"],
                ["SUSPENDER", "Suspender"],
              ] as const
            ).map(([v, texto]) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value={v} disabled={cambiar.isPending} />
                {texto}
              </label>
            ))}
          </RadioGroup>
          <form.Field name="establecimientos">
            {(f) => (
              <div className="grid gap-1.5">
                <CampoEstablecimientos
                  id="en-linea-establecimientos"
                  contexto={contexto}
                  value={f.state.value}
                  onChange={f.handleChange}
                  error={primerError(f.state.meta.errors)}
                />
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="justify-self-start"
                  disabled={cambiar.isPending}
                  onClick={() => f.handleChange(todos)}
                >
                  Seleccionar todos
                </Button>
              </div>
            )}
          </form.Field>
          <form.AppField name="motivo">
            {(f) => (
              <f.TextareaField
                label="Motivo"
                required
                placeholder="Escriba el motivo"
                maxLength={500}
              />
            )}
          </form.AppField>
        </FormDisabledProvider>
      </form>
      <DialogFooter>
        <Button variant="outline" color="neutral" disabled={cambiar.isPending} onClick={cerrar}>
          <XIcon data-icon="inline-start" />
          Cancelar
        </Button>
        <Button type="submit" form="inscripcion-en-linea-form" disabled={cambiar.isPending}>
          {cambiar.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PlayCircleIcon data-icon="inline-start" />
          )}
          {accion === "HABILITAR" ? "Habilitar" : "Suspender"}
        </Button>
      </DialogFooter>
    </>
  )
}
