import { useState } from "react"

import { Button } from "@/components/ui/button"
import { EyeIcon, FileDownloadOutlinedIcon, PaperclipIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"

import type { ArchivoDTO } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"

/** Archivo como chip (nombre y tamaño) con ver y descargar por `pk_tarchivo` (token de vista de file-service). */
export function ChipArchivo({ archivo }: { archivo: ArchivoDTO }) {
  const [error, setError] = useState<string | null>(null)

  async function abrir(descargar: boolean) {
    setError(null)
    try {
      const { url } = await fetchArchivoViewUrl(archivo.pk_tarchivo)
      if (!descargar) {
        window.open(url, "_blank", "noopener")
        return
      }
      const a = document.createElement("a")
      a.href = url
      a.download = archivo.nombre
      a.click()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/40 py-0.5 pr-1 pl-3 text-sm">
        <PaperclipIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">{archivo.nombre}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          · {Math.max(1, Math.round(archivo.tamano_bytes / 1024))} KB
        </span>
        <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Ver ${archivo.nombre}`} onClick={() => abrir(false)}>
          <EyeIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-sm"
          aria-label={`Descargar ${archivo.nombre}`}
          onClick={() => abrir(true)}
        >
          <FileDownloadOutlinedIcon />
        </Button>
      </span>
      {error && (
        <span role="alert" className="text-xs text-red">
          {error}
        </span>
      )}
    </span>
  )
}
