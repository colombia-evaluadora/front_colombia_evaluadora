import { useState, type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  FloppyDiskIcon,
  InfoIcon,
  ProhibitIcon,
  SpinnerIcon,
  WarningIcon,
  XIcon,
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { toDigitsOnly } from "@/lib/text-input"
import { cn } from "@/lib/utils"

import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import {
  useAceptarConvenio,
  useCrearConvenios,
  useFinalizarConvenio,
  useOpcionesConvenioQuery,
  usePreviaAceptarQuery,
  usePreviaRenovarQuery,
  useRechazarConvenio,
  useRenovarConvenio,
} from "@/features/coverage/matricula-complementaria/api/convenios"
import type { Convenio, Opcion } from "@/features/coverage/matricula-complementaria/api/types"
import { Aviso } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

type AvisoError = { id: number; message: string } | null
const MOTIVO_MIN = 10
const MOTIVO_MAX = 500

function Cargando() {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <SpinnerIcon className="animate-spin" aria-hidden />
      Cargando…
    </div>
  )
}

function Titulo({ children, icono }: { children: ReactNode; icono?: "alerta" | "info" }) {
  return (
    <div className="flex items-center gap-2">
      {icono === "alerta" ? <WarningIcon className="size-6 shrink-0 text-yellow" aria-hidden /> : null}
      {icono === "info" ? <InfoIcon className="size-6 shrink-0 text-blue" aria-hidden /> : null}
      <DialogTitle>{children}</DialogTitle>
    </div>
  )
}

function Botones({
  onCancel,
  pending,
  onConfirm,
  label,
  icon,
  destructivo,
  disabled,
}: {
  onCancel: () => void
  pending: boolean
  onConfirm: () => void
  label: string
  icon: ReactNode
  destructivo?: boolean
  disabled?: boolean
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" color="neutral" size="sm" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="button" variant="fill" color={destructivo ? "destructive" : "primary"} size="sm" disabled={pending || disabled} onClick={onConfirm}>
        {pending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : icon}
        {label}
      </Button>
    </DialogFooter>
  )
}

const Requeridos = () => <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

