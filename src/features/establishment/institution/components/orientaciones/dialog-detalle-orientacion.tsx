import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChatTextIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"

import { useOrientacionRecibidaQuery } from "@/features/establishment/institution/api/query/use-orientaciones-recibidas"
import type {
  OrientacionRecibida,
  OrientacionRecibidaDetalle,
} from "@/features/establishment/institution/api/types/orientacion"
import { EstadoOrientacionBadge } from "@/features/establishment/institution/components/orientaciones/estado-orientacion-badge"
import { OrientacionResumen } from "@/features/establishment/institution/components/orientaciones/orientacion-resumen"
import { enviadaTexto, fechaCorta } from "@/features/establishment/institution/utils/orientaciones"

interface DialogDetalleOrientacionProps {
  /** Id de la orientación abierta; undefined = cerrado. Llega de la URL (el enlace del aviso la abre). */
  id: number | undefined
  onClose: () => void
  puedeResponder: boolean
  onResponder: (orientacion: OrientacionRecibida) => void
}

/**
 * Ver detalle (informe, 2.3): la orientación completa, la respuesta y la alerta vinculada, si existe. No
 * tiene formulario: es el mismo recuadro del modal Responder, en solo lectura.
 */
export function DialogDetalleOrientacion({
  id,
  onClose,
  puedeResponder,
  onResponder,
}: DialogDetalleOrientacionProps) {
  const { data, isPending, isError, error } = useOrientacionRecibidaQuery(id)

  return (
    <Dialog open={id != null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{data ? `Orientación — ${data.tema}` : "Orientación"}</DialogTitle>
          <DialogDescription>{data ? enviadaTexto(data) : " "}</DialogDescription>
        </DialogHeader>
        {isError ? (
          <NoticeBanner
            notice={{ id: 1, message: getErrorMessage(error) }}
            onClose={onClose}
            variant="error"
          />
        ) : isPending || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <OrientacionResumen filas={filasDetalle(data)} />
        )}
        {data && puedeResponder && data.estado === "ENVIADA" ? (
          <DialogFooter>
            <Button size="sm" color="primary" onClick={() => onResponder(data)}>
              <ChatTextIcon data-icon="inline-start" />
              Responder
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function filasDetalle(data: OrientacionRecibidaDetalle) {
  const filas = [
    { label: "Orientación", value: data.orientacion },
    { label: "Estado", value: <EstadoOrientacionBadge estado={data.estado} /> },
  ]
  if (data.estado === "ATENDIDA") {
    filas.push(
      { label: "Respuesta", value: data.respuesta ?? "—" },
      {
        label: "Fecha de atención",
        value: data.respondidaPor
          ? `${fechaCorta(data.fechaAtencion)} · ${data.respondidaPor}`
          : fechaCorta(data.fechaAtencion),
      },
    )
  }
  if (data.alerta) {
    const { estudiante, umbral, escaladaEl } = data.alerta
    filas.push({
      label: "Alerta vinculada",
      value: [
        `Alerta de inasistencia${estudiante ? ` de ${estudiante}` : ""}`,
        umbral ? `umbral ${umbral}` : null,
        escaladaEl ? `escalada el ${fechaCorta(escaladaEl)}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    })
  }
  return filas
}
