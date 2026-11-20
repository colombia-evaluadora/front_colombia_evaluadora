import { useCallback, useEffect, useRef, useState } from "react"

import { FileTextIcon } from "@/components/ui/icons"
import { downloadReport, type ReportKey } from "@/lib/report-client"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"

interface Props {
  titulo: string
  /** Clave del reporte de `reporting-service` y filtros que identifican el documento (`BODY.FILTERS`). */
  clave: ReportKey
  filtros: Record<string, number>
  onClose: () => void
}

/**
 * Descarga el PDF de un documento de Gestión Estudiantil al abrirse y se cierra al terminar; si falla, deja el
 * error a la vista con «Reintentar». El permiso lo decide el backend (el botón que abre este diálogo siempre se ve).
 */
export function DescargaDocumentoPdf({ titulo, clave, filtros, onClose }: Props) {
  const [error, setError] = useState<Error | null>(null)
  const [pending, setPending] = useState(true)
  const iniciada = useRef(false)
  const filtrosRef = useRef(filtros)

  const descargar = useCallback(async () => {
    setPending(true)
    setError(null)
    const r = await downloadReport(clave, { format: "pdf", filters: filtrosRef.current })
    if (r.status === "error") {
      setError(new Error(r.message))
      setPending(false)
      return
    }
    onClose()
  }, [clave, onClose])

  useEffect(() => {
    if (iniciada.current) return
    iniciada.current = true
    void descargar()
  }, [descargar])

  return (
    <DialogoOperacionShell
      titulo={titulo}
      onClose={onClose}
      error={error}
      pending={pending}
      confirmar={{
        label: pending ? "Generando PDF…" : "Reintentar",
        icon: <FileTextIcon data-icon="inline-start" />,
        onClick: () => void descargar(),
      }}
    >
      <p className="text-sm text-muted-foreground">
        {error ? "No pudimos generar el documento." : "Estamos generando el PDF; la descarga empieza sola."}
      </p>
    </DialogoOperacionShell>
  )
}
