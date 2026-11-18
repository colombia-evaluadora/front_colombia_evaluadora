import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/date-picker"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import { InfoIcon, WarningIcon } from "@/components/ui/icons"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import {
  useConfiguracionQuery,
  useGuardarConfiguracion,
  useLevantarSuspension,
  useMensajesReportadosQuery,
  useReportarConversacion,
  useReportesQuery,
  useRevisarReporte,
  useSuspender,
  useSuspensionesQuery,
} from "@/features/comunicaciones/chat/api/use-moderacion"
import { textoPlano } from "@/features/comunicaciones/chat/lib/menciones"

const MAX_MOTIVO = 500

function Motivo({ valor, onCambiar, placeholder }: { valor: string; onCambiar: (v: string) => void; placeholder: string }) {
  const id = useId()
  return (
    <Field variant="outlined">
      <FieldLabel htmlFor={id}>
        Motivo<span className="text-red"> *</span>
      </FieldLabel>
      <Textarea
        id={id}
        value={valor}
        maxLength={MAX_MOTIVO}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => onCambiar(e.target.value)}
        className={TEXTAREA_OUTLINED}
      />
      <CharacterCounter value={valor} max={MAX_MOTIVO} />
    </Field>
  )
}

/** M.2.MOD.1: disponible para cualquier participante. */
export function ReportarDialog({
  conversacionId,
  nombre,
  open,
  onClose,
  onReportada,
}: {
  conversacionId: number
  nombre: string
  open: boolean
  onClose: () => void
  onReportada: () => void
}) {
  const [motivo, setMotivo] = useState("")
  const reportar = useReportarConversacion()
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !reportar.isPending && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Reportar conversación — {nombre}</DialogTitle>
          <DialogDescription>Avisaremos al Supervisor de sede, que podrá leer esta conversación.</DialogDescription>
        </DialogHeader>
        {reportar.isError && <p role="alert" className="text-sm text-red">{getErrorMessage(reportar.error)}</p>}
        <Motivo valor={motivo} onCambiar={setMotivo} placeholder="Describa lo que ocurrió" />
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={reportar.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!motivo.trim() || reportar.isPending}
            onClick={() =>
              reportar.mutate({ conversacionId, motivo: motivo.trim() }, { onSuccess: () => { setMotivo(""); onReportada() } })
            }
          >
            Reportar conversación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type Pestana = "reportes" | "suspensiones" | "configuracion"

/**
 * Opción de la vista de mensajería (Guía M.2.MOD.1). PROVISIONAL: Supervisor de sede = coordinador,
 * Administrador del establecimiento = rector. Suspensiones y configuración, solo el rector.
 */
export function ModeracionDialog({
  open,
  onClose,
  esAdministrador,
  reporteResaltado,
}: {
  open: boolean
  onClose: () => void
  esAdministrador: boolean
  reporteResaltado?: number
}) {
  const [pestana, setPestana] = useState<Pestana>("reportes")
  const pestanas: [Pestana, string][] = esAdministrador
    ? [["reportes", "Reportes"], ["suspensiones", "Suspensiones"], ["configuracion", "Configuración de la mensajería"]]
    : [["reportes", "Reportes"]]
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Moderación de la mensajería</DialogTitle>
        </DialogHeader>
        <div role="tablist" className="flex flex-wrap gap-1 border-b pb-2">
          {pestanas.map(([id, etiqueta]) => (
            <Button key={id} role="tab" aria-selected={pestana === id} size="sm" variant={pestana === id ? "soft" : "ghost"} onClick={() => setPestana(id)}>
              {etiqueta}
            </Button>
          ))}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {pestana === "reportes" && <Reportes activo={open} esAdministrador={esAdministrador} resaltado={reporteResaltado} />}
          {pestana === "suspensiones" && <Suspensiones activo={open} />}
          {pestana === "configuracion" && <Configuracion activo={open} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const fechaCorta = (iso: string) => new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })

function Reportes({ activo, esAdministrador, resaltado }: { activo: boolean; esAdministrador: boolean; resaltado?: number }) {
  const reportes = useReportesQuery(activo)
  const [elegido, setElegido] = useState<number | null>(null)
  const revisar = useRevisarReporte()
  const mensajes = useMensajesReportadosQuery(elegido)
  const [suspender, setSuspender] = useState<{ id: number; nombre: string } | null>(null)
  if (reportes.isPending) return <p className="p-3 text-sm text-muted-foreground">Cargando…</p>
  if (reportes.isError) return <p role="alert" className="text-sm text-red">{getErrorMessage(reportes.error)}</p>
  if (reportes.data.length === 0) return <p className="p-3 text-sm text-muted-foreground">No hay conversaciones reportadas.</p>
  const autores = [...new Map((mensajes.data ?? []).map((m) => [m.autor.id, m.autor.nombre])).entries()]
  return (
    <ul className="space-y-2">
      {reportes.data.map((r) => (
        <li
          key={r.id}
          aria-current={resaltado === r.id ? "true" : undefined}
          className={cn("rounded-lg border p-3 text-sm", resaltado === r.id && "border-primary ring-1 ring-primary")}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{r.conversacion}</span>
            <span className="text-xs text-muted-foreground">
              {r.reportante} · {fechaCorta(r.fecha)} · {r.estado === "PENDIENTE" ? "Pendiente" : "Revisado"}
            </span>
          </div>
          <p className="mt-1">{r.motivo}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setElegido(elegido === r.id ? null : r.id)}>
              {elegido === r.id ? "Cerrar conversación" : "Ver conversación"}
            </Button>
            {r.estado === "PENDIENTE" && (
              <Button size="sm" variant="ghost" disabled={revisar.isPending} onClick={() => revisar.mutate(r.id)}>
                Marcar revisado
              </Button>
            )}
          </div>
          {revisar.isError && <p role="alert" className="text-sm text-red">{getErrorMessage(revisar.error)}</p>}
          {elegido === r.id && (
            <div className="mt-3 space-y-2 border-t pt-3" aria-label="Conversación reportada, solo lectura">
              {mensajes.isError && <p role="alert" className="text-sm text-red">{getErrorMessage(mensajes.error)}</p>}
              {(mensajes.data ?? []).map((m) => (
                <p key={m.id}>
                  <span className="font-medium">{m.autor.nombre}</span>{" "}
                  <span className="text-xs text-muted-foreground">{fechaCorta(m.fecha)}</span>
                  <br />
                  {m.eliminado ? <em>Mensaje retirado por el remitente</em> : textoPlano(m.texto, m.menciones)}
                </p>
              ))}
              {esAdministrador && autores.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t pt-2">
                  {autores.map(([id, nombre]) => (
                    <Button key={id} size="sm" variant="ghost" color="destructive" onClick={() => setSuspender({ id, nombre })}>
                      Suspender a {nombre}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
          {suspender && elegido === r.id && (
            <SuspenderDialog persona={suspender} reporteId={r.id} onClose={() => setSuspender(null)} />
          )}
        </li>
      ))}
    </ul>
  )
}

/** Botón de la ficha de la persona en el chat; solo el rector lo ve (el servidor también lo exige). */
export function SuspenderPersona({ persona }: { persona: { id: number; nombre: string; rol?: string } }) {
  const roles = useAuth().user?.roles ?? []
  const [abierto, setAbierto] = useState(false)
  if (!roles.includes("CEVAL-RECTOR")) return null
  return (
    <>
      <button
        type="button"
        aria-label={`Suspender mensajería de ${persona.nombre}`}
        title="Suspender mensajería"
        onClick={() => setAbierto(true)}
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-red-22 hover:text-red focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <WarningIcon className="size-4" />
      </button>
      {abierto && <SuspenderDialog persona={persona} reporteId={null} onClose={() => setAbierto(false)} />}
    </>
  )
}

// M.2.MOD.2: "Pedro Gil (acudiente) no podrá…"; el rol solo cuando se conoce (no viene en los autores del reporte).
function SuspenderDialog({ persona, reporteId, onClose }: { persona: { id: number; nombre: string; rol?: string }; reporteId: number | null; onClose: () => void }) {
  const [motivo, setMotivo] = useState("")
  const suspender = useSuspender()
  return (
    <Dialog open onOpenChange={(o) => !o && !suspender.isPending && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Suspender mensajería — {persona.nombre}</DialogTitle>
          <DialogDescription>
            <strong className="font-semibold text-foreground">{persona.nombre}</strong>
            {persona.rol ? ` (${persona.rol.toLowerCase()})` : ""} no podrá enviar mensajes internos hasta que se levante la suspensión.</DialogDescription>
        </DialogHeader>
        {suspender.isError && <p role="alert" className="text-sm text-red">{getErrorMessage(suspender.error)}</p>}
        <Motivo valor={motivo} onCambiar={setMotivo} placeholder="Describa el motivo" />
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={suspender.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="destructive"
            disabled={!motivo.trim() || suspender.isPending}
            onClick={() =>
              suspender.mutate(
                { usuarioId: persona.id, motivo: motivo.trim(), reporteId, venceEn: null /* M.2.MOD.2: sin vigencia; se levanta con "Levantar suspensión". */ },
                { onSuccess: onClose },
              )
            }
          >
            Suspender mensajería
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Suspensiones({ activo }: { activo: boolean }) {
  const suspensiones = useSuspensionesQuery(activo)
  const levantar = useLevantarSuspension()
  if (suspensiones.isPending) return <p className="p-3 text-sm text-muted-foreground">Cargando…</p>
  if (suspensiones.isError) return <p role="alert" className="text-sm text-red">{getErrorMessage(suspensiones.error)}</p>
  if (suspensiones.data.length === 0) return <p className="p-3 text-sm text-muted-foreground">No hay suspensiones vigentes.</p>
  return (
    <ul className="space-y-2">
      {levantar.isError && <p role="alert" className="text-sm text-red">{getErrorMessage(levantar.error)}</p>}
      {suspensiones.data.map((s) => (
        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
          <span>
            <span className="font-medium">{s.usuario}</span>: {s.motivo}
            <span className="block text-xs text-muted-foreground">
              Desde {fechaCorta(s.fecha)}
              {s.venceEn ? `, hasta ${fechaCorta(s.venceEn)}` : ", hasta que se levante"}
            </span>
          </span>
          <Button size="sm" variant="outline" disabled={levantar.isPending} onClick={() => levantar.mutate(s.id)}>
            Levantar suspensión
          </Button>
        </li>
      ))}
    </ul>
  )
}

interface ValoresConfiguracion {
  horaInicio: string
  horaFin: string
  incluyeSabado: boolean
  permitirMenoresIniciar: boolean
}

function Configuracion({ activo, onCancelar }: { activo: boolean; onCancelar?: () => void }) {
  const config = useConfiguracionQuery(activo)
  if (config.isPending) return <p className="p-3 text-sm text-muted-foreground">Cargando…</p>
  if (config.isError) return <p role="alert" className="text-sm text-red">{getErrorMessage(config.error)}</p>
  return (
    <FormConfiguracion
      onCancelar={onCancelar}
      inicial={{
        horaInicio: config.data?.horaInicio?.slice(0, 5) ?? "06:00",
        horaFin: config.data?.horaFin?.slice(0, 5) ?? "18:00",
        incluyeSabado: config.data?.incluyeSabado ?? false,
        permitirMenoresIniciar: config.data?.permitirMenoresIniciar ?? false,
      }}
    />
  )
}

/**
 * "Configuración de la mensajería — {Establecimiento}" (prototipo M.2.CFG.1): se abre desde la vista
 * Mensajería interna (Administrador del establecimiento) y también es la pestaña de Moderación.
 */
export function ConfiguracionMensajeriaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const establecimiento = useEstablishmentsOptionsQuery(open).data?.[0]?.name
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configuración de la mensajería{establecimiento ? ` — ${establecimiento}` : ""}</DialogTitle>
        </DialogHeader>
        <Configuracion activo={open} onCancelar={onClose} />
      </DialogContent>
    </Dialog>
  )
}

const ITEM_CONFIG = "flex items-center justify-between gap-3"

function FormConfiguracion({ inicial, onCancelar }: { inicial: ValoresConfiguracion; onCancelar?: () => void }) {
  const [valores, setValores] = useState(inicial)
  const guardar = useGuardarConfiguracion()
  const incompleto = !valores.horaInicio || !valores.horaFin
  const idSabado = useId()
  const idMenores = useId()
  const cambiar = (v: Partial<ValoresConfiguracion>) => setValores({ ...valores, ...v })
  return (
    <div className="space-y-4 text-sm">
      {guardar.isError && <p role="alert" className="text-red">{getErrorMessage(guardar.error)}</p>}
      {guardar.isSuccess && <p role="status" className="text-green">Configuración guardada.</p>}
      <fieldset className="space-y-3">
        <legend className="mb-2 font-medium">
          <span className="text-red">* </span>Horario de atención
        </legend>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">lun–vie</span>
          <Field variant="outlined" className="w-36" data-invalid={!valores.horaInicio || undefined}>
            <FieldLabel htmlFor="config-hora-inicio">Desde</FieldLabel>
            <DatePicker id="config-hora-inicio" mode="time" value={valores.horaInicio} onChange={(v) => cambiar({ horaInicio: v })} />
          </Field>
          <span>a</span>
          <Field variant="outlined" className="w-36" data-invalid={!valores.horaFin || undefined}>
            <FieldLabel htmlFor="config-hora-fin">Hasta</FieldLabel>
            <DatePicker id="config-hora-fin" mode="time" value={valores.horaFin} onChange={(v) => cambiar({ horaFin: v })} />
          </Field>
        </div>
        <div className={ITEM_CONFIG}>
          <label htmlFor={idSabado}>sáb</label>
          <Switch id={idSabado} checked={valores.incluyeSabado} onCheckedChange={(v) => cambiar({ incluyeSabado: v })} />
        </div>
        {incompleto && <p role="alert" className="text-red">Indique la hora de inicio y la de fin.</p>}
      </fieldset>
      <p className="flex items-start gap-2 text-muted-foreground">
        <InfoIcon aria-hidden className="mt-px size-4 shrink-0" />
        Fuera del horario no se envían avisos por correo; la campana sí.
      </p>
      {/* W.17.EST.1: por defecto un estudiante menor solo responde donde lo incluyeron. */}
      <div className={ITEM_CONFIG}>
        <label htmlFor={idMenores}>Permitir que estudiantes menores inicien conversaciones</label>
        <Switch
          id={idMenores}
          checked={valores.permitirMenoresIniciar}
          onCheckedChange={(v) => cambiar({ permitirMenoresIniciar: v })}
        />
      </div>
      <DialogFooter>
        {onCancelar && (
          <Button variant="outline" color="neutral" disabled={guardar.isPending} onClick={onCancelar}>
            Cancelar
          </Button>
        )}
        <Button
          disabled={guardar.isPending || incompleto}
          aria-busy={guardar.isPending}
          onClick={() => guardar.mutate(valores, { onSuccess: () => onCancelar?.() })}
        >
          Guardar
        </Button>
      </DialogFooter>
    </div>
  )
}
