import { Link } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { FichaDatos } from "@/components/ficha-datos"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { XIcon } from "@/components/ui/icons"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { colorDeTipo } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { AnotacionRow } from "@/features/gestion-estudiantil/observador/api/types"

/** Ver detalle: lo mismo del listado más observación, marcas y, si aplica, la anulación. */
export function DialogDetalleAnotacion({ anotacion, onClose }: { anotacion: AnotacionRow | null; onClose: () => void }) {
  const a = anotacion
  return (
    <Dialog open={a != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Anotación — {a?.estudiante_nombre}</DialogTitle>
        </DialogHeader>
        {/* Ficha de datos de los Ver detalle (`FichaDatos`, como Reconocimientos); la anulación va en sus
            propias filas en lugar de un aviso aparte. */}
        {a && (
          <FichaDatos
            datos={[
              { etiqueta: "Fecha", valor: formatFecha(a.fecha) },
              { etiqueta: "Grado/Grupo", valor: a.grado_grupo },
              {
                etiqueta: "Tipo",
                valor: (
                  <Badge variant="soft" color={colorDeTipo(a.tipo_codigo)}>
                    {a.tipo_nombre}
                  </Badge>
                ),
              },
              { etiqueta: "Tipo de situación", valor: a.situacion_nombre },
              {
                etiqueta: "Código y descripción",
                valor: (
                  <span>
                    <span className="font-semibold">{a.codigo}</span> · {a.descripcion}
                  </span>
                ),
                ancho: true,
              },
              { etiqueta: "Observación", valor: <span className="whitespace-pre-line">{a.observacion}</span>, ancho: true },
              { etiqueta: "Responsable de enseñanza", valor: a.responsable_nombre },
              { etiqueta: "Período de evaluación", valor: a.periodo_evaluacion_nombre },
              { etiqueta: "Preocupa la permanencia", valor: a.preocupa_permanencia ? "Sí" : "No" },
              { etiqueta: "Requiere mediación", valor: a.requiere_mediacion ? "Sí" : "No" },
              ...(a.fk_tcaso_convivencia != null
                ? [
                    {
                      etiqueta: "Caso de convivencia",
                      valor: (
                        <Link
                          to={paths.app.convivenciaCaso.getHref(a.fk_tcaso_convivencia)}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Ver el caso
                        </Link>
                      ),
                    },
                  ]
                : []),
              ...(a.anulada
                ? [
                    { etiqueta: "Fecha de anulación", valor: formatFecha(a.anulado_en) },
                    { etiqueta: "Anulada por", valor: a.anulado_por_nombre },
                    { etiqueta: "Motivo de la anulación", valor: a.motivo_anulacion, ancho: true },
                  ]
                : []),
            ]}
          />
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
