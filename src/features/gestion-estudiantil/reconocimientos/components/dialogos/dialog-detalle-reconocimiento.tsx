import { useState, type ReactNode } from "react"

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
import { PaperclipIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useReconocimientoQuery } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"

interface Props {
  reconocimientoId: number
  onClose: () => void
}

function Dato({ etiqueta, children, ancho }: { etiqueta: string; children: ReactNode; ancho?: boolean }) {
  return (
    <div className={ancho ? "flex flex-col gap-0.5 sm:col-span-2" : "flex flex-col gap-0.5"}>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm">{children || "—"}</dd>
    </div>
  )
}

/** Ver detalle (§7.1): todos los campos, la actividad, el soporte descargable, el período y la anulación. */
export function DialogDetalleReconocimiento({ reconocimientoId, onClose }: Props) {
  const { data: r, isPending, isError, error } = useReconocimientoQuery(reconocimientoId)
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Reconocimiento</span>
            {r?.anulado && (
              <Badge variant="soft" color="muted">
                <span>Anulado</span>
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        {isPending && <Skeleton className="h-48 w-full" />}
        {isError && <p role="alert" className="text-sm text-destructive">{getErrorMessage(error)}</p>}
        <ErrorNoticeBanner error={errorSoporte} />
        {r && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Dato etiqueta="Estudiante">{r.estudiante_nombre}</Dato>
            <Dato etiqueta="Documento">{r.estudiante_documento}</Dato>
            <Dato etiqueta="Grado/Grupo">{r.grado_grupo}</Dato>
            <Dato etiqueta="Fecha">{formatFecha(r.fecha)}</Dato>
            <Dato etiqueta="Tipo">{r.tipo_nombre}</Dato>
            <Dato etiqueta="Período de Evaluación">{r.periodo_evaluacion_nombre}</Dato>
            <Dato etiqueta="Motivo" ancho>{r.motivo}</Dato>
            <Dato etiqueta="Otorgado por">{r.otorgado_por}</Dato>
            <Dato etiqueta="Registrado por">{r.registrado_por}</Dato>
            <Dato etiqueta="Actividad relacionada">{r.actividad_nombre}</Dato>
            <Dato etiqueta="Soporte">
              {r.fk_tarchivo_soporte != null && (
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
              )}
            </Dato>
            {r.anulacion && (
              <>
                <Dato etiqueta="Fecha de anulación">{formatFecha(r.anulacion.fecha)}</Dato>
                <Dato etiqueta="Anulado por">{r.anulacion.por}</Dato>
                <Dato etiqueta="Motivo de la anulación" ancho>{r.anulacion.motivo}</Dato>
              </>
            )}
          </dl>
        )}
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cerrar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
