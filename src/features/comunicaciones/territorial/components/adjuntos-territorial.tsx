import { useState } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import { FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage, isNotFoundError } from "@/lib/api-client"
import type { AdjuntoComunicado } from "@/features/comunicaciones/chat/api/types"
import { descargarAdjunto, pesoLegible } from "@/features/comunicaciones/chat/lib/archivo-adjunto"

/**
 * Adjuntos del detalle territorial con su descarga. El permiso lo decide file-service al acuñar el
 * token de vista (alcance territorial): si el comunicado se anuló o salió del alcance, responde 404
 * sin cuerpo.
 */
export function AdjuntosTerritorial({ adjuntos }: { adjuntos: AdjuntoComunicado[] }) {
  const [error, setError] = useState<Error | null>(null)
  if (adjuntos.length === 0) return null

  const descargar = async (a: AdjuntoComunicado) => {
    setError(null)
    try {
      await descargarAdjunto(a.archivoId, a.nombre)
    } catch (e) {
      setError(new Error(isNotFoundError(e) ? `El archivo ${a.nombre} ya no está disponible.` : getErrorMessage(e)))
    }
  }

  return (
    <section aria-label="Adjuntos" className="space-y-1">
      <p className="text-xs text-muted-foreground">Adjuntos</p>
      <ErrorNoticeBanner error={error} />
      <ul className="space-y-1">
        {adjuntos.map((a) => (
          <li key={a.id} className="flex items-center gap-2">
            <span className="min-w-0 break-words">
              {a.nombre}
              {a.peso > 0 && <span className="text-xs text-muted-foreground"> · {pesoLegible(a.peso)}</span>}
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label={`Descargar ${a.nombre}`}
                    onClick={() => void descargar(a)}
                  />
                }
              >
                <FileDownloadOutlinedIcon />
              </TooltipTrigger>
              <TooltipContent>Descargar</TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </section>
  )
}
