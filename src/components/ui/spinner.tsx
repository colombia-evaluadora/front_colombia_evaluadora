import { cn } from "@/lib/utils"
import { SpinnerIcon } from "@/components/ui/icons"
import { useOfflineStall } from "@/lib/offline/use-offline-stall"

/**
 * Sin conexión, a los 1,5 s el spinner se oculta: ninguna query ni mutación
 * queda esperando la red (`OfflineAwareQueryClient`, mutaciones con
 * `networkMode: "always"`), así que uno que sigue girando ya no espera nada
 * que vaya a llegar. Para un loader con texto usar `LoadingLabel`, que además
 * muestra el aviso. `persistOffline` lo conserva para trabajo local largo
 * (cifrar, exportar un paquete) que sí termina sin red.
 */
function Spinner({
  className,
  persistOffline = false,
  ...props
}: React.ComponentProps<"svg"> & { persistOffline?: boolean }) {
  const stalled = useOfflineStall(!persistOffline)
  if (stalled) return null
  return (
    <SpinnerIcon
      data-slot="spinner"
      role="status"
      aria-label="Cargando"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
