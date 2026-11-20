import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { PencilIcon, WarningIcon } from "@/components/ui/icons"

const enumerar = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}` : items[0]

/** Aviso del detalle: qué falta y el atajo para completarlo, antes de que el modal falle. */
export function AvisoDatosPendientes({
  pendientes,
  puedeCompletar,
  onCompletar,
}: {
  pendientes: string[]
  puedeCompletar: boolean
  onCompletar: () => void
}) {
  if (pendientes.length === 0) return null
  return (
    <Alert variant="warning">
      <WarningIcon />
      <AlertTitle>Faltan datos del caso</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex-1">
          Complete {enumerar(pendientes)} del caso para poder registrar las acciones del protocolo.
        </span>
        {puedeCompletar && (
          <Button size="sm" variant="outline" color="neutral" className="shrink-0" onClick={onCompletar}>
            <PencilIcon data-icon="inline-start" />
            Completar datos
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
