import type { ReactNode } from "react"

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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{area.nombre}</DialogTitle>
          </DialogHeader>
          <dl className="grid gap-4 text-sm sm:grid-cols-[10rem_1fr]">
            <Dato label="Estado">
              {area.habilitada ? (
                <Badge variant="soft" color="success">
                  Activa
                </Badge>
              ) : (
                <Badge variant="outline" color="neutral">
                  Inactiva
                </Badge>
              )}
            </Dato>
            <Dato label="Niveles educativos">
              {area.niveles.length ? (
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
              )}
            </Dato>
            {area.esDimensionTransversal && (
              <Dato label="Marca">
                <Badge variant="soft" color="info">
                  {DIMENSION_TRANSVERSAL_LABEL}
                </Badge>
              </Dato>
            )}
            {area.especialidad && <Dato label="Especialidad">{area.especialidad}</Dato>}
            <Dato label="En uso">
              <span className="tabular-nums">
                {area.usos.planesEstudio} en Planes de Estudio · {area.usos.referentes} en
                Referentes
              </span>
            </Dato>
          </dl>
          {area.enUso && (
            <p className="flex items-start gap-2 rounded-md bg-blue-22 px-3 py-2 text-sm text-blue">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {AREA_EN_USO_MENSAJE}
            </p>
          )}
          <DialogFooter>
            <Button size="sm" type="button" variant="fill" color="neutral" onClick={onClose}>
              <XIcon data-icon="inline-start" />
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}
