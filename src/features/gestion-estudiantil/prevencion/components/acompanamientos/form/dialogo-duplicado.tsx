import { useState } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClockCounterClockwiseIcon, ControlPointIcon, WarningIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useAcompHistorialQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-acompanamientos-query"
import type { TipoAcompanamiento } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoAcomp } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/badges-acompanamiento"

interface Props {
  /** Mensaje del backend (409): situación, fecha y responsable del abierto. */
  mensaje: string
  tipo: TipoAcompanamiento
  matricula: number | undefined
  pending: boolean
  onClose: () => void
  onCrear: () => void
}

/**
 * Aviso «Ya existe un acompañamiento abierto» (G.8.EMB.4, también en consumo): advierte pero permite seguir.
 * Ver historial despliega los acompañamientos del tipo de ese estudiante, Cerrados y Anulados incluidos.
 */
export function DialogoDuplicado({ mensaje, tipo, matricula, pending, onClose, onCrear }: Props) {
  const [verHistorial, setVerHistorial] = useState(false)
  const h = useAcompHistorialQuery(matricula, tipo, verHistorial)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WarningIcon className="size-5 text-warning" aria-hidden="true" />
            Ya existe un acompañamiento abierto
          </DialogTitle>
          <DialogDescription>
            {mensaje}. Consulte su historial antes de crear otro, para evitar duplicados.
          </DialogDescription>
        </DialogHeader>

        {verHistorial &&
          (h.isPending ? (
            <Skeleton className="h-24" />
          ) : h.isError ? (
            <ErrorNoticeBanner error={h.error} />
          ) : (
            <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto text-sm">
              {(h.data ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2">
                  <span>{formatFecha(a.fecha_conocimiento)}</span>
                  {a.situacion_nombre && <span>{a.situacion_nombre}</span>}
                  <span className="text-muted-foreground">{abreviarPersona(a.responsable_nombre)}</span>
                  <BadgeEstadoAcomp estado={a.estado} nombre={a.estado_nombre} />
                </li>
              ))}
            </ul>
          ))}

        {/* La acción recomendada (Ver historial) va en azul a la derecha; Crear de todos modos queda secundaria. */}
        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" disabled={pending} onClick={onClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" type="button" variant="outline" color="neutral" disabled={pending} onClick={onCrear}>
            <ControlPointIcon data-icon="inline-start" />
            Crear de todos modos
          </Button>
          <Button size="sm" type="button" disabled={verHistorial} onClick={() => setVerHistorial(true)}>
            <ClockCounterClockwiseIcon data-icon="inline-start" />
            Ver historial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
