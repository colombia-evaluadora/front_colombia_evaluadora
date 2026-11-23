import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { PaperclipIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"

/** Nombre de una evidencia que la abre en otra pestaña con el token de vista de file-service. */
export function EnlaceEvidencia({ id, nombre }: { id: number; nombre: string }) {
  const { notify } = useNotify()
  const abrir = () =>
    fetchArchivoViewUrl(id)
      .then((t) => window.open(t.url, "_blank", "noopener"))
      .catch((e) => notify(getErrorMessage(e), { variant: "error" }))

  return (
    <Button type="button" variant="link" size="sm" className="h-auto justify-start p-0" onClick={abrir}>
      <PaperclipIcon data-icon="inline-start" />
      {nombre}
    </Button>
  )
}
