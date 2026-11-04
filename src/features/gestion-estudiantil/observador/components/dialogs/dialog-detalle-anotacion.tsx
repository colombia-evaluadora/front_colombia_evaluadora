import type { ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

import { colorDeTipo, formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import type { AnotacionRow } from "@/features/gestion-estudiantil/observador/api/types"

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children || "—"}</dd>
    </div>
  )
}

/** Ver detalle: lo mismo del listado más observación, marcas y, si aplica, la anulación. */
export function DialogDetalleAnotacion({ anotacion, onClose }: { anotacion: AnotacionRow | null; onClose: () => void }) {
  const a = anotacion
  return (
    <Dialog open={a != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Anotación — {a?.estudiante_nombre}</DialogTitle>
        </DialogHeader>
        {a && (
          <dl className="grid grid-cols-2 gap-4">
            <Dato label="Fecha">{formatFecha(a.fecha)}</Dato>
            <Dato label="Grado/Grupo">{a.grado_grupo}</Dato>
            <Dato label="Tipo">
              <Badge variant="soft" color={colorDeTipo(a.tipo_nombre)}>
                {a.tipo_nombre}
              </Badge>
            </Dato>
            <Dato label="Tipo de situación">{a.situacion_nombre}</Dato>
            <div className="col-span-2">
              <Dato label="Código y descripción">
                <span className="font-semibold">{a.codigo}</span> · {a.descripcion}
              </Dato>
            </div>
            <div className="col-span-2">
              <Dato label="Observación">
                <span className="whitespace-pre-line">{a.observacion}</span>
              </Dato>
            </div>
            <Dato label="Responsable de enseñanza">{a.responsable_nombre}</Dato>
            <Dato label="Período de Evaluación">{a.periodo_evaluacion_nombre}</Dato>
            <Dato label="Preocupa la permanencia">{a.preocupa_permanencia ? "Sí" : "No"}</Dato>
            <Dato label="Requiere mediación">{a.requiere_mediacion ? "Sí" : "No"}</Dato>
            {a.anulada && (
              <Alert className="col-span-2">
                <AlertTitle>Anulada el {formatFecha(a.anulado_en)}{a.anulado_por_nombre && ` por ${a.anulado_por_nombre}`}</AlertTitle>
                <AlertDescription>{a.motivo_anulacion}</AlertDescription>
              </Alert>
            )}
          </dl>
        )}
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="muted" />}>
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
