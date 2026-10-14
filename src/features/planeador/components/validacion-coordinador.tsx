import { useRef, useState } from "react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CheckIcon, ClipboardCheckIcon, SpinnerIcon, XCircleIcon, XIcon } from "@/components/ui/icons"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import {
  useValidacionCoordinadorQuery,
  type EstadoValidacionCoordinador,
} from "@/features/planeador/api/query/use-validacion-coordinador-query"
import {
  OBSERVACION_VALIDACION_MAX,
  useResolverValidacionCoordinador,
} from "@/features/planeador/api/mutations/resolver-validacion-coordinador"

const ESTADO_UI: Record<
  Exclude<EstadoValidacionCoordinador, "NO_REQUIERE">,
  { label: string; dot: string }
> = {
  PENDIENTE: { label: "Pendiente de validación", dot: "bg-orange" },
  APROBADA: { label: "Aprobada", dot: "bg-green" },
  DECLINADA: { label: "Declinada", dot: "bg-red" },
}

function formatFecha(value: string | null): string | null {
  if (!value) return null
  const fecha = new Date(value)
  return Number.isNaN(fecha.getTime()) ? null : format(fecha, "dd/MM/yyyy HH:mm")
}

/**
 * Estado de la validación de la planeación por el Coordinador (pendiente /
 * aprobada / declinada + observación), visible para el docente y para el
 * coordinador. Si el backend dice `puedeValidar` (Coordinador de la SEDE de la
 * actividad que no la planeó, ver `use-validacion-coordinador-query.ts`)
 * muestra además el botón "Aprobar", que abre el diálogo de aprobar o
 * declinar. No renderiza nada si la actividad no requiere validación.
 *
 * Ya no es una card en medio del contenido: va en la barra sticky del pie
 * (mismo look que el "Guardar" de `TableScreenFooter`), info a la izquierda y
 * acción a la derecha. Se parte en `ValidacionCoordinadorEstado` (izquierda)
 * y `ValidacionCoordinadorAprobar` (derecha) para poder fusionarse con un
 * footer existente (editar actividad ya tiene "Guardar"); ambas leen la misma
 * query, así que React Query deduplica el request.
 */
