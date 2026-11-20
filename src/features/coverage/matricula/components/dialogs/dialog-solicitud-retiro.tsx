import { useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { PaperclipIcon, SpinnerIcon, UploadSimpleIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import {
  ESTADO_SOLICITUD_LABEL,
  useAnularMatricula,
  useResponderSolicitudRetiro,
  useSolicitudRetiroQuery,
} from "@/features/coverage/matricula/api/solicitud-retiro"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { Aviso, CampoSelect, MatriculasAfectadas } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"
import { DialogRetirar } from "@/features/coverage/matricula/components/dialogs/dialog-retirar-matricula"

const MOTIVO_MIN = 10
const MOTIVO_MAX = 500
const EVIDENCIA_EXTENSIONES = ["pdf", "jpg", "jpeg", "png"]
const EVIDENCIA_MAX_MB = 10
const MOTIVO_ANULACION = "Matrícula duplicada por solicitud de retiro"

const formatFecha = (iso: string) => iso.split("-").reverse().join("/")

interface Props {
  matricula: Matricula
  onOpenChange: (open: boolean) => void
  onDone: (mensaje: string) => void
}

function Cargando() {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <SpinnerIcon className="animate-spin" /> Cargando la solicitud…
    </div>
  )
}

/**
 * Responder solicitud de retiro (origen, Sección 2.2): Retirar abre el modal
 * Retirar de siempre con los motivos fijos del traslado (SOL.6); Objetar pide
 * motivo y evidencia opcional y deja la decisión al Administrador territorial (SOL.3).
 */
export function DialogResponderSolicitudRetiro({ matricula, onOpenChange, onDone }: Props) {
  const { data: solicitud, isPending, isError, error: errorCarga } = useSolicitudRetiroQuery(matricula.id)
  const responder = useResponderSolicitudRetiro()
  // SOL.2: primero el resumen de la solicitud; Objetar y Retirar llevan a su paso.
  const [paso, setPaso] = useState<"resumen" | "responder">("resumen")
  const [accion, setAccion] = useState<"retirar" | "objetar">("retirar")
  const [motivo, setMotivo] = useState("")
  const [evidencia, setEvidencia] = useState<File | null>(null)
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const nombre = `${matricula.firstName} ${matricula.lastName}`

  const motivoValido = motivo.trim().length >= MOTIVO_MIN && motivo.trim().length <= MOTIVO_MAX

  function elegirEvidencia(file: File | undefined) {
    if (!file) return
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!EVIDENCIA_EXTENSIONES.includes(ext)) {
      setError({ id: Date.now(), message: "La evidencia debe ser un archivo PDF, JPG o PNG." })
      return
    }
    if (file.size > EVIDENCIA_MAX_MB * 1024 * 1024) {
      setError({ id: Date.now(), message: `La evidencia supera los ${EVIDENCIA_MAX_MB} MB.` })
      return
    }
    setEvidencia(file)
  }

  function objetar() {
    setIntentado(true)
    if (!motivoValido) return
    responder.mutate(
      { matriculaId: matricula.id, accion: "objetar", motivo, evidencia },
      {
        onSuccess: () => onDone("Objeción enviada al Administrador territorial."),
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  if (paso === "resumen") {
    const ir = (a: "retirar" | "objetar") => {
      setAccion(a)
      setPaso("responder")
    }
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Retiro solicitado por otro establecimiento</DialogTitle>
          </DialogHeader>
          {isPending ? (
            <Cargando />
          ) : isError ? (
            <p className="p-6 text-center text-sm text-red">{getErrorMessage(errorCarga)}</p>
          ) : (
            <>
              <p className="text-sm">
                {solicitud.establecimientoSolicitante} solicita el retiro de {nombre} ({matricula.group}). Evidencia:{" "}
                <span className="inline-flex items-center gap-1 font-medium">
                  <PaperclipIcon className="size-4 text-muted-foreground" aria-hidden />
                  {solicitud.evidenciaNombre}
                </span>
              </p>
              <table className="w-full overflow-hidden rounded-md border border-border text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Fecha de la solicitud</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                    <th className="px-4 py-2 font-medium">Vence</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2 tabular-nums">{formatFecha(solicitud.fecha)}</td>
                    <td className="px-4 py-2">
                      <Badge
                        variant="soft"
                        color={solicitud.estado === "VENCIDA" ? "destructive" : "warning"}
                        className="rounded-full text-xs font-medium tracking-normal"
                      >
                        {ESTADO_SOLICITUD_LABEL[solicitud.estado]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 tabular-nums">{solicitud.vence ? formatFecha(solicitud.vence) : "—"}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-sm text-muted-foreground">
                Lleva {solicitud.diasSinRespuesta} {solicitud.diasSinRespuesta === 1 ? "día" : "días"} sin respuesta del
                establecimiento.
              </p>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="outline" color="primary" size="sm" disabled={!solicitud} onClick={() => ir("objetar")}>
              Objetar
            </Button>
            <Button type="button" variant="fill" color="destructive" size="sm" disabled={!solicitud} onClick={() => ir("retirar")}>
              Retirar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (!solicitud) return null

  // SOL.6: el modal Retirar de siempre, con los motivos elegidos y protegidos.
  if (accion === "retirar")
    return (
      <DialogRetirar
        matriculas={[matricula]}
        onOpenChange={onOpenChange}
        porSolicitud={{
          establecimiento: solicitud.establecimientoSolicitante,
          evidenciaNombre: solicitud.evidenciaNombre,
          onRetirado: onDone,
        }}
      />
    )

  return (
    <Dialog open onOpenChange={(o) => !responder.isPending && onOpenChange(o)}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Objetar el retiro de {nombre}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {solicitud.establecimientoSolicitante} solicita el retiro de {nombre} ({matricula.group}).
          </p>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <Field variant="outlined" data-invalid={intentado && !motivoValido ? true : undefined}>
          <FieldLabel htmlFor="objecion-motivo">
            Motivo<span data-required-mark="">*</span>
          </FieldLabel>
          <Textarea
            id="objecion-motivo"
            rows={3}
            maxLength={MOTIVO_MAX}
            value={motivo}
            aria-invalid={intentado && !motivoValido}
            className={TEXTAREA_OUTLINED}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <span className="flex justify-between gap-2">
            {intentado && !motivoValido ? <FieldError>De {MOTIVO_MIN} a {MOTIVO_MAX} caracteres.</FieldError> : <span />}
            <CharacterCounter value={motivo} max={MOTIVO_MAX} />
          </span>
        </Field>
        <div className="flex flex-col items-start gap-1.5">
          <span id="objecion-evidencia-label" className="text-sm">
            Evidencia
          </span>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            aria-labelledby="objecion-evidencia-label"
            onChange={(e) => {
              elegirEvidencia(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => fileInput.current?.click()}>
            <UploadSimpleIcon data-icon="inline-start" />
            Adjuntar
          </Button>
          {evidencia ? (
            <span className="inline-flex items-center gap-2 text-sm">
              <PaperclipIcon className="size-4 text-muted-foreground" aria-hidden />
              {evidencia.name}
              <button
                type="button"
                aria-label={`Quitar ${evidencia.name}`}
                className="rounded-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={() => setEvidencia(null)}
              >
                <XIcon className="size-4" />
              </button>
            </span>
          ) : null}
          <FieldDescription>PDF, JPG o PNG · máx. {EVIDENCIA_MAX_MB} MB.</FieldDescription>
        </div>

        <Aviso tono="info" titulo="La solicitud pasará al Administrador territorial, que decidirá." />
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={responder.isPending} onClick={objetar}>
            {responder.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : null}
            Enviar objeción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Acción bloqueada por retiro solicitado (SOL.4b, Regla 71): la acción se ve en la
 * fila, pero al pulsarla se explica el bloqueo y se ofrece responder la solicitud.
 */
export function DialogAccionBloqueada({
  matricula,
  accion,
  onClose,
}: {
  matricula: Matricula
  accion: string
  onClose: () => void
}) {
  const { notify } = useNotify()
  const [verSolicitud, setVerSolicitud] = useState(false)
  const nombre = `${matricula.firstName} ${matricula.lastName}`
  if (verSolicitud)
    return (
      <DialogResponderSolicitudRetiro
        matricula={matricula}
        onOpenChange={(o) => !o && onClose()}
        onDone={(mensaje) => {
          onClose()
          notify(mensaje, { variant: "success" })
        }}
      />
    )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{accion}</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          La matrícula de {nombre} tiene un retiro solicitado por {matricula.retiroSolicitadoPor || "otro establecimiento"}.
          Responda la solicitud (Retirar u Objetar) para continuar.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={onClose}>
            Entendido
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={() => setVerSolicitud(true)}>
            Ver solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


/**
 * Anular matrícula (destino, SOL.7): tras «Cerrar sin retiro» del Administrador
 * territorial. Motivo elegido y protegido; los registros se anulan y no se
 * restauran. Anular no es eliminar: queda Anulado y se conserva en la Bitácora.
 */
export function DialogAnularMatricula({ matricula, onOpenChange, onDone }: Props) {
  const { data: solicitud, isPending, isError, error: errorCarga } = useSolicitudRetiroQuery(matricula.id)
  const anular = useAnularMatricula()
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const nombre = `${matricula.firstName} ${matricula.lastName}`
  const dias = solicitud?.diasSinAnular

  const registros = solicitud?.registros
  const lista = registros
    ? [
        registros.asistencias > 0 ? `${registros.asistencias} ${registros.asistencias === 1 ? "asistencia" : "asistencias"}` : null,
        registros.notas > 0 ? `${registros.notas} ${registros.notas === 1 ? "nota" : "notas"}` : null,
        registros.anotaciones > 0
          ? `${registros.anotaciones} ${registros.anotaciones === 1 ? "anotación" : "anotaciones"}`
          : null,
      ].filter((x): x is string => x != null)
    : []

  return (
    <Dialog open onOpenChange={(o) => !anular.isPending && onOpenChange(o)}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Anular matrícula — {nombre}</DialogTitle>
          <MatriculasAfectadas
            matriculas={[matricula]}
            extra={
              <Badge variant="soft" color="destructive" className="rounded-full text-xs font-medium tracking-normal">
                Anulación pendiente
              </Badge>
            }
          />
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        {isPending ? (
          <Cargando />
        ) : isError ? (
          <p className="p-6 text-center text-sm text-red">{getErrorMessage(errorCarga)}</p>
        ) : (
          <>
            <Aviso
              tono="info"
              titulo={`La entidad territorial cerró la solicitud sin retiro: ${nombre} sigue en ${solicitud.establecimientoOrigen}.${
                dias != null ? ` Lleva ${dias} ${dias === 1 ? "día" : "días"} sin anular su matrícula.` : ""
              }`}
            />
            <CampoSelect
              id="anular-motivo"
              label="Motivo de anulación"
              required
              disabled
              value={MOTIVO_ANULACION}
              onChange={() => {}}
              opciones={[{ value: MOTIVO_ANULACION, label: MOTIVO_ANULACION }]}
            />
            <Aviso
              tono="advertencia"
              titulo={
                lista.length > 0
                  ? `También se anularán los registros de esta matrícula: ${lista.join(", ")}.`
                  : "Esta matrícula no tiene registros."
              }
            >
              Dejarán de verse y no se podrán restaurar; quedan en la Bitácora con su copia completa.
            </Aviso>
            <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="destructive"
            size="sm"
            disabled={!solicitud || anular.isPending}
            onClick={() =>
              anular.mutate(matricula.id, {
                onSuccess: () => onDone(`Se anuló la matrícula de ${nombre}.`),
                onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
              })
            }
          >
            {anular.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : null}
            Anular matrícula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
