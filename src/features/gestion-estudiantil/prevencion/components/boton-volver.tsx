import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "@/components/ui/icons"

/** «Volver» de la bajada de los encabezados de detalle. */
export function BotonVolver({ onClick, texto = "Volver" }: { onClick: () => void; texto?: string }) {
  return (
    <Button variant="ghost" color="neutral" size="sm" className="-ml-3" onClick={onClick}>
      <ArrowLeftIcon data-icon="inline-start" />
      {texto}
    </Button>
  )
}
