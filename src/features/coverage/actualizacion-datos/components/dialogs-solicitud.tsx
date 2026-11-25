import { useState } from "react"

import { FichaDatos } from "@/components/ficha-datos"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { CheckIcon, XIcon } from "@/components/ui/icons"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { useAprobarSolicitud, useRechazarSolicitud } from "@/features/coverage/actualizacion-datos/api/actualizacion"
import type { SolicitudCorreccion } from "@/features/coverage/actualizacion-datos/api/types"
import { formatoFecha } from "@/features/coverage/promocion-nivelacion/api/formato"
import { Aviso } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"

const MOTIVO_MIN = 10
const MOTIVO_MAX = 500

/** «Sara Gil Moreno · Segundo apellido: Moreno → Morales», como en C.6.SOL.3. */
const resumen = (s: SolicitudCorreccion) => (
  <span className="text-sm">
    {s.estudiante} · {s.dato}: {s.valorActual} → {s.valorSolicitado}
  </span>
)

/** Aprobar: se aplica como corrección de datos de identidad (Regla 43) con el motivo y el soporte del solicitante. */
export function DialogAprobarSolicitud({ solicitud: s, onClose }: { solicitud: SolicitudCorreccion; onClose: () => void }) {
  const { notify } = useNotify()
  const aprobar = useAprobarSolicitud()
  const [error, setError] = useState<unknown>(null)
  return (
    <DialogoOperacionShell
      titulo="Aprobar solicitud de corrección"
      resumen={resumen(s)}
      onClose={onClose}
      error={error}
      pending={aprobar.isPending}
      confirmar={{
        label: "Aprobar",
        icon: <CheckIcon data-icon="inline-start" />,
        onClick: () => {
          setError(null)
          aprobar.mutate(s.solicitudId, {
            onSuccess: () => {
              notify(`Se aprobó la solicitud y se corrigió ${s.dato.toLowerCase()} de ${s.estudiante}.`, { variant: "success" })
              onClose()
            },
            onError: setError,
          })
        },
      }}
    >
      <div className="grid gap-3 text-sm">
        <p>
          <span className="text-muted-foreground">Solicitante:</span> {s.solicitante} · {formatoFecha(s.fecha)}
        </p>
        <p>
          <span className="text-muted-foreground">Motivo:</span> {s.motivo}
        </p>
        <Aviso tono="info">Se aplica como corrección de datos de identidad, con el motivo y el soporte del solicitante, y queda en la Bitácora.</Aviso>
      </div>
    </DialogoOperacionShell>
  )
}

/** Rechazar (C.6.SOL.3): el motivo es obligatorio y se le notifica al solicitante. */
export function DialogRechazarSolicitud({ solicitud: s, onClose }: { solicitud: SolicitudCorreccion; onClose: () => void }) {
  const { notify } = useNotify()
  const rechazar = useRechazarSolicitud()
  const [motivo, setMotivo] = useState("")
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const largo = motivo.trim().length
  const errorMotivo =
    largo === 0
      ? "El motivo del rechazo es obligatorio."
      : largo < MOTIVO_MIN || largo > MOTIVO_MAX
        ? `El motivo debe tener entre ${MOTIVO_MIN} y ${MOTIVO_MAX} caracteres.`
        : undefined
  const invalido = intento && Boolean(errorMotivo)
  return (
    <DialogoOperacionShell
      titulo="Rechazar solicitud de corrección"
      resumen={resumen(s)}
      onClose={onClose}
      error={error}
      pending={rechazar.isPending}
      confirmar={{
        label: "Confirmar rechazo",
        color: "destructive",
        icon: <XIcon data-icon="inline-start" />,
        onClick: () => {
          setIntento(true)
          setError(null)
          if (errorMotivo) return
          rechazar.mutate(
            { id: s.solicitudId, motivo: motivo.trim() },
            {
              onSuccess: () => {
                notify(`Se rechazó la solicitud de ${s.solicitante}.`, { variant: "success" })
                onClose()
              },
              onError: setError,
            },
          )
        },
      }}
    >
      <Field variant="outlined" className="gap-1.5" data-invalid={invalido || undefined}>
        <FieldLabel htmlFor="rechazo-motivo">
          Motivo del rechazo<span data-required-mark="">*</span>
        </FieldLabel>
        <div className="relative">
          <Textarea
            id="rechazo-motivo"
            rows={3}
            maxLength={MOTIVO_MAX}
            value={motivo}
            aria-invalid={invalido || undefined}
            className={cn(TEXTAREA_OUTLINED, "pr-16")}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <CharacterCounter value={motivo} max={MOTIVO_MAX} className="absolute top-3 right-3" />
        </div>
        {invalido ? <FieldError>{errorMotivo}</FieldError> : <FieldDescription>Se le notifica al solicitante.</FieldDescription>}
      </Field>
    </DialogoOperacionShell>
  )
}

const ETIQUETA_ESTADO = { PENDIENTE: "Pendiente", APROBADA: "Aprobada", RECHAZADA: "Rechazada" } as const

/** Ver detalle de una solicitud ya decidida: la decisión y su motivo. */
export function DialogDetalleSolicitud({ solicitud: s, onClose }: { solicitud: SolicitudCorreccion; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Solicitud de corrección</DialogTitle>
        </DialogHeader>
        <FichaDatos
          datos={[
            { etiqueta: "Solicitante", valor: s.solicitante },
            { etiqueta: "Estudiante", valor: s.estudiante },
            { etiqueta: "Dato", valor: s.dato },
            { etiqueta: "Valor actual", valor: s.valorActual },
            { etiqueta: "Valor solicitado", valor: s.valorSolicitado },
            { etiqueta: "Fecha", valor: formatoFecha(s.fecha) },
            { etiqueta: "Motivo de la solicitud", valor: <span className="whitespace-pre-line">{s.motivo}</span>, ancho: true },
            {
              etiqueta: "Decisión",
              valor: `${ETIQUETA_ESTADO[s.estado]}${s.decididoPor ? ` por ${s.decididoPor}` : ""}${s.fechaDecision ? ` el ${formatoFecha(s.fechaDecision)}` : ""}`,
              ancho: true,
            },
            ...(s.motivoDecision
              ? [{ etiqueta: "Motivo del rechazo", valor: <span className="whitespace-pre-line">{s.motivoDecision}</span>, ancho: true }]
              : []),
          ]}
        />
        <DialogFooter>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
