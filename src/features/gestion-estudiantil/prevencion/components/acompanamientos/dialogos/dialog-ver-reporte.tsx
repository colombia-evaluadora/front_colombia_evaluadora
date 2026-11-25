import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { FichaDatos } from "@/components/ficha-datos"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LinkIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import { abreviarPersona, formatFecha, formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { useReporteConsumoQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-acompanamientos-query"
import type { ReporteConsumoRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoReporteConsumo } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/badges-acompanamiento"
import { BloqueContexto } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/bloque-contexto"

interface Props {
  reporte: ReporteConsumoRow
  onClose: () => void
  onVincular: () => void
}

/** Ver reporte (G.8.CON.8): el texto original sin cambios; abrirlo lo pasa de Pendiente de revisión a Recibido. */
export function DialogVerReporte({ reporte, onClose, onVincular }: Props) {
  const q = useReporteConsumoQuery(reporte.id)
  const r = q.data
  const queryClient = useQueryClient()
  // El estado del listado cambia al abrirlo (Recibido): se refresca la vista Reportes recibidos.
  useEffect(() => {
    if (q.isSuccess) queryClient.invalidateQueries({ queryKey: [...prevencionKeys.all, "reportes-consumo"] })
  }, [q.isSuccess, queryClient])

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Reporte de posible consumo — {reporte.estudiante_nombre}</DialogTitle>
        </DialogHeader>
        {q.isPending ? (
          <Skeleton className="h-48" />
        ) : q.isError || !r ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró el reporte." />
        ) : (
          <div className="flex flex-col gap-4">
            <FichaDatos
              datos={[
                { etiqueta: "Fecha de conocimiento", valor: formatFecha(r.fecha_conocimiento) },
                { etiqueta: "Reportado por", valor: abreviarPersona(r.reportado_por) },
                { etiqueta: "Estado", valor: <BadgeEstadoReporteConsumo estado={r.estado} nombre={r.estado_nombre} /> },
                { etiqueta: "Fuente", valor: r.fuente },
                ...(r.recibido_en ? [{ etiqueta: "Recibido", valor: formatFechaHora(r.recibido_en) }] : []),
                ...(r.atendido_en ? [{ etiqueta: "Atendido", valor: formatFechaHora(r.atendido_en) }] : []),
                { etiqueta: "Lo observado", valor: <span className="whitespace-pre-line">“{r.descripcion}”</span>, ancho: true },
              ]}
            />
            <BloqueContexto contexto={r.contexto} />
          </div>
        )}
        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={onClose}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </Button>
          <Button size="sm" type="button" disabled={!r?.puede_vincular} onClick={onVincular}>
            <LinkIcon data-icon="inline-start" />
            Vincular reporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
