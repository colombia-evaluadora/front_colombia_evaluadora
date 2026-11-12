import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PencilIcon, ProhibitIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"

import { formatFecha, formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useObservacionQuery } from "@/features/gestion-estudiantil/observaciones/api/query/use-observaciones-query"
import type { ObservacionRow } from "@/features/gestion-estudiantil/observaciones/api/types"
import { accionesObservacion } from "@/features/gestion-estudiantil/observaciones/api/ui-mappings"

interface Props {
  observacionId: number
  onClose: () => void
  /** Abre Modificar o Anular encima del detalle, con las mismas reglas que el menú ⋮. */
  onAccion: (accion: "modificar" | "anular", observacion: ObservacionRow) => void
}

function Dato({ etiqueta, children, ancho }: { etiqueta: string; children: ReactNode; ancho?: boolean }) {
  return (
    <div className={ancho ? "flex flex-col gap-0.5 sm:col-span-2" : "flex flex-col gap-0.5"}>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm whitespace-pre-line">{children || "—"}</dd>
    </div>
  )
}

/** Ver detalle (§8): los campos de la observación, su Período de Evaluación, a cuántos aplica y la anulación. */
export function DialogDetalleObservacion({ observacionId, onClose, onAccion }: Props) {
  const { data: o, isPending, isError, error } = useObservacionQuery(observacionId)
  const fila: ObservacionRow | null = o ? { ...o, total_count: 0 } : null
  const acciones = o ? accionesObservacion(o) : null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Observación</span>
            {o?.anulada && (
              <Badge variant="soft" color="muted">
                <span>Anulada</span>
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        {isPending && <Skeleton className="h-48 w-full" />}
        {isError && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(error)}
          </p>
        )}
        {o && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Dato etiqueta="Fecha">{formatFecha(o.fecha)}</Dato>
            <Dato etiqueta="Período de Evaluación">{o.periodo_nombre}</Dato>
            <Dato etiqueta="Grado/Grupo">{o.grado_grupo}</Dato>
            <Dato etiqueta="Dirigida a">
              {o.fk_tmatricula != null
                ? o.dirigida_a
                : `${o.dirigida_a} · ${o.estudiantes_cuenta} ${o.estudiantes_cuenta === 1 ? "estudiante" : "estudiantes"}`}
            </Dato>
            <Dato etiqueta="Título" ancho>
              {o.titulo}
            </Dato>
            <Dato etiqueta="Observación" ancho>
              {o.observacion}
            </Dato>
            <Dato etiqueta="Registrado por">{o.registrado_por_nombre}</Dato>
            <Dato etiqueta="Fecha de registro">{formatFechaHora(o.created_at)}</Dato>
            {o.anulada && (
              <>
                <Dato etiqueta="Fecha de anulación">{formatFechaHora(o.anulado_en)}</Dato>
                <Dato etiqueta="Anulada por">{o.anulado_por_nombre}</Dato>
                <Dato etiqueta="Motivo de la anulación" ancho>
                  {o.motivo_anulacion}
                </Dato>
              </>
            )}
          </dl>
        )}
        <DialogFooter>
          {fila && acciones && (
            <>
              <Button
                size="sm"
                type="button"
                variant="outline"
                color="neutral"
                disabled={!acciones.modificar}
                onClick={() => onAccion("modificar", fila)}
              >
                <PencilIcon data-icon="inline-start" />
                Modificar
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                color="destructive"
                disabled={!acciones.anular}
                onClick={() => onAccion("anular", fila)}
              >
                <ProhibitIcon data-icon="inline-start" />
                Anular
              </Button>
            </>
          )}
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cerrar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
