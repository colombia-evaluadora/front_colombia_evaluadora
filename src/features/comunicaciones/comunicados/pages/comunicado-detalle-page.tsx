import { Link } from "@tanstack/react-router"

import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, PencilIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { comunicadoDetalleRoute } from "@/router"
import { useComunicadoQuery } from "@/features/comunicaciones/chat/api/query/use-comunicado-query"
import { ComunicadoArticulo } from "@/features/comunicaciones/chat/components/comunicado-panel"

/**
 * Detalle y seguimiento (Guía M.1.DET.1): datos del emisor, contenido, adjuntos y, para quien lo
 * gestiona, leídos sobre destinatarios con su registro de recepción, Anular y Cancelar (los mismos
 * de la tarjeta del chat). El seguimiento por canal (correos enviados / fallidos, sin canal) necesita
 * un registro de entrega que aún no existe en la base: queda para la Fase C.
 */
export function ComunicadoDetallePage() {
  return (
    <NoticeProvider>
      <DetalleContent />
    </NoticeProvider>
  )
}

function DetalleContent() {
  const { id } = comunicadoDetalleRoute.useParams()
  const q = useComunicadoQuery(Number(id))
  const c = q.data
  const modificable = !!c?.esCreador && (c.estado === "PUBLICADO" || c.estado === "PROGRAMADO")

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          color="neutral"
          render={<Link to={paths.app.comunicacionesComunicados.getHref()} />}
          nativeButton={false}
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden />
          Volver
        </Button>
        {modificable && (
          <Button
            variant="outline"
            render={<Link to={paths.app.comunicacionesComunicadoEditar.getHref(id)} />}
            nativeButton={false}
          >
            <PencilIcon data-icon="inline-start" aria-hidden />
            Modificar
          </Button>
        )}
      </div>
      <NoticeOutlet />
      {q.isPending ? (
        <Spinner className="m-6" />
      ) : q.isError || !c ? (
        <p className="text-sm text-muted-foreground">
          {q.isError ? getErrorMessage(q.error) : "El comunicado no existe."}{" "}
          <button type="button" onClick={() => void q.refetch()} className="font-medium text-primary underline">
            Reintentar
          </button>
        </p>
      ) : (
        <ComunicadoArticulo comunicado={c} />
      )}
    </div>
  )
}