/** Los datos del convenio en una tabla de dos columnas. */
export function ResumenConvenio({ c }: { c: Convenio }) {
  const filas: [string, string][] = [
    ["Establecimiento que recibe", c.receptor],
    ["Establecimiento de origen", c.origen],
    ["Año", String(c.anio)],
    ["Períodos académicos", c.periodos.map((p) => p.nombre).join(" · ")],
    ["Grados", c.grados.join(", ")],
    ["Especialidades", c.especialidades.join(", ")],
    ["Cupo máximo de adscritos", c.cupoMaximo == null ? "Sin límite" : String(c.cupoMaximo)],
  ]
  if (c.documentos.length) filas.push(["Documentos requeridos", c.documentos.join(", ")])
  if (c.motivo) filas.push(["Motivo", c.motivo])
  return (
    <dl className="grid overflow-hidden rounded-md border border-border text-sm sm:grid-cols-[auto_1fr] [&>:last-child]:border-b-0 sm:[&>:nth-last-child(2)]:border-b-0">
      {filas.map(([t, v]) => (
        <div key={t} className="contents">
          <dt className="border-b border-border bg-muted/40 px-4 py-2.5 text-muted-foreground">{t}</dt>
          <dd className="border-b border-border px-4 py-2.5">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Motivo({ id, value, onChange, invalido }: { id: string; value: string; onChange: (v: string) => void; invalido: boolean }) {
  return (
    <Field variant="outlined" className="gap-1.5" data-invalid={invalido || undefined}>
      <FieldLabel htmlFor={id}>
        Motivo<span data-required-mark="">*</span>
      </FieldLabel>
      <div className="relative">
        <Textarea
          id={id}
          rows={3}
          maxLength={MOTIVO_MAX}
          value={value}
          aria-invalid={invalido}
          className={cn(TEXTAREA_OUTLINED, "pr-16")}
          onChange={(e) => onChange(e.target.value)}
        />
        <CharacterCounter value={value} max={MOTIVO_MAX} className="absolute top-3 right-3" />
      </div>
      <FieldDescription className={cn(invalido && "text-red")}>
        Entre {MOTIVO_MIN} y {MOTIVO_MAX} caracteres.
      </FieldDescription>
    </Field>
  )
}

const motivoValido = (m: string) => m.trim().length >= MOTIVO_MIN && m.trim().length <= MOTIVO_MAX

export function DialogDetalleConvenio({ convenio: c, onOpenChange }: { convenio: Convenio; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Convenio con {c.contraparte}</DialogTitle>
        </DialogHeader>
        <ResumenConvenio c={c} />
        <DialogFooter>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Aceptar (el origen): las especialidades del convenio se agregan al catálogo de
 * sus sedes (Establecimiento, Regla 115). Si una sede ya tiene una con el mismo
 * nombre, pregunta por cada una: Vincular o Crear aparte.
 */
export function DialogAceptarConvenio({ convenio: c, onOpenChange }: { convenio: Convenio; onOpenChange: (o: boolean) => void }) {
  const { notify } = useNotify()
  const { data, isPending } = usePreviaAceptarQuery(c.id)
  const aceptar = useAceptarConvenio()
  const [acciones, setAcciones] = useState<Record<string, "VINCULAR" | "CREAR">>({})
  const [aviso, setAviso] = useState<AvisoError>(null)
  const clave = (x: { especialidadId: number; sede: string }) => `${x.especialidadId}-${x.sede}`
  const conflictos = data?.conflictos ?? []

  return (
    <Dialog open onOpenChange={(o) => !aceptar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <Titulo icono={conflictos.length ? "alerta" : "info"}>Aceptar convenio con {c.receptor}</Titulo>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        {isPending ? (
          <Cargando />
        ) : (
          <>
            <ResumenConvenio c={c} />
            <div className="grid gap-2 text-sm">
              <p>Sus estudiantes podrán postularse a la convocatoria de {c.receptor} en estos grados y especialidades.</p>
              <p>Al aceptar, se agregan al catálogo de sus sedes con esos grados las especialidades del convenio, con el mismo nombre.</p>
            </div>
            {conflictos.map((x) => (
              <fieldset key={clave(x)} className="grid gap-2 rounded-md border border-yellow-stroke bg-yellow-22 px-4 py-3 text-sm">
                <legend className="sr-only">{x.especialidad}</legend>
                <p>
                  La sede <b>{x.sede}</b> ya tiene una especialidad llamada <b>{x.especialidad}</b>.
                </p>
                <RadioGroup
                  className="grid gap-1.5"
                  value={acciones[clave(x)] ?? "VINCULAR"}
                  onValueChange={(v) => setAcciones((prev) => ({ ...prev, [clave(x)]: v as "VINCULAR" | "CREAR" }))}
                >
                  <label className="flex cursor-pointer items-center gap-2">
                    <RadioGroupItem value="VINCULAR" />
                    Vincular: es la misma que la de {c.receptor}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <RadioGroupItem value="CREAR" />
                    Crear aparte: «{x.especialidad} ({c.receptor})»
                  </label>
                </RadioGroup>
              </fieldset>
            ))}
            {conflictos.length && data?.nuevas.length ? (
              <p className="text-xs text-muted-foreground">
                {data.nuevas.join(", ")} no {data.nuevas.length === 1 ? "existe" : "existen"} en la sede: se {data.nuevas.length === 1 ? "agrega" : "agregan"} sin
                preguntar.
              </p>
            ) : null}
          </>
        )}
        <Botones
          onCancel={() => onOpenChange(false)}
          pending={aceptar.isPending}
          label="Aceptar"
          icon={<CheckIcon data-icon="inline-start" />}
          disabled={!data}
          onConfirm={() =>
            aceptar.mutate(
              { id: c.id, vinculos: conflictos.map((x) => ({ especialidadId: x.especialidadId, sede: x.sede, accion: acciones[clave(x)] ?? "VINCULAR" })) },
              {
                onSuccess: () => {
                  notify(`Se aceptó el convenio con ${c.receptor}.`, { variant: "success" })
                  onOpenChange(false)
                },
                onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
              },
            )
          }
        />
      </DialogContent>
    </Dialog>
  )
}

/** Rechazar (el origen): es final; para volver a intentarlo el que recibe crea uno nuevo. */
export function DialogRechazarConvenio({ convenio: c, onOpenChange }: { convenio: Convenio; onOpenChange: (o: boolean) => void }) {
  const { notify } = useNotify()
  const rechazar = useRechazarConvenio()
  const [motivo, setMotivo] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<AvisoError>(null)
  return (
    <Dialog open onOpenChange={(o) => !rechazar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <Titulo icono="alerta">Rechazar convenio con {c.receptor}</Titulo>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <ResumenConvenio c={c} />
        <Motivo id="rechazar-motivo" value={motivo} onChange={setMotivo} invalido={intentado && !motivoValido(motivo)} />
        <Requeridos />
        <Botones
          onCancel={() => onOpenChange(false)}
          pending={rechazar.isPending}
          destructivo
          label="Rechazar"
          icon={<XIcon data-icon="inline-start" />}
          onConfirm={() => {
            setIntentado(true)
            if (!motivoValido(motivo)) return
            rechazar.mutate(
              { id: c.id, motivo: motivo.trim() },
              {
                onSuccess: () => {
                  notify(`Se rechazó el convenio con ${c.receptor}.`, { variant: "success" })
                  onOpenChange(false)
                },
                onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
              },
            )
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/** Finalizar (cualquiera de las partes; si está Propuesto, solo el que recibe). */
export function DialogFinalizarConvenio({ convenio: c, onOpenChange }: { convenio: Convenio; onOpenChange: (o: boolean) => void }) {
  const { notify } = useNotify()
  const finalizar = useFinalizarConvenio()
  const [motivo, setMotivo] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<AvisoError>(null)
  return (
    <Dialog open onOpenChange={(o) => !finalizar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <Titulo icono="alerta">Finalizar convenio con {c.contraparte}</Titulo>
          <DialogDescription>Las complementarias ya creadas siguen hasta el cierre del año.</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <Motivo id="finalizar-motivo" value={motivo} onChange={setMotivo} invalido={intentado && !motivoValido(motivo)} />
        <Aviso tono="advertencia" titulo={`Las postulaciones de ${c.origen} que no estén Adscrito quedarán Descartadas.`} />
        <Requeridos />
        <Botones
          onCancel={() => onOpenChange(false)}
          pending={finalizar.isPending}
          destructivo
          label="Finalizar"
          icon={<ProhibitIcon data-icon="inline-start" />}
          onConfirm={() => {
            setIntentado(true)
            if (!motivoValido(motivo)) return
            finalizar.mutate(
              { id: c.id, motivo: motivo.trim() },
              {
                onSuccess: () => {
                  notify(`Se finalizó el convenio con ${c.contraparte}.`, { variant: "success" })
                  onOpenChange(false)
                },
                onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
              },
            )
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function Lectura({ id, label, valor }: { id: string; label: string; valor: string }) {
  return (
    <Field variant="outlined" className="gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} size="sm" value={valor} disabled readOnly />
    </Field>
  )
}

/** Renovar (el que recibe): un convenio Propuesto del año siguiente con los mismos datos. */
export function DialogRenovarConvenio({ convenio: c, onOpenChange }: { convenio: Convenio; onOpenChange: (o: boolean) => void }) {
  const { notify } = useNotify()
  const { data, isPending } = usePreviaRenovarQuery(c.id)
  const renovar = useRenovarConvenio()
  const [elegidos, setElegidos] = useState<Opcion[] | null>(null)
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<AvisoError>(null)
  const periodos = elegidos ?? (data?.periodos ?? []).filter((p) => data?.equivalentes.includes(p.id))
  const invalido = intentado && periodos.length === 0

  return (
    <Dialog open onOpenChange={(o) => !renovar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <Titulo>Renovar convenio con {c.origen}</Titulo>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        {isPending ? (
          <Cargando />
        ) : (
          <>
            <Field variant="outlined" className="gap-1.5" data-invalid={invalido || undefined}>
              <FieldLabel>
                Períodos académicos del año siguiente<span data-required-mark="">*</span>
              </FieldLabel>
              <SelectorChips
                items={data?.periodos ?? []}
                value={periodos}
                onChange={setElegidos}
                getId={(p) => p.id}
                getLabel={(p) => p.nombre}
                visibles={4}
                conFlecha
                ariaLabel="Períodos académicos del año siguiente"
                invalido={invalido}
              />
              <FieldDescription className={cn(invalido && "text-red")}>
                {invalido ? "Elija al menos un período." : "Por defecto, los equivalentes de la misma sede y jornada."}
              </FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Lectura id="renovar-grados" label="Grados" valor={c.grados.join(", ")} />
              <Lectura id="renovar-cupo" label="Cupo máximo de adscritos" valor={c.cupoMaximo == null ? "Sin límite" : String(c.cupoMaximo)} />
            </div>
            <Lectura id="renovar-especialidades" label="Especialidades" valor={c.especialidades.join(", ")} />
            <Aviso tono="info" titulo="Se crea un convenio Propuesto con los mismos datos.">
              {c.origen} debe aceptarlo de nuevo. La continuidad automática solo se genera con el convenio Aceptado.
            </Aviso>
            <Requeridos />
          </>
        )}
        <Botones
          onCancel={() => onOpenChange(false)}
          pending={renovar.isPending}
          label="Renovar"
          icon={<ArrowCounterClockwiseIcon data-icon="inline-start" />}
          disabled={!data}
          onConfirm={() => {
            setIntentado(true)
            if (!periodos.length) return
            renovar.mutate(
              { id: c.id, periodoIds: periodos.map((p) => p.id) },
              {
                onSuccess: () => {
                  notify(`Se propuso el convenio ${c.anio + 1} a ${c.origen}.`, { variant: "success" })
                  onOpenChange(false)
                },
                onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
              },
            )
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/** Nuevo convenio (el que recibe): uno por cada origen, todos Propuestos. */
export function DialogNuevoConvenio({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const { notify } = useNotify()
  const { data: op, isPending } = useOpcionesConvenioQuery()
  const crear = useCrearConvenios()
  const [origenes, setOrigenes] = useState<Opcion[]>([])
  const [periodos, setPeriodos] = useState<Opcion[]>([])
  const [grados, setGrados] = useState<Opcion[]>([])
  const [especialidades, setEspecialidades] = useState<Opcion[]>([])
  const [cupo, setCupo] = useState("")
  const [documentos, setDocumentos] = useState<string[]>([])
  const [documento, setDocumento] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<AvisoError>(null)

  const periodosOp = (op?.periodos ?? []).filter((p) => !periodos.length || p.anio === (op?.periodos.find((x) => x.id === periodos[0].id)?.anio ?? p.anio))
  const anio = op?.periodos.find((p) => p.id === periodos[0]?.id)?.anio
  // Grados de los períodos elegidos cuyo plan tiene especialidades.
  const gradosOp = new Map<number, Opcion & { especialidades: number[] }>()
  for (const p of op?.periodos ?? []) if (periodos.some((x) => x.id === p.id)) for (const g of p.grados) if (g.especialidades.length) gradosOp.set(g.id, g)
  const enGrados = (espId: number) => [...gradosOp.values()].filter((g) => grados.some((x) => x.id === g.id) && g.especialidades.includes(espId))
  const especialidadesOp = (op?.especialidades ?? []).filter((e) => enGrados(e.id).length > 0)
  const elegidasConGrados = especialidadesOp.map((e) => `${e.nombre} (${enGrados(e.id).map((g) => g.nombre).join(", ")})`)

  // Grados completos: con continuidad automática, avisar si falta el grado siguiente de una especialidad.
  const faltantes = op?.continuidadAutomatica
    ? especialidades.flatMap((e) => {
        // Solo los grados siguientes al menor elegido con esa especialidad.
        const elegidos = enGrados(e.id).map((g) => g.id)
        if (!elegidos.length) return []
        const desde = Math.min(...elegidos)
        return [...gradosOp.values()]
          .filter((g) => g.id > desde && g.especialidades.includes(e.id) && !grados.some((x) => x.id === g.id))
          .map((g) => `${g.nombre} en ${e.nombre}`)
      })
    : []

  const documentoValido = documento.trim().length >= 3 && documento.trim().length <= 80
  const agregarDocumento = () => {
    const d = documento.trim()
    if (!documentoValido || documentos.includes(d) || documentos.length >= 10) return
    setDocumentos([...documentos, d])
    setDocumento("")
  }

  const errores = {
    origenes: origenes.length === 0,
    periodos: periodos.length === 0,
    grados: grados.length === 0,
    especialidades: especialidades.length === 0,
    cupo: cupo !== "" && Number(cupo) < 1,
  }

  return (
    <Dialog open onOpenChange={(o) => !crear.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo convenio de adscripción</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        {isPending || !op ? (
          <Cargando />
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Lectura id="convenio-receptor" label="Establecimiento que recibe" valor={op.establecimiento} />
              <Chips
                label="Establecimientos de origen"
                items={op.establecimientos}
                value={origenes}
                onChange={setOrigenes}
                invalido={intentado && errores.origenes}
                ayuda="Se crea un convenio por cada origen."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[3fr_1fr]">
              <Chips
                label="Períodos académicos"
                items={periodosOp}
                value={periodos}
                onChange={(v) => {
                  setPeriodos(v)
                  setGrados([])
                  setEspecialidades([])
                }}
                invalido={intentado && errores.periodos}
                ayuda="En Inscripciones o Abierto, de un mismo año."
              />
              <Lectura id="convenio-anio" label="Año" valor={anio ? String(anio) : "—"} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Chips
                label="Grados"
                items={[...gradosOp.values()]}
                value={grados}
                onChange={(v) => {
                  setGrados(v)
                  setEspecialidades([])
                }}
                invalido={intentado && errores.grados}
                ayuda="Solo grados con asignaturas de especialidad en el plan."
              />
              <Field variant="outlined" className="gap-1.5" data-invalid={(intentado && errores.cupo) || undefined}>
                <FieldLabel htmlFor="convenio-cupo">Cupo máximo de adscritos</FieldLabel>
                <Input
                  id="convenio-cupo"
                  size="sm"
                  inputMode="numeric"
                  placeholder="Sin límite"
                  value={cupo}
                  onChange={(e) => setCupo(toDigitsOnly(e.target.value, 4))}
                />
                <FieldDescription>Un solo número para todos los períodos.</FieldDescription>
              </Field>
            </div>
            <Chips
              label="Especialidades"
              items={especialidadesOp}
              value={especialidades}
              onChange={setEspecialidades}
              invalido={intentado && errores.especialidades}
              ayuda={
                especialidadesOp.length
                  ? `Solo las que tienen asignaturas en el plan de los grados elegidos: ${elegidasConGrados.join(" · ")}.`
                  : "Elija primero los períodos y los grados."
              }
            />
            {especialidades.length ? (
              <p className="-mt-2 text-xs text-muted-foreground">
                Capacidad actual (informativa):{" "}
                {especialidades
                  .map((e) => `${e.nombre} ${op.especialidades.find((x) => x.id === e.id)?.libres ?? 0} puestos libres`)
                  .join(" · ")}
                , en los grupos que ya las dictan. No se exigen grupos.
              </p>
            ) : null}

            <Field variant="outlined" className="gap-1.5">
              <FieldLabel htmlFor="convenio-documento">Documentos requeridos</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="convenio-documento"
                  size="sm"
                  maxLength={80}
                  placeholder="Ej.: Formato de inscripción"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      agregarDocumento()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  color="neutral"
                  size="sm"
                  disabled={!documentoValido || documentos.length >= 10}
                  onClick={agregarDocumento}
                >
                  Agregar
                </Button>
              </div>
              {documentos.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {documentos.map((d) => (
                    <Badge key={d} variant="outline" color="neutral" className="rounded-full text-xs font-normal tracking-normal">
                      {d}
                      <button
                        type="button"
                        aria-label={`Quitar ${d}`}
                        className="rounded-xs hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={() => setDocumentos(documentos.filter((x) => x !== d))}
                      >
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}
              <FieldDescription>
                Los que el que recibe pide al estudiante para formalizar la matrícula. Hasta 10, de 3 a 80 caracteres.
              </FieldDescription>
            </Field>

            {faltantes.length ? (
              <Aviso tono="advertencia" titulo={`Para que los estudiantes continúen, incluya también ${faltantes.join(" y ")}.`} />
            ) : null}
            <div className="grid gap-1 text-xs text-muted-foreground">
              <p>Al guardar quedan Propuestos hasta que cada origen lo acepte o lo rechace.</p>
              <p>Los campos marcados con * son obligatorios</p>
            </div>
          </div>
        )}
        <Botones
          onCancel={() => onOpenChange(false)}
          pending={crear.isPending}
          label="Guardar"
          icon={<FloppyDiskIcon data-icon="inline-start" />}
          disabled={!op}
          onConfirm={() => {
            setIntentado(true)
            if (Object.values(errores).some(Boolean)) return
            crear.mutate(
              {
                origenIds: origenes.map((o) => o.id),
                periodoIds: periodos.map((p) => p.id),
                gradoIds: grados.map((g) => g.id),
                especialidadIds: especialidades.map((e) => e.id),
                cupoMaximo: cupo ? Number(cupo) : null,
                documentos,
              },
              {
                onSuccess: () => {
                  notify(
                    origenes.length === 1
                      ? `Se propuso el convenio a ${origenes[0].nombre}.`
                      : `Se propusieron ${origenes.length} convenios, uno por cada origen.`,
                    { variant: "success" },
                  )
                  onOpenChange(false)
                },
                onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
              },
            )
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function Chips({
  label,
  items,
  value,
  onChange,
  invalido,
  ayuda,
}: {
  label: string
  items: Opcion[]
  value: Opcion[]
  onChange: (v: Opcion[]) => void
  invalido: boolean
  ayuda: string
}) {
  return (
    <Field variant="outlined" className="min-w-0 gap-1.5" data-invalid={invalido || undefined}>
      <FieldLabel>
        {label}
        <span data-required-mark="">*</span>
      </FieldLabel>
      <SelectorChips
        items={items}
        value={value}
        onChange={onChange}
        getId={(o) => o.id}
        getLabel={(o) => o.nombre}
        visibles={6}
        conFlecha
        ariaLabel={label}
        placeholder={value.length ? "" : "Seleccione"}
        invalido={invalido}
      />
      <FieldDescription className={cn(invalido && "text-red")}>{invalido ? `Elija al menos uno.` : ayuda}</FieldDescription>
    </Field>
  )
}
