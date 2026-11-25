import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { WarningIcon } from "@/components/ui/icons"

import { HUELLA_NO_COINCIDE, type Archivado } from "@/features/administration/conservacion-datos/api/types"

/**
 * Ventana de error de Descargar archivo (Sección 6.4): la huella SHA-256 del
 * archivo traído no es la guardada al archivar. El archivo no se entregó y el
 * intento ya quedó en la Bitácora.
 */
export function DialogHuellaNoCoincide({
  archivo,
  guardada,
  calculada,
  onClose,
}: {
  archivo: Archivado
  guardada: string
  calculada: string
  onClose: () => void
}) {
  const datos: [string, string][] = [
    ["Tipo de registro", archivo.tipoRegistro],
    ["Establecimiento", archivo.establecimiento],
    ["Año", String(archivo.anio ?? "")],
    ["Estudiante", [archivo.estudiante, archivo.documento].filter(Boolean).join(" · ")],
  ]
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WarningIcon className="size-5 shrink-0 text-red" aria-hidden />
            No se pudo verificar el archivo
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm font-semibold">{HUELLA_NO_COINCIDE}</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {datos.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="flex min-w-0 flex-col">
              <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
              <dd className="truncate">{valor}</dd>
            </div>
          ))}
        </dl>
        <dl className="flex flex-col gap-2 text-sm">
          {[
            ["Huella guardada", guardada],
            ["Huella calculada", calculada],
          ].map(([etiqueta, valor]) => (
            <div key={etiqueta} className="flex min-w-0 flex-col">
              <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
              <dd className="font-mono text-xs break-all">{valor}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Button size="sm" color="primary" onClick={onClose}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
