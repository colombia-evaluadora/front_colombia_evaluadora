import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useIntervencionQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-intervenciones-query"
import type { CasoDetalle, IntervencionDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { EnlaceEvidencia } from "@/features/gestion-estudiantil/reintegracion/components/detalle/enlace-evidencia"

const SECCIONES: { campo: keyof IntervencionDetalle; label: string }[] = [
  { campo: "trabajo_realizado", label: "Trabajo realizado" },
  { campo: "comportamiento_casa", label: "Comportamiento en casa" },
  { campo: "relacion_familiares", label: "Relación con los familiares" },
  { campo: "estrategias_disciplinarias", label: "Estrategias disciplinarias" },
  { campo: "pruebas_aplicadas", label: "Pruebas aplicadas" },
  { campo: "compromisos", label: "Compromisos" },
  { campo: "recomendaciones_familia", label: "Recomendaciones a la familia" },
  { campo: "recomendaciones_docente", label: "Recomendaciones al docente" },
]

interface Props {
  caso: CasoDetalle
  intervencionId: number
  onClose: () => void
}

/** Ver detalle de una intervención (G.9.INT.2), de solo lectura: datos, las secciones con texto y las evidencias. */
export function DialogoDetalleIntervencion({ caso, intervencionId, onClose }: Props) {
  const q = useIntervencionQuery(caso.id, intervencionId)
  const i = q.data

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Intervención — {caso.estudiante_nombre}
            {i && ` · ${i.tipo.nombre}`}
          </DialogTitle>
        </DialogHeader>
        {q.isPending && <Skeleton className="h-48" />}
        {q.isError && <ErrorNoticeBanner error={q.error} />}
        {i && (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Dato label="Tipo de intervención">{i.tipo.nombre}</Dato>
              <Dato label="Fecha programada">{formatFecha(i.fecha_programada)}</Dato>
              <Dato label="Fecha de realización">{formatFecha(i.fecha_realizacion)}</Dato>
              <Dato label="Resultado">
                {i.resultado ? (
                  <Badge variant="soft" color="info">
                    <span>{i.resultado.nombre}</span>
                  </Badge>
                ) : null}
              </Dato>
              <Dato label="Registrada por">{i.autor.nombre}</Dato>
            </dl>
            {SECCIONES.map(({ campo, label }) => {
              const texto = i[campo]
              return typeof texto === "string" && texto.trim() ? (
                <section key={campo} className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <p className="text-sm whitespace-pre-line">{texto}</p>
                </section>
              ) : null
            })}
            <section className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold">Evidencias</h3>
              {i.evidencias.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin evidencias.</p>
              ) : (
                i.evidencias.map((e) => <EnlaceEvidencia key={e.id} id={e.id} nombre={e.nombre} />)
              )}
            </section>
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
