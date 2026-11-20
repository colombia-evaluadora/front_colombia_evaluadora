import { useState, type ReactNode } from "react"
import { isAxiosError } from "axios"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
  CheckIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  ProhibitIcon,
  UserIcon,
  WarningIcon,
  XIcon,
} from "@/components/ui/icons"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DialogAutorizarDatos } from "@/features/autorizacion-datos/components/dialog-autorizar-datos"
import { AvisoAutorizacionPendiente } from "@/features/autorizacion-datos/components/aviso-autorizacion-pendiente"
import { mensajeAutorizados, pendientesDe } from "@/features/autorizacion-datos/lib/autorizaciones"
import {
  anularInscripcionPublica,
  autorizarConsultaPublica,
  conUbicacion,
  elegirOpcionPublica,
  responderUbicacion,
  type CredencialesConsulta,
} from "@/features/publico/consultar/api/consulta-publica"
import { ESTADO_OPCION_UI } from "@/features/coverage/inscripcion-reservas/api/ui-mappings-inscripcion"
import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import {
  type EstadoInscripcionPublica,
  type InscripcionConsulta,
  type OpcionConsulta,
} from "@/features/publico/consultar/datos-demo"
import { ESTADO_INSCRIPCION } from "@/features/publico/consultar/ui-mappings"

const lugar = (o: OpcionConsulta) => `${o.establecimiento} · ${o.sede} · ${o.jornada}`

function EstadoOpcionBadge({ opcion }: { opcion: OpcionConsulta }) {
  const ui = ESTADO_OPCION_UI[opcion.estado]
  const detalle = opcion.elegida ? " · Elegida" : opcion.reservada ? " · Reservada" : ""
  return (
    <Badge variant="soft" color={ui.color}>
      {ui.label}
      {opcion.estado === "ADMITIDA" ? detalle : ""}
    </Badge>
  )
}

/**
 * U.3 Consultar inscripción: el aspirante, el aviso de lo que hay que hacer y
 * la tabla de opciones. Vista previa: las acciones cambian el estado en pantalla
 * (ver `datos-demo.ts`).
 */
