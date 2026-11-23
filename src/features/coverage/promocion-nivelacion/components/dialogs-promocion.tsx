import { useRef, useState, type ReactNode } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import {
  ChartLineUpIcon,
  CalendarIcon,
  CheckIcon,
  PencilIcon,
  ProhibitIcon,
  SpinnerIcon,
  UploadSimpleIcon,
  XIcon,
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { useUser } from "@/lib/auth"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { cn } from "@/lib/utils"

import { formatoFecha, formatoNota } from "@/features/coverage/promocion-nivelacion/api/formato"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import { useOpcionesFuncionariosQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-opciones-query"
import { Aviso } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"
import {
  useAmpliarPlazo,
  useAnularPromocion,
  useCorregirNivelacion,
  usePreviaPromoverQuery,
  usePromover,
  useRegistrarNivelacion,
} from "@/features/coverage/promocion-nivelacion/api/promocion"
import type {
  AreaPendiente,
  DetallePromocion,
  Promovido,
  Reprobado,
} from "@/features/coverage/promocion-nivelacion/api/types"

const MOTIVO_MIN = 10
const MOTIVO_MAX = 500
const OBSERVACION_MAX = 500
const SOPORTE_MAX = 10 * 1024 * 1024

const leerNota = (v: string) => Number(v.replace(",", "."))
const finDelDia = () => {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function Cargando() {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <SpinnerIcon className="animate-spin" aria-hidden />
      Cargando…
    </div>
  )
}

const Requeridos = () => <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

function Obligatorio({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <span data-required-mark="">*</span>
    </>
  )
}

function CampoFecha({
  id,
  label,
  value,
  onChange,
  error,
  ayuda,
  minDate,
  maxDate,
}: {
  id: string
  label: string
  value: Date | undefined
  onChange: (d: Date | undefined) => void
  error: string | undefined
  ayuda: string
  minDate?: Date
  maxDate?: Date
}) {
  return (
    <Field variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        <Obligatorio>{label}</Obligatorio>
      </FieldLabel>
      <DatePicker id={id} mode="date" value={value} minDate={minDate} maxDate={maxDate} aria-invalid={Boolean(error) || undefined} onChange={onChange} />
      {error ? <FieldError>{error}</FieldError> : <FieldDescription>{ayuda}</FieldDescription>}
    </Field>
  )
}

function Texto({
  id,
  label,
  value,
  onChange,
  max,
  requerido,
  error,
  ayuda,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  max: number
  requerido?: boolean
  error?: string
  ayuda?: string
}) {
  return (
    <Field variant="outlined" className="gap-1.5" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{requerido ? <Obligatorio>{label}</Obligatorio> : label}</FieldLabel>
      <div className="relative">
        <Textarea
          id={id}
          rows={3}
          maxLength={max}
          value={value}
          aria-invalid={Boolean(error) || undefined}
          className={cn(TEXTAREA_OUTLINED, "pr-16")}
          onChange={(e) => onChange(e.target.value)}
        />
        <CharacterCounter value={value} max={max} className="absolute top-3 right-3" />
      </div>
      {error ? <FieldError>{error}</FieldError> : ayuda ? <FieldDescription>{ayuda}</FieldDescription> : null}
    </Field>
  )
}

const errorMotivo = (m: string) =>
  m.trim().length < MOTIVO_MIN || m.trim().length > MOTIVO_MAX ? `El motivo debe tener entre ${MOTIVO_MIN} y ${MOTIVO_MAX} caracteres.` : undefined

function Motivo({ id, value, onChange, intento }: { id: string; value: string; onChange: (v: string) => void; intento: boolean }) {
  return (
    <Texto
      id={id}
      label="Motivo"
      requerido
      max={MOTIVO_MAX}
      value={value}
      onChange={onChange}
      error={intento ? errorMotivo(value) : undefined}
      ayuda={`Entre ${MOTIVO_MIN} y ${MOTIVO_MAX} caracteres.`}
    />
  )
}

/**
 * Promover con áreas pendientes (Sección 4.7, Regla 64): individual o en lote.
 * Los que ya tienen matrícula en el período siguiente se listan y no se promueven.
 */
export function DialogPromover({ reprobados, onClose, onHecho }: { reprobados: Reprobado[]; onClose: () => void; onHecho?: () => void }) {
  const { notify } = useNotify()
  const ids = reprobados.map((r) => r.matriculaId)
  const { data: previa, isPending: cargando } = usePreviaPromoverQuery(ids)
  const promover = usePromover()
  const [acta, setActa] = useState("")
  const [fechaActa, setFechaActa] = useState<Date | undefined>(() => new Date())
  const [plazo, setPlazo] = useState<Date | undefined>()
  const [observacion, setObservacion] = useState("")
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const aptos = (previa ?? []).filter((p) => !p.bloqueo)
  const bloqueados = (previa ?? []).filter((p) => p.bloqueo)
  // La fecha del acta no puede ser anterior al cierre académico más tardío de la selección.
  const cierre = aptos.map((p) => p.fechaCierre).sort().at(-1)
  const minActa = cierre ? parseDateValue(cierre) : undefined
  // El plazo es uno solo para la selección: no pasa del fin del período siguiente más temprano (el de la reserva; V729).
  const tope = aptos.map((p) => p.finPeriodoSiguiente).filter(Boolean).sort().at(0)
  const maxPlazo = tope ? parseDateValue(tope) : undefined

  const errores = {
    acta: !acta.trim() ? "El acta es obligatoria." : undefined,
    fechaActa: !fechaActa
      ? "La fecha del acta es obligatoria."
      : fechaActa > finDelDia()
        ? "La fecha del acta no puede ser posterior a hoy."
        : minActa && fechaActa < minActa
          ? `La fecha del acta no puede ser anterior al cierre académico (${formatoFecha(cierre ?? "")}).`
          : undefined,
    plazo: !plazo
      ? "El plazo para nivelar es obligatorio."
      : fechaActa && plazo <= fechaActa
        ? "El plazo debe ser posterior a la fecha del acta."
        : maxPlazo && plazo > maxPlazo
          ? `El plazo no puede pasar del fin del período académico siguiente (${formatoFecha(tope ?? "")}).`
          : undefined,
  }
  const uno = reprobados.length === 1

  function confirmar() {
    setIntento(true)
    setError(null)
    if (errores.acta || errores.fechaActa || errores.plazo || !aptos.length) return
    promover.mutate(
      {
        ids: aptos.map((p) => p.matriculaId),
        acta: acta.trim(),
        fechaActa: formatDateValue(fechaActa),
        plazo: formatDateValue(plazo),
        observacion: observacion.trim() || null,
      },
      {
        onSuccess: (res) => {
          const ok = res.filter((r) => r.ok).length
          const fallos = res.filter((r) => !r.ok)
          notify(
            ok === 1 && uno
              ? `${reprobados[0].estudiante} quedó promovido con áreas pendientes.`
              : `Se promovieron ${ok} estudiantes con áreas pendientes.${fallos.length ? ` ${fallos.length} no se promovieron: ${fallos.map((f) => f.mensaje).join(" ")}` : ""}`,
            { variant: fallos.length ? "warning" : "success" },
          )
          onHecho?.()
          onClose()
        },
        onError: setError,
      },
    )
  }

  return (
    <DialogoOperacionShell
      titulo={`Promover con áreas pendientes — ${reprobados.length} ${uno ? "estudiante" : "estudiantes"}`}
      resumen={
        aptos.length ? (
          <ul className="grid gap-0.5 text-sm">
            {aptos.map((p) => (
              <li key={p.matriculaId}>
                {p.estudiante} · {p.grupo} · Áreas pendientes: {p.areas.map((a) => a.nombre).join(", ")}
              </li>
            ))}
          </ul>
        ) : undefined
      }
      onClose={onClose}
      error={error}
      pending={promover.isPending}
      className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
      confirmar={{
        label: "Promover con áreas pendientes",
        icon: <ChartLineUpIcon data-icon="inline-start" />,
        onClick: confirmar,
        disabled: cargando || !aptos.length,
      }}
    >
      {cargando ? (
        <Cargando />
      ) : (
        <div className="grid gap-4">
          {bloqueados.length ? (
            <Aviso tono="advertencia" titulo={uno ? undefined : "No se promoverán:"}>
              <ul className="grid gap-1">
                {bloqueados.map((p) => (
                  <li key={p.matriculaId}>{p.bloqueo}</li>
                ))}
              </ul>
            </Aviso>
          ) : null}
          {aptos.length ? (
            <>
              <Field variant="outlined" className="gap-2" data-invalid={Boolean(intento && errores.acta) || undefined}>
                <FieldLabel htmlFor="promover-acta">
                  <Obligatorio>Acta de la Comisión de evaluación y promoción</Obligatorio>
                </FieldLabel>
                <Input id="promover-acta" maxLength={30} value={acta} aria-invalid={Boolean(intento && errores.acta) || undefined} onChange={(e) => setActa(e.target.value)} />
                {intento && errores.acta ? <FieldError>{errores.acta}</FieldError> : <FieldDescription>Número del acta que decide la promoción.</FieldDescription>}
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CampoFecha
                  id="promover-fecha-acta"
                  label="Fecha del acta"
                  value={fechaActa}
                  onChange={setFechaActa}
                  minDate={minActa}
                  maxDate={new Date()}
                  error={intento ? errores.fechaActa : undefined}
                  ayuda="No posterior a hoy ni anterior al cierre académico."
                />
                <CampoFecha
                  id="promover-plazo"
                  label="Plazo para nivelar"
                  value={plazo}
                  onChange={setPlazo}
                  minDate={fechaActa}
                  maxDate={maxPlazo}
                  error={intento ? errores.plazo : undefined}
                  ayuda="El mismo para todas sus áreas pendientes."
                />
              </div>
              <Texto id="promover-observacion" label="Observación" max={OBSERVACION_MAX} value={observacion} onChange={setObservacion} />
              <Aviso tono="info">
                La matrícula pasa a Aprobado y su reserva de cupo, al grado siguiente. Sus áreas pendientes se controlan en la pestaña Áreas pendientes.
              </Aviso>
              <Requeridos />
            </>
          ) : null}
        </div>
      )}
    </DialogoOperacionShell>
  )
}

/* Áreas pendientes -------------------------------------------------------- */

export function DialogAnularPromocion({ promovido: p, onClose }: { promovido: Promovido; onClose: () => void }) {
  const { notify } = useNotify()
  const anular = useAnularPromocion()
  const [motivo, setMotivo] = useState("")
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  return (
    <DialogoOperacionShell
      titulo={`Anular promoción — ${p.estudiante}`}
      resumen={
        <span className="text-sm">
          Promovido de {p.promovidoDe} · {p.areasPendientes.length === 1 ? "Área pendiente" : "Áreas pendientes"}: {p.areasPendientes.join(", ")} · Plazo{" "}
          {formatoFecha(p.plazo)}
        </span>
      }
      onClose={onClose}
      error={error}
      pending={anular.isPending}
      confirmar={{
        label: "Anular promoción",
        color: "destructive",
        icon: <ProhibitIcon data-icon="inline-start" />,
        onClick: () => {
          setIntento(true)
          setError(null)
          if (errorMotivo(motivo)) return
          anular.mutate(
            { promocionId: p.promocionId, motivo: motivo.trim() },
            {
              onSuccess: () => {
                notify(`Se anuló la promoción de ${p.estudiante}.`, { variant: "success" })
                onClose()
              },
              onError: setError,
            },
          )
        },
      }}
    >
      <div className="grid gap-4">
        <Motivo id="anular-motivo" value={motivo} onChange={setMotivo} intento={intento} />
        <Aviso tono="info">La matrícula vuelve a Reprobado y su reserva de cupo, al mismo grado ({p.grado}).</Aviso>
        <Requeridos />
      </div>
    </DialogoOperacionShell>
  )
}

/** Bloqueo de un solo botón cuando ya tiene matrícula en el período siguiente o áreas niveladas. */
export function DialogAnulacionBloqueada({ promovido: p, onClose }: { promovido: Promovido; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular promoción — {p.estudiante}</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          No se puede anular la promoción de {p.estudiante} porque ya tiene matrícula en el período siguiente o áreas niveladas.
        </p>
        <DialogFooter>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={onClose}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DialogAmpliarPlazo({ promovido: p, detalle: d, onClose }: { promovido: Promovido; detalle: DetallePromocion; onClose: () => void }) {
  const { notify } = useNotify()
  const ampliar = useAmpliarPlazo()
  const [fecha, setFecha] = useState<Date | undefined>()
  const [motivo, setMotivo] = useState("")
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const actual = parseDateValue(d.plazo)
  const fin = parseDateValue(d.finPeriodo)
  const errorFecha = !fecha
    ? "La nueva fecha es obligatoria."
    : actual && fecha <= actual
      ? "La nueva fecha debe ser posterior al plazo actual."
      : fin && fecha > fin
        ? "La nueva fecha debe estar dentro del período académico de la matrícula promovida."
        : undefined
  return (
    <DialogoOperacionShell
      titulo={`Ampliar plazo — ${d.estudiante}`}
      resumen={
        <span className="text-sm">
          Promovido de {p.promovidoDe} · Plazo actual: {formatoFecha(d.plazo)} · Áreas pendientes: {p.total - p.niveladas} de {p.total}
        </span>
      }
      onClose={onClose}
      error={error}
      pending={ampliar.isPending}
      confirmar={{
        label: "Ampliar plazo",
        icon: <CalendarIcon data-icon="inline-start" />,
        onClick: () => {
          setIntento(true)
          setError(null)
          if (errorFecha || errorMotivo(motivo)) return
          ampliar.mutate(
            { promocionId: d.promocionId, plazo: formatDateValue(fecha), motivo: motivo.trim() },
            {
              onSuccess: () => {
                notify(`El plazo de ${d.estudiante} quedó hasta el ${formatoFecha(formatDateValue(fecha))}.`, { variant: "success" })
                onClose()
              },
              onError: setError,
            },
          )
        },
      }}
    >
      <div className="grid gap-4">
        <CampoFecha
          id="ampliar-fecha"
          label="Nueva fecha"
          value={fecha}
          onChange={setFecha}
          minDate={actual}
          maxDate={fin}
          error={intento ? errorFecha : undefined}
          ayuda={`Posterior al ${formatoFecha(d.plazo)} y dentro del período académico.`}
        />
        <Motivo id="ampliar-motivo" value={motivo} onChange={setMotivo} intento={intento} />
        <Requeridos />
      </div>
    </DialogoOperacionShell>
  )
}

function CampoNota({ value, onChange, error, min, max }: { value: string; onChange: (v: string) => void; error?: string; min: number; max: number }) {
  return (
    <Field variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor="nivelacion-nota">
        <Obligatorio>Nota</Obligatorio>
      </FieldLabel>
      <Input
        id="nivelacion-nota"
        inputMode="decimal"
        value={value}
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, "").slice(0, 4))}
      />
      {error ? <FieldError>{error}</FieldError> : <FieldDescription>Entre {formatoNota(min)} y {formatoNota(max)}, con un decimal.</FieldDescription>}
    </Field>
  )
}

function validarNota(v: string, min: number, max: number) {
  if (!v.trim()) return "La nota es obligatoria."
  const n = leerNota(v)
  if (Number.isNaN(n) || !/^\d{1,2}([.,]\d)?$/.test(v.trim())) return "Escriba la nota con un decimal como máximo."
  if (n < min || n > max) return `La nota debe estar entre ${formatoNota(min)} y ${formatoNota(max)}.`
  return undefined
}

function validarFecha(fecha: Date | undefined, fechaActa: string) {
  const acta = parseDateValue(fechaActa)
  if (!fecha) return "La fecha es obligatoria."
  if (fecha > finDelDia()) return "La fecha no puede ser posterior a hoy."
  if (acta && fecha < acta) return "La fecha no puede ser anterior a la fecha del acta."
  return undefined
}

/**
 * Registrar nivelación (Regla 65): al guardar, el back crea la [Ejecución] de
 * Nivelación de área pendiente y aplica el Modo de Cálculo de recuperación.
 */
interface PropsNivelacion {
  promovido: Promovido
  detalle: DetallePromocion
  area: AreaPendiente
  onClose: () => void
}

/** «Física (Noveno · 2027)». */
const areaDelAnio = (p: Promovido, area: AreaPendiente) => `${area.area} (${p.promovidoDe})`

export function DialogRegistrarNivelacion({ promovido: p, detalle: d, area, onClose }: PropsNivelacion) {
  const { notify } = useNotify()
  const { establecimientoId } = useOpcionesCascada("", "")
  const funcionarios = useOpcionesFuncionariosQuery({ establecimiento: establecimientoId }).data ?? []
  const registrar = useRegistrarNivelacion()
  const archivo = useRef<HTMLInputElement>(null)
  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())
  const [nota, setNota] = useState("")
  const [responsable, setResponsable] = useState("")
  const [soporte, setSoporte] = useState<File | null>(null)
  const [observacion, setObservacion] = useState("")
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [errorSoporte, setErrorSoporte] = useState<string>()

  const errores = {
    fecha: validarFecha(fecha, d.fechaActa),
    nota: validarNota(nota, d.notaMinima, d.notaMaxima),
    responsable: responsable ? undefined : "Elija quién evaluó.",
  }

  function elegir(f: File | undefined) {
    if (!f) return
    if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) return setErrorSoporte("El soporte debe ser PDF, JPG o PNG.")
    if (f.size > SOPORTE_MAX) return setErrorSoporte("El soporte no puede pesar más de 10 MB.")
    setErrorSoporte(undefined)
    setSoporte(f)
  }

  return (
    <DialogoOperacionShell
      titulo="Registrar nivelación"
      resumen={
        <span className="text-sm">
          {d.estudiante} · {areaDelAnio(p, area)} · plazo {formatoFecha(d.plazo)}
        </span>
      }
      onClose={onClose}
      error={error}
      pending={registrar.isPending}
      className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
      confirmar={{
        label: "Registrar nivelación",
        icon: <CheckIcon data-icon="inline-start" />,
        onClick: () => {
          setIntento(true)
          setError(null)
          if (errores.fecha || errores.nota || errores.responsable || errorSoporte) return
          registrar.mutate(
            {
              promocionId: d.promocionId,
              areaId: area.id,
              fecha: formatDateValue(fecha),
              nota: leerNota(nota),
              funcionarioId: Number(responsable),
              observacion: observacion.trim() || null,
              soporte,
            },
            {
              onSuccess: () => {
                notify(`Se registró la nivelación de ${area.area} de ${d.estudiante}.`, { variant: "success" })
                onClose()
              },
              onError: setError,
            },
          )
        },
      }}
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoFecha
            id="nivelacion-fecha"
            label="Fecha"
            value={fecha}
            onChange={setFecha}
            minDate={parseDateValue(d.fechaActa)}
            maxDate={new Date()}
            error={intento ? errores.fecha : undefined}
            ayuda="No posterior a hoy ni anterior a la fecha del acta."
          />
          <CampoNota value={nota} onChange={setNota} min={d.notaMinima} max={d.notaMaxima} error={intento ? errores.nota : undefined} />
        </div>
        <ComboOpciones
          id="nivelacion-responsable"
          label="Responsable de enseñanza que evaluó"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={responsable}
          options={funcionarios.map((f) => ({ value: String(f.fk_tfuncionario), label: f.nombre }))}
          onChange={(v) => setResponsable(v ?? "")}
          error={intento ? errores.responsable : undefined}
        />
        <div className="grid gap-2">
          <span id="nivelacion-soporte-label" className="text-sm font-medium">
            Soporte
          </span>
          <input
            ref={archivo}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            aria-labelledby="nivelacion-soporte-label"
            onChange={(e) => {
              elegir(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          {soporte ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span className="truncate">{soporte.name}</span>
              <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label="Quitar soporte" onClick={() => setSoporte(null)}>
                <XIcon />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" color="neutral" size="sm" className="justify-self-start" onClick={() => archivo.current?.click()}>
              <UploadSimpleIcon data-icon="inline-start" />
              Subir PDF, JPG o PNG
            </Button>
          )}
          {errorSoporte ? <p className="text-xs text-red">{errorSoporte}</p> : <p className="text-xs text-muted-foreground">Opcional. PDF, JPG o PNG · máx. 10 MB.</p>}
        </div>
        <Texto id="nivelacion-observacion" label="Observación" max={OBSERVACION_MAX} value={observacion} onChange={setObservacion} />
        <Aviso tono="info">
          Se crea la actividad de nivelación en Gestión académica. La nota final de {area.area} de {p.anio} se mostrará como{" "}
          {formatoNota(area.notaFinal)} → {validarNota(nota, d.notaMinima, d.notaMaxima) ? "la nota de nivelación" : formatoNota(leerNota(nota))}, sin
          recalcular el año.
        </Aviso>
        <Requeridos />
      </div>
    </DialogoOperacionShell>
  )
}

/** Corregir nivelación: solo el último intento; fecha y nota con motivo. El responsable no se edita. */
export function DialogCorregirNivelacion({ promovido: p, detalle: d, area, onClose }: PropsNivelacion) {
  const { notify } = useNotify()
  const { data: usuario } = useUser()
  const corregir = useCorregirNivelacion()
  const ultimo = area.intentos.at(-1)
  const [fecha, setFecha] = useState<Date | undefined>(() => (ultimo ? parseDateValue(ultimo.fecha) : undefined))
  const [nota, setNota] = useState(() => (ultimo ? formatoNota(ultimo.nota) : ""))
  const [motivo, setMotivo] = useState("")
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  if (!ultimo) return null
  const errores = { fecha: validarFecha(fecha, d.fechaActa), nota: validarNota(nota, d.notaMinima, d.notaMaxima) }
  return (
    <DialogoOperacionShell
      titulo={`Corregir nivelación — ${d.estudiante}`}
      resumen={
        <span className="text-sm">
          {areaDelAnio(p, area)} · Último intento: {formatoFecha(ultimo.fecha)} con {formatoNota(ultimo.nota)} · Responsable de enseñanza:{" "}
          {ultimo.responsable}
        </span>
      }
      onClose={onClose}
      error={error}
      pending={corregir.isPending}
      className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
      confirmar={{
        label: "Corregir nivelación",
        icon: <PencilIcon data-icon="inline-start" />,
        onClick: () => {
          setIntento(true)
          setError(null)
          if (errores.fecha || errores.nota || errorMotivo(motivo)) return
          corregir.mutate(
            { promocionId: d.promocionId, areaId: area.id, fecha: formatDateValue(fecha), nota: leerNota(nota), motivo: motivo.trim() },
            {
              onSuccess: () => {
                notify(`Se corrigió la nivelación de ${area.area} de ${d.estudiante}.`, { variant: "success" })
                onClose()
              },
              onError: setError,
            },
          )
        },
      }}
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoFecha
            id="corregir-fecha"
            label="Fecha"
            value={fecha}
            onChange={setFecha}
            minDate={parseDateValue(d.fechaActa)}
            maxDate={new Date()}
            error={intento ? errores.fecha : undefined}
            ayuda="No posterior a hoy ni anterior a la fecha del acta."
          />
          <CampoNota value={nota} onChange={setNota} min={d.notaMinima} max={d.notaMaxima} error={intento ? errores.nota : undefined} />
        </div>
        <Field variant="outlined" className="gap-2">
          <FieldLabel htmlFor="corregir-responsable">Responsable de enseñanza que evaluó</FieldLabel>
          <Input id="corregir-responsable" value={usuario?.name ?? ""} disabled />
          <FieldDescription>No se edita: queda quien corrige.</FieldDescription>
        </Field>
        <Motivo id="corregir-motivo" value={motivo} onChange={setMotivo} intento={intento} />
        <Aviso tono="info">
          La corrección actualiza la actividad de Nivelación de área pendiente en Gestión académica. Con la nueva nota, el área puede quedar Nivelada.
        </Aviso>
        <Requeridos />
      </div>
    </DialogoOperacionShell>
  )
}
