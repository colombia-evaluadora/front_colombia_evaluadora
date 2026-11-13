import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { PaperclipIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"

/** Abre el soporte firmado de la aceptación presencial (URL de vista de vida corta). */
export function SoporteAceptacion({ archivo }: { archivo: number }) {
  const { notify } = useNotify()
  const [abriendo, setAbriendo] = useState(false)
  async function abrir() {
    setAbriendo(true)
    try {
      const { url } = await fetchArchivoViewUrl(archivo)
      window.open(url, "_blank", "noopener")
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setAbriendo(false)
    }
  }
  return (
    <Button type="button" size="sm" variant="outline" disabled={abriendo} onClick={abrir}>
      <PaperclipIcon data-icon="inline-start" />
      Ver soporte firmado
    </Button>
  )
}