export function ResultadoInscripcion({
  inicial,
  credenciales,
  onEstadoChange,
}: {
  inicial: InscripcionConsulta
  /** Número, documento y código con los que se consultó: autorizar los reusa. */
  credenciales: CredencialesConsulta | null
  onEstadoChange: (estado: EstadoInscripcionPublica) => void
}) {
  const [insc, setInsc] = useState(inicial)
  const [elegir, setElegir] = useState<OpcionConsulta | null>(null)
  const [anular, setAnular] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [motivoIntentado, setMotivoIntentado] = useState(false)
  const [notificacionConfirmada, setNotificacionConfirmada] = useState(false)
  const [autorizando, setAutorizando] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const [autorizados, setAutorizados] = useState<string | null>(null)
  const pendientes = pendientesDe(insc.autorizaciones)

  // U.3.EST.1c-d: autoriza con el mismo código; el aviso desaparece y queda la confirmación.
  async function autorizar(ids: number[]) {
    if (!credenciales) throw new Error("Vuelva a consultar la inscripción para autorizar.")
    const despues = await autorizarConsultaPublica(credenciales, ids)
    setAutorizados(mensajeAutorizados(insc.autorizaciones, despues, ids))
    setInsc({ ...insc, autorizaciones: despues.length ? despues : insc.autorizaciones })
    setAutorizando(false)
  }

  function actualizar(nueva: InscripcionConsulta) {
    setInsc(nueva)
    onEstadoChange(nueva.estado)
  }

  const conSorteo = insc.opciones.some((o) => o.sorteo != null || o.posicion != null)
  const admitidas = insc.opciones.filter((o) => o.estado === "ADMITIDA")
  const abierta = insc.estado !== "ANULADA"
  // Ampliar y Editar desde el sitio público no tienen servicio todavía: solo se avisa.
  const enPreparacion = () => toast.info("Disponible cuando se conecte el servicio de inscripción.")

  // Las acciones reusan el código de la consulta (sso eval-col-inscripcion-publica-*). Un error
  // de axios ya lo muestra el toast global; el de código vencido lo lanzamos nosotros.
  async function ejecutar(accion: (c: CredencialesConsulta) => Promise<InscripcionConsulta>) {
    if (!credenciales) return toast.error("Vuelva a consultar la inscripción.")
    setTrabajando(true)
    try {
      actualizar(await accion(credenciales))
      return true
    } catch (error) {
      if (!isAxiosError(error)) toast.error(error instanceof Error ? error.message : String(error))
      return false
    } finally {
      setTrabajando(false)
    }
  }

  async function quedarmeCon(opcion: OpcionConsulta) {
    if (opcion.id == null) return
    // Regla 38: las demás opciones quedan Descartadas y liberan su cupo.
    if (await ejecutar((c) => elegirOpcionPublica(c, opcion.id!))) setElegir(null)
  }

  function responderPropuesta(acepta: boolean) {
    void ejecutar(async (c) => {
      const r = await responderUbicacion(c, acepta)
      return conUbicacion(r.inscripcion, r.ubicacion)
    })
  }

  async function confirmarAnulacion() {
    setMotivoIntentado(true)
    if (!motivo) return
    if (await ejecutar((c) => anularInscripcionPublica(c, Number(motivo)))) setAnular(false)
  }

  const estado = ESTADO_INSCRIPCION[insc.estado]
  // "Confirmar" del aviso de Ubicado solo acusa recibo en pantalla: el backend no registra esa
  // confirmación (no existe en el dominio); la reserva ya quedó hecha.
  const aviso = avisoDe(insc, notificacionConfirmada, () => setNotificacionConfirmada(true))
  const accionesFila = insc.estado === "POR_ELEGIR" || insc.estado === "UBICACION_PROPUESTA"

  return (
    <div className="flex flex-col gap-5">
      {abierta && (
        <div className="-mx-6 -mt-6 flex flex-wrap justify-end gap-2 border-b px-6 py-3">
          {insc.estado === "INSCRITA" && (
            <>
              {insc.opciones.length < 3 && (
                <Button variant="outline" color="neutral" onClick={enPreparacion}>
                  <PlusIcon data-icon="inline-start" />
                  Ampliar inscripción
                </Button>
              )}
              <Button variant="outline" color="neutral" onClick={enPreparacion}>
                <PencilIcon data-icon="inline-start" />
                Editar
              </Button>
            </>
          )}
          <Button variant="outline" color="destructive" onClick={() => setAnular(true)}>
            <ProhibitIcon data-icon="inline-start" />
            Anular inscripción
          </Button>
        </div>
      )}

      <div className="bg-card flex items-center gap-4 rounded-lg border px-4 py-3">
        <span className="bg-primary-22 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
          <UserIcon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{insc.aspirante}</p>
          <p className="text-muted-foreground text-sm">
            {[`Inscripción ${insc.numero}`, insc.grado, insc.grupoAdmision].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Badge variant="soft" color={estado.color}>
          {estado.label}
        </Badge>
      </div>

      {pendientes.length > 0 && <AvisoAutorizacionPendiente onAutorizar={() => setAutorizando(true)} />}
      {autorizados && (
        <Alert variant="info" role="status">
          <CheckIcon />
          <AlertDescription>{autorizados}</AlertDescription>
        </Alert>
      )}

      {aviso}

      {/* La tabla ya trae su borde y radio: sin caja extra (era un borde doble). */}
      <Table className="[&_td]:px-3 [&_th]:px-3">
        <TableHeader>
          <TableRow>
            <TableHead>Opción</TableHead>
            <TableHead>Establecimiento</TableHead>
            <TableHead>Sede · Jornada</TableHead>
            {conSorteo && <TableHead className="text-center">Sorteo</TableHead>}
            {conSorteo && <TableHead className="text-center">Posición</TableHead>}
            <TableHead>Estado</TableHead>
            {accionesFila && (
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {insc.opciones.map((o, i) => (
            <TableRow key={i}>
              <TableCell>
                {o.numero ?? (
                  <Badge variant="soft" color="info">
                    Redistribución
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-semibold">{o.establecimiento}</TableCell>
              {/* Puede partirse en dos líneas para que las acciones quepan sin scroll. */}
              <TableCell className="whitespace-normal">
                {o.sede} · {o.jornada}
              </TableCell>
              {conSorteo && (
                <TableCell className="text-center tabular-nums">{o.sorteo ?? "—"}</TableCell>
              )}
              {conSorteo && (
                <TableCell className="text-center tabular-nums">{o.posicion ?? "—"}</TableCell>
              )}
              <TableCell>
                <EstadoOpcionBadge opcion={o} />
              </TableCell>
              {accionesFila && (
                <TableCell className="text-right">
                  {insc.estado === "POR_ELEGIR" &&
                    o.estado === "ADMITIDA" && (
                      // La de mayor preferencia va resaltada: es la que queda si no elige.
                      <Button
                        size="sm"
                        variant={o === admitidas[0] ? "fill" : "outline"}
                        color={o === admitidas[0] ? "primary" : "neutral"}
                        onClick={() => setElegir(o)}
                      >
                        <CheckIcon data-icon="inline-start" />
                        Quedarme con esta
                      </Button>
                    )}
                  {insc.estado === "UBICACION_PROPUESTA" && o.numero == null && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" disabled={trabajando} onClick={() => responderPropuesta(true)}>
                        <CheckIcon data-icon="inline-start" />
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        color="destructive"
                        onClick={() => responderPropuesta(false)}
                      >
                        <XIcon data-icon="inline-start" />
                        Rechazar
                      </Button>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <DialogAutorizarDatos
        establecimientos={autorizando ? insc.autorizaciones : null}
        onOpenChange={(open) => !open && setAutorizando(false)}
        onAutorizar={autorizar}
      />

      <Dialog open={elegir != null} onOpenChange={(open) => !open && setElegir(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WarningIcon className="text-orange size-5 shrink-0" aria-hidden />
              Elegir {elegir && lugar(elegir)}
            </DialogTitle>
            <DialogDescription>
              Las demás opciones quedarán Descartadas y sus cupos se liberarán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" color="neutral" onClick={() => setElegir(null)}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
            <Button disabled={trabajando} onClick={() => elegir && quedarmeCon(elegir)}>
              <CheckIcon data-icon="inline-start" />
              Quedarme con esta opción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={anular}
        onOpenChange={(open) => {
          setAnular(open)
          if (!open) {
            setMotivo("")
            setMotivoIntentado(false)
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WarningIcon className="text-orange size-5 shrink-0" aria-hidden />
              Anular inscripción {insc.numero}
            </DialogTitle>
            <DialogDescription>
              Todas sus opciones quedarán Descartadas y sus reservas se liberarán.
            </DialogDescription>
          </DialogHeader>
          <MatriculaSelectField
            id="motivo-anulacion"
            label="Motivo de anulación"
            required
            value={motivo}
            options={(insc.motivosAnulacion ?? []).map((m) => String(m.id))}
            labelFor={(id) => insc.motivosAnulacion?.find((m) => String(m.id) === id)?.nombre ?? id}
            onChange={setMotivo}
            invalid={motivoIntentado && !motivo}
          />
          <DialogFooter>
            <Button variant="outline" color="neutral" onClick={() => setAnular(false)}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
            <Button color="destructive" disabled={trabajando} onClick={confirmarAnulacion}>
              <ProhibitIcon data-icon="inline-start" />
              Anular inscripción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** El aviso de la parte superior: qué tiene que hacer la familia y hasta cuándo. */
function avisoDe(
  insc: InscripcionConsulta,
  notificacionConfirmada: boolean,
  confirmar: () => void,
): ReactNode {
  const propuesta = insc.opciones.find((o) => o.numero == null)
  const elegida = insc.opciones.find((o) => o.elegida)
  const caja = (variant: "info" | "warning", texto: ReactNode, accion?: ReactNode) => (
    <Alert variant={variant}>
      {variant === "warning" ? <WarningIcon /> : <InfoIcon />}
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex-1">{texto}</span>
        {accion && <span className="shrink-0">{accion}</span>}
      </AlertDescription>
    </Alert>
  )

  switch (insc.estado) {
    case "POR_ELEGIR":
      return caja(
        "warning",
        <>
          Elija antes del <strong>{insc.plazo}</strong> (24 horas). Si no elige, queda la opción
          admitida de mayor preferencia.
        </>,
      )
    case "INSCRITA":
      return insc.sorteo
        ? caja(
            "info",
            <>
              El sorteo de {insc.sorteo.establecimiento} se ejecuta el{" "}
              <strong>{insc.sorteo.fecha}</strong>. Hasta entonces puede ampliar o editar sus
              opciones.
            </>,
          )
        : null
    case "UBICACION_PROPUESTA":
      return propuesta
        ? caja(
            "warning",
            <>
              Se propone ubicarlo en {lugar(propuesta)}. Confírmela o recházela antes del{" "}
              <strong>{insc.plazo}</strong> (plazo de 24 horas).
            </>,
          )
        : null
    case "UBICADO":
      return caja(
        "info",
        notificacionConfirmada
          ? "Gracias. La matrícula se completa con la asignación de grupo."
          : `Se le reservó un cupo en ${propuesta ? lugar(propuesta) : "el establecimiento"}. Confirme que recibió esta notificación; después la matrícula se completa con la asignación de grupo.`,
        notificacionConfirmada ? undefined : (
          <Button onClick={confirmar}>
            <CheckIcon data-icon="inline-start" />
            Confirmar
          </Button>
        ),
      )
    case "ADMITIDA":
      return caja(
        "info",
        <>
          Eligió {elegida ? lugar(elegida) : "su opción"}. El establecimiento le informará cómo
          completar la matrícula.
        </>,
      )
    case "SIN_CUPO":
      return caja(
        "info",
        "Rechazó la ubicación propuesta. Puede comunicarse con la secretaría de educación para conocer otras opciones.",
      )
    case "ANULADA":
      return caja(
        "info",
        "La inscripción fue anulada. Sus opciones quedaron Descartadas y las reservas se liberaron.",
      )
  }
}
