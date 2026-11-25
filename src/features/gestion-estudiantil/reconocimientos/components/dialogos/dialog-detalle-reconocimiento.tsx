import { useState } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
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
import { MedalIcon, PaperclipIcon, ProhibitIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"

import { FichaDatos } from "@/components/ficha-datos"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useReconocimientoQuery } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"
import type { ReconocimientoRow } from "@/features/gestion-estudiantil/reconocimientos/api/types"
import { accionesReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/api/ui-mappings"

interface Props {
  reconocimientoId: number
  onClose: () => void
  /** Abre Anular o la Mención de honor encima del detalle, con las mismas reglas que el menú ⋮. */
  onAccion?: (accion: "anular" | "mencion", reconocimiento: ReconocimientoRow) => void
}

/** Ver detalle (§7.1): todos los campos, la actividad, el soporte descargable, el período y la anulación. */
export function DialogDetalleReconocimiento({ reconocimientoId, onClose, onAccion }: Props) {
  const { data: r, isPending, isError, error } = useReconocimientoQuery(reconocimientoId)
  const fila: ReconocimientoRow | null = r ? { ...r, total_count: 0 } : null
  const acciones = fila ? accionesReconocimiento(fila) : null
  const [errorSoporte, setErrorSoporte] = useState<unknown>(null)
  const [abriendo, setAbriendo] = useState(false)

  async function abrirSoporte(archivoId: number) {
    setErrorSoporte(null)
    setAbriendo(true)
    try {
      const { url } = await fetchArchivoViewUrl(archivoId)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (e) {
      setErrorSoporte(e)
    } finally {
      setAbriendo(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Reconocimiento</span>
            {r?.anulado && (
              <Badge variant="soft" color="neutral">
                <span>Anulado</span>
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        {isPending && <Skeleton className="h-48 w-full" />}
        {isError && <p role="alert" className="text-sm text-destructive">{getErrorMessage(error)}</p>}
        <ErrorNoticeBanner error={errorSoporte} />
        {r && (
          <FichaDatos
            datos={[
              { etiqueta: "Estudiante", valor: r.estudiante_nombre },
              { etiqueta: "Documento", valor: r.estudiante_documento },
              { etiqueta: "Grado/Grupo", valor: r.grado_grupo },
              { etiqueta: "Fecha", valor: formatFecha(r.fecha) },
              { etiqueta: "Tipo", valor: r.tipo_nombre },
              { etiqueta: "Período de evaluación", valor: r.periodo_evaluacion_nombre },
              { etiqueta: "Motivo", valor: r.motivo, ancho: true },
              { etiqueta: "Otorgado por", valor: r.otorgado_por },
              { etiqueta: "Registrado por", valor: r.registrado_por },
              { etiqueta: "Actividad relacionada", valor: r.actividad_nombre },
              {
                etiqueta: "Soporte",
                valor: r.fk_tarchivo_soporte != null && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    disabled={abriendo}
                    onClick={() => abrirSoporte(r.fk_tarchivo_soporte as number)}
                  >
                    <PaperclipIcon data-icon="inline-start" />
                    {r.soporte_nombre ?? "Descargar soporte"}
                  </Button>
                ),
              },
              ...(r.anulacion
                ? [
                    { etiqueta: "Fecha de anulación", valor: formatFecha(r.anulacion.fecha) },
                    { etiqueta: "Anulado por", valor: r.anulacion.por },
                    { etiqueta: "Motivo de la anulación", valor: r.anulacion.motivo, ancho: true },
                  ]
                : []),
            ]}
          />
        )}
        {/* Orden de los pies de modal: Cerrar (secundario), Anular (destructivo) y la acción principal a la
            derecha, en azul: Generar mención de honor. */}
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </DialogClose>
          {fila && acciones && onAccion && (
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
              <Button
                size="sm"
                type="button"
                disabled={!acciones.mencionHonor}
                onClick={() => onAccion("mencion", fila)}
              >
                <MedalIcon data-icon="inline-start" />
                Generar mención de honor
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
