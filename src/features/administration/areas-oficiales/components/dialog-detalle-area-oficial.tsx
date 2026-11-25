import { FichaDatos } from "@/components/ficha-datos"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InfoIcon, XIcon } from "@/components/ui/icons"

import {
  AREA_EN_USO_MENSAJE,
  DIMENSION_TRANSVERSAL_LABEL,
  type AreaOficial,
} from "@/features/administration/areas-oficiales/api/types/area-oficial"

interface DialogDetalleAreaOficialProps {
  area: AreaOficial | null
  onClose: () => void
}

/** "Ver detalle": solo lectura, con los usos que deciden si se puede eliminar. */
export function DialogDetalleAreaOficial({ area, onClose }: DialogDetalleAreaOficialProps) {
  return (
    <Dialog open={area != null} onOpenChange={(next) => !next && onClose()}>
      {area && (
        <DialogContent showCloseButton={false} className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{area.nombre}</DialogTitle>
          </DialogHeader>
          <FichaDatos
            datos={[
              {
                etiqueta: "Estado",
                valor: area.habilitada ? (
                  <Badge variant="soft" color="success">
                    Activa
                  </Badge>
                ) : (
                  <Badge variant="soft" color="neutral">
                    Inactiva
                  </Badge>
                ),
              },
              {
                etiqueta: "Niveles educativos",
                valor: area.niveles.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {area.niveles.map((n) => (
                      <li key={n.pkNivel}>
                        <Badge variant="soft" color="neutral">
                          {n.nombre}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  "—"
                ),
              },
              ...(area.esDimensionTransversal
                ? [
                    {
                      etiqueta: "Marca",
                      // Fila entera: el badge es largo y no se parte (en media fila se salía de la celda).
                      ancho: true,
                      valor: (
                        <Badge variant="soft" color="info">
                          {DIMENSION_TRANSVERSAL_LABEL}
                        </Badge>
                      ),
                    },
                  ]
                : []),
              ...(area.especialidad ? [{ etiqueta: "Especialidad", valor: area.especialidad }] : []),
              {
                etiqueta: "En uso",
                valor: (
                  <span className="tabular-nums">
                    {area.usos.planesEstudio} en Planes de estudio · {area.usos.referentes} en Referentes
                  </span>
                ),
              },
            ]}
          />
          {area.enUso && (
            <p className="flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm text-blue">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {AREA_EN_USO_MENSAJE}
            </p>
          )}
          <DialogFooter>
            <Button size="sm" type="button" variant="outline" color="neutral" onClick={onClose}>
              <XIcon data-icon="inline-start" />
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
