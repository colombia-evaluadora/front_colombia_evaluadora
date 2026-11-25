import { FichaDatos } from "@/components/ficha-datos"
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
import { PencilIcon, ProhibitIcon, XIcon } from "@/components/ui/icons"
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

/**
 * Ver detalle (§8): los campos de la observación, su Período de Evaluación, a cuántos aplica y la anulación,
 * en la ficha de datos de los Ver detalle (`FichaDatos`, como Reconocimientos).
 */
export function DialogDetalleObservacion({ observacionId, onClose, onAccion }: Props) {
  const { data: o, isPending, isError, error } = useObservacionQuery(observacionId)
  const fila: ObservacionRow | null = o ? { ...o, total_count: 0 } : null
  const acciones = o ? accionesObservacion(o) : null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Observación</span>
            {o?.anulada && (
              <Badge variant="soft" color="neutral">
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
          <FichaDatos
            datos={[
              { etiqueta: "Fecha", valor: formatFecha(o.fecha) },
              { etiqueta: "Período de evaluación", valor: o.periodo_nombre },
              { etiqueta: "Grado/Grupo", valor: o.grado_grupo },
              {
                etiqueta: "Dirigida a",
                valor:
                  o.fk_tmatricula != null
                    ? o.dirigida_a
                    : `${o.dirigida_a} · ${o.estudiantes_cuenta} ${o.estudiantes_cuenta === 1 ? "estudiante" : "estudiantes"}`,
              },
              { etiqueta: "Título", valor: o.titulo, ancho: true },
              { etiqueta: "Observación", valor: <span className="whitespace-pre-line">{o.observacion}</span>, ancho: true },
              { etiqueta: "Registrado por", valor: o.registrado_por_nombre },
              { etiqueta: "Fecha de registro", valor: formatFechaHora(o.created_at) },
              ...(o.anulada
                ? [
                    { etiqueta: "Fecha de anulación", valor: formatFechaHora(o.anulado_en) },
                    { etiqueta: "Anulada por", valor: o.anulado_por_nombre },
                    { etiqueta: "Motivo de la anulación", valor: o.motivo_anulacion, ancho: true },
                  ]
                : []),
            ]}
          />
        )}
        {/* Pie: Cerrar, Anular (outline rojo) y Modificar. En modo ver no hay acción principal: Modificar
            va secundario (CLAUDE.md §13). */}
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </DialogClose>
          {fila && acciones && (
            <>
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
              <Button size="sm" type="button" variant="outline" color="neutral" disabled={!acciones.modificar} onClick={() => onAccion("modificar", fila)}>
                <PencilIcon data-icon="inline-start" />
                Modificar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
