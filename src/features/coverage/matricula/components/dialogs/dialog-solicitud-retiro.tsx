import { useRef, useState, type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { InfoIcon, PaperclipIcon, SpinnerIcon, UploadSimpleIcon, WarningIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import {
  ESTADO_SOLICITUD_LABEL,
  useAnularMatricula,
  useResponderSolicitudRetiro,
  useSolicitudRetiroQuery,
  type SolicitudRetiro,
} from "@/features/coverage/matricula/api/solicitud-retiro"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"

const MOTIVO_MIN = 10
const MOTIVO_MAX = 500
const EVIDENCIA_EXTENSIONES = ["pdf", "jpg", "jpeg", "png"]
const EVIDENCIA_MAX_MB = 10

const formatFecha = (iso: string) => iso.split("-").reverse().join("/")

interface Props {
  matricula: Matricula
  onOpenChange: (open: boolean) => void
  onDone: (mensaje: string) => void
}

function Datos({ filas }: { filas: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 overflow-hidden rounded-md border border-border text-sm sm:grid-cols-[auto_1fr]">
      {filas.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="border-b border-border bg-muted/40 px-4 py-2 text-muted-foreground last-of-type:border-b-0">
            {label}
          </dt>
          <dd className="border-b border-border px-4 py-2">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Cargando() {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <SpinnerIcon className="animate-spin" /> Cargando la solicitud…
    </div>
  )
}

const datosSolicitud = (s: SolicitudRetiro, matricula: Matricula): [string, ReactNode][] => [
  ["Matrícula en el origen", [matricula.group, matricula.campus, matricula.shift].filter(Boolean).join(" · ")],
  ["Establecimiento solicitante", s.establecimientoSolicitante],
  [
    "Fecha de la solicitud",
    `${formatFecha(s.fecha)} · ${s.diasSinRespuesta} ${s.diasSinRespuesta === 1 ? "día" : "días"} sin respuesta`,
  ],
  [
    "Estado",
    <Badge
      key="estado"
      variant="soft"
      color={s.estado === "VENCIDA" ? "destructive" : "warning"}
      className="rounded-full text-xs font-medium tracking-normal"
    >
      {ESTADO_SOLICITUD_LABEL[s.estado]}
    </Badge>,
  ],
  [
    "Evidencia",
    <span key="evidencia" className="inline-flex items-center gap-1.5">
      <PaperclipIcon className="size-4 text-muted-foreground" aria-hidden />
      {s.evidenciaNombre}
    </span>,
  ],
]

/**
 * Responder solicitud de retiro (origen, Sección 2.2): Retirar con los motivos
 * fijos del traslado, u Objetar con motivo y evidencia opcional, que deja la
 * decisión al Administrador territorial. Las dos levantan la restricción.
 */
export function DialogResponderSolicitudRetiro({ matricula, onOpenChange, onDone }: Props) {
  const { data: solicitud, isPending, isError, error: errorCarga } = useSolicitudRetiroQuery(matricula.id)
  const responder = useResponderSolicitudRetiro()
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

  function confirmar() {
    setIntentado(true)
    if (accion === "objetar" && !motivoValido) return
    const input =
      accion === "retirar"
        ? { matriculaId: matricula.id, accion }
        : { matriculaId: matricula.id, accion, motivo, evidencia }
    responder.mutate(input, {
      onSuccess: () =>
        onDone(
          accion === "retirar"
            ? `${nombre} quedó retirado por traslado a ${solicitud?.establecimientoSolicitante}.`
            : `Se objetó la solicitud de retiro de ${nombre}. Decide el Administrador territorial.`,
        ),
      onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !responder.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Responder solicitud de retiro — {nombre}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        {isPending ? (
          <Cargando />
        ) : isError ? (
          <p className="p-6 text-center text-sm text-red">{getErrorMessage(errorCarga)}</p>
        ) : (
          <>
            <Datos filas={datosSolicitud(solicitud, matricula)} />

            <RadioGroup
              value={accion}
              onValueChange={(v) => v && setAccion(v as "retirar" | "objetar")}
              className="grid grid-cols-1 gap-0 overflow-hidden rounded-md border border-border sm:grid-cols-2 sm:divide-x"
              aria-label="Respuesta"
            >
              <label className={cn("flex cursor-pointer items-start gap-3 p-3", accion === "retirar" && "bg-primary/5")}>
                <RadioGroupItem value="retirar" className="mt-0.5" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">Retirar</span>
                  <span className="text-sm text-muted-foreground">
                    El estudiante se va a {solicitud.establecimientoSolicitante}. La solicitud queda Atendida.
                  </span>
                </span>
              </label>
              <label className={cn("flex cursor-pointer items-start gap-3 p-3", accion === "objetar" && "bg-primary/5")}>
                <RadioGroupItem value="objetar" className="mt-0.5" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">Objetar</span>
                  <span className="text-sm text-muted-foreground">
                    El estudiante sigue aquí. Decide el Administrador territorial.
                  </span>
                </span>
              </label>
            </RadioGroup>

            {accion === "retirar" ? (
              <Datos
                filas={[
                  ["Motivo de retiro", "Traslado a otro establecimiento"],
                  ["Motivo de la novedad", "Requerimiento de otra entidad territorial o establecimiento"],
                ]}
              />
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="objecion-motivo" className="text-sm">
                    <span className="text-red">*</span> Motivo de la objeción
                  </label>
                  <Textarea
                    id="objecion-motivo"
                    rows={3}
                    maxLength={MOTIVO_MAX}
                    value={motivo}
                    placeholder="Explique por qué el estudiante sigue en este establecimiento"
                    aria-invalid={intentado && !motivoValido}
                    className="min-h-20 resize-y rounded-md border border-input px-3 py-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red"
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className={cn(intentado && !motivoValido && "text-red")}>
                      De {MOTIVO_MIN} a {MOTIVO_MAX} caracteres.
                    </span>
                    <span className="tabular-nums">
                      {motivo.length} / {MOTIVO_MAX}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1.5">
                  <span id="objecion-evidencia-label" className="text-sm">
                    Evidencia (opcional)
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
                    Subir PDF, JPG o PNG
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
                  <span className="text-sm text-muted-foreground">PDF, JPG o PNG · máx. {EVIDENCIA_MAX_MB} MB.</span>
                </div>
              </>
            )}
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color={accion === "retirar" ? "destructive" : "primary"}
            size="sm"
            disabled={!solicitud || responder.isPending}
            onClick={confirmar}
          >
            {responder.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : null}
            {accion === "retirar" ? "Retirar" : "Objetar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Anular matrícula (destino, Sección 2.2 y 4.1): tras «Cerrar sin retiro» del
 * Administrador territorial. Motivo fijo; lo registrado en la matrícula se anula
 * y no se restaura. Anular no es eliminar: queda Anulado con su historial.
 */
export function DialogAnularMatricula({ matricula, onOpenChange, onDone }: Props) {
  const { data: solicitud, isPending, isError, error: errorCarga } = useSolicitudRetiroQuery(matricula.id)
  const anular = useAnularMatricula()
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const nombre = `${matricula.firstName} ${matricula.lastName}`

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Anular matrícula — {nombre}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        {isPending ? (
          <Cargando />
        ) : isError ? (
          <p className="p-6 text-center text-sm text-red">{getErrorMessage(errorCarga)}</p>
        ) : (
          <>
            <Datos
              filas={[
                ["Matrícula", [matricula.group, matricula.campus, matricula.shift].filter(Boolean).join(" · ")],
                ["Sigue en", solicitud.establecimientoOrigen],
                ["Motivo del cierre sin retiro", solicitud.motivoCierre ?? "—"],
                ["Motivo de anulación", "Matrícula duplicada por solicitud de retiro"],
              ]}
            />

            <div role="alert" className="flex gap-3 rounded-md border border-red-stroke bg-red-22 px-4 py-3 text-sm">
              <WarningIcon className="mt-0.5 size-5 shrink-0 text-red" aria-hidden />
              <p>
                {lista.length > 0
                  ? `Se anulan también los registros de esta matrícula: ${lista.join(", ").replace(/, ([^,]*)$/, " y $1")}. `
                  : "Esta matrícula no tiene registros. "}
                Dejan de listarse y de contar, quedan en la Bitácora marcados «Anulado por matrícula duplicada» y no se
                restauran.
              </p>
            </div>

            <div className="flex gap-3 rounded-md border border-primary/30 bg-primary-22 px-4 py-3 text-sm">
              <InfoIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <p>
                La matrícula no se elimina: queda Anulada con su historial y no cuenta para cupos ni informes. La
                solicitud queda Cerrada sin retiro.
              </p>
            </div>
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