export function ValidacionCoordinadorEstado({
  actividadId,
  requiereValidacion,
}: {
  actividadId: number
  requiereValidacion: boolean
}) {
  const { data, isPending, isError, error } = useValidacionCoordinadorQuery(actividadId, requiereValidacion)

  if (!requiereValidacion) return null

  const estado = data && data.estado !== "NO_REQUIERE" ? ESTADO_UI[data.estado] : null
  const fecha = formatFecha(data?.fechaValidacion ?? null)

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Validación del coordinador</span>
        {/* Estado como texto normal + punto de color, no badge: el texto
            amarillo sobre fondo amarillo claro no tenía contraste. */}
        {estado && (
          <span className="text-foreground inline-flex items-center gap-1.5 text-sm font-medium">
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", estado.dot)} />
            {estado.label}
          </span>
        )}
      </div>

      {isPending && <p className="text-muted-foreground text-sm">Cargando el estado de la validación…</p>}
      {isError && <p className="text-red text-sm">{getErrorMessage(error)}</p>}

      {data && data.estado === "PENDIENTE" && (
        <p className="text-muted-foreground text-sm">
          Esta actividad requiere que el coordinador de la sede valide su planeación.
        </p>
      )}
      {data && (data.estado === "APROBADA" || data.estado === "DECLINADA") && (
        <div className="flex flex-col gap-1 text-sm">
          {(data.validadoPor || fecha) && (
            <p className="text-muted-foreground">
              {data.estado === "APROBADA" ? "Aprobada" : "Declinada"}
              {data.validadoPor ? ` por ${data.validadoPor}` : ""}
              {fecha ? ` el ${fecha}` : ""}.
            </p>
          )}
          {data.observacion && (
            <p className="line-clamp-3 whitespace-pre-line" title={data.observacion}>
              <span className="font-medium">Observación: </span>
              {data.observacion}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Botón "Aprobar" (solo si el backend dice `puedeValidar`) + su diálogo. */
export function ValidacionCoordinadorAprobar({
  actividadId,
  requiereValidacion,
}: {
  actividadId: number
  requiereValidacion: boolean
}) {
  const { data } = useValidacionCoordinadorQuery(actividadId, requiereValidacion)
  const [open, setOpen] = useState(false)

  if (!requiereValidacion || !data?.puedeValidar) return null

  return (
    <>
      <Button type="button" variant="fill" color="primary" size="sm" onClick={() => setOpen(true)}>
        <ClipboardCheckIcon data-icon="inline-start" />
        Aprobar
      </Button>
      <DialogValidarActividad actividadId={actividadId} open={open} onOpenChange={setOpen} />
    </>
  )
}

/**
 * Barra sticky al pie para el panel de detalle (que no tiene otro footer),
 * con el mismo look que `TableScreenFooter`. Va como último hijo del
 * contenedor que scrollea; el llamador compensa su padding con márgenes
 * negativos (igual que el footer de `calificaciones-aprobacion-view`).
 */
export function ValidacionCoordinadorFooter({
  actividadId,
  requiereValidacion,
  className,
}: {
  actividadId: number
  requiereValidacion: boolean
  className?: string
}) {
  if (!requiereValidacion) return null
  return (
    <footer className={cn("bg-sidebar sticky bottom-0 z-30", className)}>
      <div className="border-border bg-background text-card-foreground flex flex-wrap items-center justify-between gap-4 border-t px-4 py-2.5 text-sm">
        <ValidacionCoordinadorEstado actividadId={actividadId} requiereValidacion={requiereValidacion} />
        <div className="ml-auto">
          <ValidacionCoordinadorAprobar actividadId={actividadId} requiereValidacion={requiereValidacion} />
        </div>
      </div>
    </footer>
  )
}

/**
 * Aprobar o declinar la planeación. "Declinar" no envía de una: primero
 * muestra la observación (obligatoria) y recién el segundo click confirma.
 * Errores del backend en un `NoticeBanner` dentro del diálogo; el éxito sale
 * por el aviso de la pantalla y cierra. No se cierra mientras guarda.
 */
function DialogValidarActividad({
  actividadId,
  open,
  onOpenChange,
}: {
  actividadId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { notify } = useNotify()
  const [declinando, setDeclinando] = useState(false)
  const [observacion, setObservacion] = useState("")
  const [intentoDeclinar, setIntentoDeclinar] = useState(false)
  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(null)
  const noticeIdRef = useRef(0)

  const resolver = useResolverValidacionCoordinador({
    mutationConfig: {
      onSuccess: (_, input) => {
        notify(
          input.decision === "APROBADA" ? SUCCESS_MESSAGES.actividad.approved : SUCCESS_MESSAGES.actividad.declined,
          { variant: "success" },
        )
        cerrar()
      },
      onError: (error) => {
        noticeIdRef.current += 1
        setNotice({ id: noticeIdRef.current, message: getErrorMessage(error), variant: "error" })
      },
    },
  })

  const observacionVacia = observacion.trim() === ""
  const observacionInvalida = declinando && intentoDeclinar && observacionVacia

  function cerrar() {
    setDeclinando(false)
    setObservacion("")
    setIntentoDeclinar(false)
    setNotice(null)
    onOpenChange(false)
  }

  function handleOpenChange(next: boolean) {
    if (resolver.isPending) return
    if (!next) cerrar()
    else onOpenChange(true)
  }

  function aprobar() {
    setNotice(null)
    resolver.mutate({ actividadId, decision: "APROBADA" })
  }

  function declinar() {
    if (!declinando) {
      setDeclinando(true)
      return
    }
    setIntentoDeclinar(true)
    if (observacionVacia) return
    setNotice(null)
    resolver.mutate({ actividadId, decision: "DECLINADA", observacion })
  }

  const decisionEnCurso = resolver.isPending ? resolver.variables?.decision : undefined

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Validar actividad</DialogTitle>
          <DialogDescription>
            Apruebe la planeación de la actividad o declínela indicando la observación para el docente.
          </DialogDescription>
        </DialogHeader>

        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant={notice?.variant} />

        {declinando && (
          <Field variant="outlined" data-invalid={observacionInvalida}>
            <FieldLabel htmlFor="observacion-validacion">Observación *</FieldLabel>
            <Textarea
              className={TEXTAREA_OUTLINED}
              id="observacion-validacion"
              rows={4}
              autoFocus
              placeholder="Explique al docente por qué se declina la actividad"
              maxLength={OBSERVACION_VALIDACION_MAX}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              disabled={resolver.isPending}
              aria-invalid={observacionInvalida}
            />
            <CharacterCounter value={observacion} max={OBSERVACION_VALIDACION_MAX} />
            {observacionInvalida && <FieldError errors={[{ message: "La observación es obligatoria para declinar." }]} />}
          </Field>
        )}

        <DialogFooter className="sm:justify-end">
          {!declinando && (
            <Button type="button" variant="fill" color="primary" size="sm" disabled={resolver.isPending} onClick={aprobar}>
              {decisionEnCurso === "APROBADA" ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Aprobar
            </Button>
          )}
          <Button
            type="button"
            variant={declinando ? "fill" : "outline"}
            color="destructive"
            size="sm"
            disabled={resolver.isPending}
            onClick={declinar}
          >
            {decisionEnCurso === "DECLINADA" ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <XCircleIcon data-icon="inline-start" />
            )}
            {declinando ? "Confirmar declinación" : "Declinar"}
          </Button>
          <Button
            type="button"
            variant="fill"
            color="neutral"
            size="sm"
            disabled={resolver.isPending}
            onClick={() => (declinando ? setDeclinando(false) : cerrar())}
          >
            <XIcon data-icon="inline-start" />
            {declinando ? "Volver" : "Cerrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
